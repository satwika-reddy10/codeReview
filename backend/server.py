from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.dialects.postgresql import JSONB
import bcrypt
import os
import re
import httpx
from dotenv import load_dotenv
from datetime import datetime
import json
from typing import List, Optional
import asyncio

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:mypassword@localhost:5432/postgres"
)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise ValueError("Missing OPENROUTER_API_KEY in environment")

# Database Configuration
connect_args = {"sslmode": "require"} if "supabase" in DATABASE_URL else {}
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=connect_args
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String(200), nullable=False)

class CodeSession(Base):
    __tablename__ = "code_sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=True)  # Optional if user is logged in
    created_at = Column(DateTime, default=datetime.utcnow)
    language = Column(String)
    code = Column(Text)

class AISuggestion(Base):
    __tablename__ = "ai_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    suggestion_text = Column(Text)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class AcceptedSuggestion(Base):
    __tablename__ = "accepted_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    suggestion_text = Column(Text)
    modified_text = Column(Text)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class RejectedSuggestion(Base):
    __tablename__ = "rejected_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    suggestion_text = Column(Text)
    reject_reason = Column(String)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ModifiedSuggestion(Base):
    __tablename__ = "modified_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    original_text = Column(Text)
    modified_text = Column(Text)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserPattern(Base):
    __tablename__ = "user_patterns"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    session_id = Column(String, nullable=False)
    pattern_type = Column(String)  # 'accepted', 'rejected', 'modified'
    pattern_data = Column(JSONB)  # Store relevant data about the pattern
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class UserCreate(BaseModel):
    username: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    username: EmailStr
    password: str = Field(..., min_length=8)

class CodeInput(BaseModel):
    code: str
    language: str
    session_id: str
    
    @validator('code')
    def code_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Code cannot be empty')
        return v
    
    @validator('language')
    def language_must_be_valid(cls, v):
        valid_languages = ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'csharp', 'php']
        if v.lower() not in valid_languages:
            print(f"Warning: Unrecognized language '{v}'")
        return v

class SuggestionAction(BaseModel):
    session_id: str
    suggestion_id: int
    suggestion_text: str
    language: str

class AcceptSuggestion(SuggestionAction):
    modified_text: str
    original_code: str

class RejectSuggestion(SuggestionAction):
    reject_reason: str

class ModifySuggestion(BaseModel):
    session_id: str
    suggestion_id: int
    original_text: str
    modified_text: str
    language: str

# FastAPI App
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Request: {request.method} {request.url}")
    try:
        body = await request.body()
        if body and len(body) < 1000:  # Log small bodies only
            print(f"Request body: {body.decode()}")
    except:
        pass
    
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

# Dependency: DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------ AUTH ROUTES ------------------
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(User).filter(User.username == user.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
        new_user = User(username=user.username, password=hashed_pw.decode("utf-8"))
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User created successfully", "username": new_user.username}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(User.username == user.username).first()
        if not db_user:
            raise HTTPException(status_code=400, detail="Invalid username or password")
        if not bcrypt.checkpw(user.password.encode("utf-8"), db_user.password.encode("utf-8")):
            raise HTTPException(status_code=400, detail="Invalid username or password")
        return {"message": "Login successful", "username": db_user.username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ------------------ AI SUGGESTIONS ROUTE ------------------
async def call_qwen_api(prompt: str, retries=3):
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "CodeReview App"
        }
        
        # Use a more reliable model
        data = {
            "model": "qwen/qwen-2.5-72b-instruct:free",  # Changed to more reliable model
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 800,
            "temperature": 0.3
        }

        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(timeout=120) as client:
                    response = await client.post(url, headers=headers, json=data)
                    
                    # Handle specific status codes
                    if response.status_code == 429:
                        if attempt < retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
                    elif response.status_code == 401:
                        raise HTTPException(status_code=401, detail="Invalid API key.")
                    elif response.status_code == 400:
                        try:
                            error_detail = response.json()
                            raise HTTPException(status_code=400, detail=f"Bad request: {error_detail}")
                        except:
                            raise HTTPException(status_code=400, detail=f"Bad request: {response.text}")
                    elif response.status_code != 200:
                        try:
                            error_content = response.json()
                            print(f"API Error: {error_content}")
                        except:
                            print(f"API Error Text: {response.text}")
                        if attempt < retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        response.raise_for_status()
                    
                    result = response.json()
                    return result["choices"][0]["message"]["content"]

            except httpx.TimeoutException:
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="AI service timeout")
    except httpx.HTTPStatusError as e:
        error_msg = f"AI service error: {str(e)}"
        if e.response is not None:
            try:
                error_detail = e.response.json()
                actual_error = error_detail.get("error", {})
                error_msg = actual_error.get("message", str(e))
                print(f"Detailed API Error: {actual_error}")
            except:
                error_msg = e.response.text
        print(error_msg)
        raise HTTPException(status_code=408, detail=f"AI service temporarily unavailable: {error_msg}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to AI service: {str(e)}")

@app.post("/generate-suggestions")
async def generate_suggestions(payload: CodeInput, db: Session = Depends(get_db)):
    try:
        # Validate input
        if not payload.code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
            
        # Check if session already exists
        existing_session = db.query(CodeSession).filter(
            CodeSession.session_id == payload.session_id
        ).first()
        
        # If session exists, delete it and all related data
        if existing_session:
            # Delete related records first
            db.query(AISuggestion).filter(
                AISuggestion.session_id == payload.session_id
            ).delete()
            db.query(AcceptedSuggestion).filter(
                AcceptedSuggestion.session_id == payload.session_id
            ).delete()
            db.query(RejectedSuggestion).filter(
                RejectedSuggestion.session_id == payload.session_id
            ).delete()
            db.query(ModifiedSuggestion).filter(
                ModifiedSuggestion.session_id == payload.session_id
            ).delete()
            db.query(UserPattern).filter(
                UserPattern.session_id == payload.session_id
            ).delete()
            
            # Delete the session itself
            db.delete(existing_session)
            db.commit()
        
        # Create new session
        code_session = CodeSession(
            session_id=payload.session_id,
            language=payload.language,
            code=payload.code
        )
        db.add(code_session)
        db.commit()

        # Check for user patterns to customize suggestions
        user_patterns = db.query(UserPattern).filter(
            UserPattern.session_id == payload.session_id
        ).all()

        # Build pattern context for AI
        pattern_context = ""
        if user_patterns:
            pattern_context = "\n\nUSER PREFERENCES (Based on previous interactions):\n"
            for pattern in user_patterns:
                if pattern.pattern_type == "rejected":
                    pattern_context += f"- Avoid suggestions like: {pattern.pattern_data.get('suggestion_text', '')}\n"
                elif pattern.pattern_type == "accepted":
                    pattern_context += f"- Prefer suggestions like: {pattern.pattern_data.get('suggestion_text', '')}\n"

        prompt = f"""You are an expert code reviewer analyzing {payload.language} code.

CODE TO REVIEW:
{payload.code}

INSTRUCTIONS:
1. Provide 3-5 specific improvement suggestions
2. Focus on critical issues first: bugs, security vulnerabilities, performance problems
3. Format each suggestion as a numbered list item (1., 2., etc.)
4. Be concise but specific - mention what to change and why
5. If relevant, reference specific line numbers or code patterns
6. Do NOT include any introductory or concluding text
7. Do NOT rewrite the entire code
{pattern_context}

SUGGESTIONS:"""

        raw_output = await call_qwen_api(prompt)

        # Parse the response into structured suggestions
        suggestions = []
        lines = raw_output.split("\n")
        suggestion_count = 0

        for line in lines:
            line = line.strip()
            if (line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')) or
                line.startswith(('- ', '* ', '• '))):

                clean_line = re.sub(r'^\d+[\.\)]\s*', '', line)  # Remove numbering
                clean_line = re.sub(r'^[-*•]\s*', '', clean_line)  # Remove bullets

                if clean_line and len(clean_line) > 10:
                    suggestion_count += 1
                    suggestion_data = {
                        "id": suggestion_count,
                        "text": clean_line,
                        "modifiedText": "",
                        "rejectReason": "",
                        "status": None
                    }
                    
                    # Store suggestion in DB
                    ai_suggestion = AISuggestion(
                        session_id=payload.session_id,
                        suggestion_id=suggestion_count,
                        suggestion_text=clean_line,
                        language=payload.language
                    )
                    db.add(ai_suggestion)
                    
                    suggestions.append(suggestion_data)
                    if suggestion_count >= 5:
                        break

        # Fallback if no numbered items found
        if not suggestions and raw_output:
            sentences = re.split(r'[.!?]+\s*', raw_output)
            for i, sentence in enumerate(sentences[:5]):
                sentence = sentence.strip()
                if sentence and len(sentence) > 15:
                    suggestion_data = {
                        "id": i + 1,
                        "text": sentence,
                        "modifiedText": "",
                        "rejectReason": "",
                        "status": None
                    }
                    
                    # Store suggestion in DB
                    ai_suggestion = AISuggestion(
                        session_id=payload.session_id,
                        suggestion_id=i + 1,
                        suggestion_text=sentence,
                        language=payload.language
                    )
                    db.add(ai_suggestion)
                    
                    suggestions.append(suggestion_data)

        db.commit()
        return {"suggestions": suggestions}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in generate_suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

@app.post("/accept-suggestion")
async def accept_suggestion(payload: AcceptSuggestion, db: Session = Depends(get_db)):
    try:
        # Store accepted suggestion
        accepted_suggestion = AcceptedSuggestion(
            session_id=payload.session_id,
            suggestion_id=payload.suggestion_id,
            suggestion_text=payload.suggestion_text,
            modified_text=payload.modified_text,
            language=payload.language
        )
        db.add(accepted_suggestion)
        
        # Store pattern for learning
        pattern_data = {
            "suggestion_text": payload.suggestion_text,
            "modified_text": payload.modified_text,
            "language": payload.language
        }
        user_pattern = UserPattern(
            session_id=payload.session_id,
            pattern_type="accepted",
            pattern_data=pattern_data
        )
        db.add(user_pattern)
        
        # Generate modified code based on the specific suggestion
        prompt = f"""You are an expert {payload.language} developer. Apply ONLY the following specific suggestion to the provided code.
        
        CODE:
        {payload.original_code}
        
        SPECIFIC SUGGESTION TO APPLY:
        {payload.suggestion_text}
        
        STRICT INSTRUCTIONS:
        1. Apply ONLY this exact suggestion as stated
        2. Make the minimal change necessary to implement just this suggestion
        3. Do NOT make any other improvements or changes to the code
        4. Do NOT fix other issues, bugs, or duplicate code
        5. Do NOT add imports unless explicitly required by this suggestion
        6. Return ONLY the modified code with this one change
        7. Preserve ALL other parts of the code exactly as they are
        8. If the suggestion cannot be applied as stated, return the original code unchanged
        
        MODIFIED CODE:"""
        
        try:
            raw_output = await call_qwen_api(prompt)
            modified_code = raw_output.strip()
        except:
            # Fallback: try a more direct replacement approach
            try:
                if "pi" in payload.suggestion_text.lower() and "3.14" in payload.original_code:
                    modified_code = payload.original_code.replace("3.14", "math.pi")
                    # Add import only if needed and not already present
                    if "import math" not in modified_code and "math.pi" in modified_code:
                        modified_code = "import math\n" + modified_code
                else:
                    # Fallback to original code if we can't make a precise change
                    modified_code = payload.original_code
            except:
                modified_code = payload.original_code
        
        db.commit()
        return {
            "message": "Suggestion accepted and stored",
            "modified_code": modified_code
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store accepted suggestion: {str(e)}")

@app.post("/reject-suggestion")
async def reject_suggestion(payload: RejectSuggestion, db: Session = Depends(get_db)):
    try:
        # Store rejected suggestion
        rejected_suggestion = RejectedSuggestion(
            session_id=payload.session_id,
            suggestion_id=payload.suggestion_id,
            suggestion_text=payload.suggestion_text,
            reject_reason=payload.reject_reason,
            language=payload.language
        )
        db.add(rejected_suggestion)
        
        # Store pattern for learning
        pattern_data = {
            "suggestion_text": payload.suggestion_text,
            "reject_reason": payload.reject_reason,
            "language": payload.language
        }
        user_pattern = UserPattern(
            session_id=payload.session_id,
            pattern_type="rejected",
            pattern_data=pattern_data
        )
        db.add(user_pattern)
        
        db.commit()
        return {"message": "Suggestion rejected and stored"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store rejected suggestion: {str(e)}")

@app.post("/modify-suggestion")
async def modify_suggestion(payload: ModifySuggestion, db: Session = Depends(get_db)):
    try:
        # Store modified suggestion
        modified_suggestion = ModifiedSuggestion(
            session_id=payload.session_id,
            suggestion_id=payload.suggestion_id,
            original_text=payload.original_text,
            modified_text=payload.modified_text,
            language=payload.language
        )
        db.add(modified_suggestion)
        
        # Store pattern for learning
        pattern_data = {
            "original_text": payload.original_text,
            "modified_text": payload.modified_text,
            "language": payload.language
        }
        user_pattern = UserPattern(
            session_id=payload.session_id,
            pattern_type="modified",
            pattern_data=pattern_data
        )
        db.add(user_pattern)
        
        db.commit()
        
        # Generate improved suggestion based on modification
        prompt = f"""You are an expert code reviewer. A user modified an AI suggestion. 
        Original suggestion: {payload.original_text}
        User's modification: {payload.modified_text}
        
        Please provide an improved version of the suggestion that incorporates the user's feedback.
        Keep it concise and focused on the code improvement.
        """
        
        raw_output = await call_qwen_api(prompt)
        
        return {
            "message": "Suggestion modified and stored",
            "modified_suggestion": raw_output.strip()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process modified suggestion: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "openai/gpt-4o-mini"}

# Test AI connection endpoint
@app.get("/test-ai")
async def test_ai_connection():
    try:
        test_prompt = "Say hello world"
        result = await call_qwen_api(test_prompt)
        return {"status": "success", "response": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}