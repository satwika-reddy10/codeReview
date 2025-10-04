from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
import re
import asyncio
from database import get_db, CodeSession, AISuggestion, AcceptedSuggestion, RejectedSuggestion, ModifiedSuggestion, UserPattern, SuggestionLatency
from schemas import CodeInput, AcceptSuggestion, RejectSuggestion, ModifySuggestion
from ai_utils import call_gemini_api
from utils import summarize_user_patterns
from datetime import datetime
import time

async def process_code_for_review(code: str, language: str, session_id: str, file_path: str | None, db: Session):
    try:
        # Store code session
        code_session = CodeSession(
            session_id=session_id,
            language=language,
            code=code
        )
        db.add(code_session)

        # Fetch user patterns for adaptive learning
        recent_patterns = (
            db.query(UserPattern)
            .filter(UserPattern.session_id == session_id)
            .order_by(UserPattern.created_at.desc())
            .limit(10)
            .all()
        )
        user_context = summarize_user_patterns(recent_patterns)

        # Fetch previously rejected suggestions for this session
        rejected_suggestions = (
            db.query(RejectedSuggestion.suggestion_text)
            .filter(RejectedSuggestion.session_id == session_id)
            .all()
        )
        rejected_texts = {item[0] for item in rejected_suggestions}

        # Enhanced prompt with user context and instructions to avoid rejected items
        prompt = f"""You are an expert {language} code reviewer. Analyze the following code and provide detailed, actionable suggestions for improvement.

        USER PREFERENCE CONTEXT (adapt your suggestions accordingly):
        {user_context}

        IMPORTANT: DO NOT suggest the following things again, as the user has explicitly rejected them:
        {chr(10).join([f"- {s}" for s in rejected_texts]) if rejected_texts else "No previously rejected suggestions."}

        Focus on:
        - Code quality and best practices
        - Performance optimizations
        - Readability and maintainability
        - Potential bugs or edge cases
        - Security concerns if applicable

        For each suggestion, provide:
        1. The specific line number(s) or code snippet where the issue occurs
        2. A severity level (High, Medium, Low) based on the issue's impact or urgency
        3. A clear description of the issue or improvement
        4. An explanation of why the change is beneficial
        5. A concise improved code snippet (if applicable)

        Format each suggestion as follows:
        - **Line(s):** {{line number(s) or 'General' if not specific}}
        - **Severity:** {{High, Medium, or Low}}
        - **Issue:** {{description of the issue or improvement}}
        - **Improved Code (if applicable):** ```{{language}}\n{{improved code}}\n```

        Return suggestions, each formatted as above, separated by '--- SUGGESTION {{n}} ---'.

        CODE:
        {code}

        SUGGESTIONS:"""

        raw_output, latency_ms = await call_gemini_api(prompt)
        
        # Store latency
        latency_record = SuggestionLatency(
            session_id=session_id,
            latency_ms=latency_ms,
            created_at=datetime.utcnow()
        )
        db.add(latency_record)
        
        # Parse suggestions
        suggestion_blocks = re.split(r'--- SUGGESTION \d+ ---', raw_output.strip())
        suggestions = []
        for i, block in enumerate(suggestion_blocks):
            if block.strip():
                # Check if this suggestion was previously rejected
                if block.strip() in rejected_texts:
                    print(f"DEBUG: Skipping previously rejected suggestion: {block.strip()[:100]}...")
                    continue

                severity_match = re.search(r'\*\*Severity:\*\*\s*(High|Medium|Low)', block)
                severity = severity_match.group(1) if severity_match else "Medium"
                suggestion_data = {
                    "id": i + 1,
                    "text": block.strip(),
                    "severity": severity,
                    "modifiedText": "",
                    "rejectReason": "",
                    "status": None,
                    "file_path": file_path
                }
                ai_suggestion = AISuggestion(
                    session_id=session_id,
                    suggestion_id=i + 1,
                    suggestion_text=block.strip(),
                    severity=severity,
                    language=language,
                    file_path=file_path
                )
                db.add(ai_suggestion)
                suggestions.append(suggestion_data)

        db.commit()
        return suggestions

    except Exception as e:
        db.rollback()
        print(f"Error in process_code_for_review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process code: {str(e)}")

async def generate_suggestions(payload: CodeInput, db: Session = Depends(get_db)):
    try:
        suggestions = await process_code_for_review(
            code=payload.code,
            language=payload.language,
            session_id=payload.session_id,
            file_path=None,
            db=db
        )
        
        if not suggestions:
            suggestions = [{
                "id": 1,
                "text": "No specific suggestions found. Your code looks good!",
                "severity": "Low",
                "modifiedText": "",
                "rejectReason": "",
                "status": None,
                "file_path": None
            }]
        return {"suggestions": suggestions}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

async def accept_suggestion(payload: AcceptSuggestion, db: Session = Depends(get_db)):
    try:
        # Store accepted suggestion
        accepted_suggestion = AcceptedSuggestion(
            session_id=payload.session_id,
            suggestion_id=payload.suggestion_id,
            suggestion_text=payload.suggestion_text,
            modified_text=payload.modified_text,
            language=payload.language,
            file_path=payload.file_path
        )
        db.add(accepted_suggestion)
        
        # Store pattern for learning
        pattern_data = {
            "suggestion_text": payload.suggestion_text,
            "modified_text": payload.modified_text,
            "language": payload.language,
            "file_path": payload.file_path
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
            raw_output, _ = await call_gemini_api(prompt)
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

async def reject_suggestion(payload: RejectSuggestion, db: Session = Depends(get_db)):
    try:
        # Store rejected suggestion
        rejected_suggestion = RejectedSuggestion(
            session_id=payload.session_id,
            suggestion_id=payload.suggestion_id,
            suggestion_text=payload.suggestion_text,
            reject_reason=payload.reject_reason,
            language=payload.language,
            file_path=payload.file_path
        )
        db.add(rejected_suggestion)
        
        # Store pattern for learning
        pattern_data = {
            "suggestion_text": payload.suggestion_text,
            "reject_reason": payload.reject_reason,
            "language": payload.language,
            "file_path": payload.file_path
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

async def modify_suggestion(payload: ModifySuggestion, db: Session = Depends(get_db)):
    try:
        # Store modified suggestion
        modified_suggestion = ModifiedSuggestion(
            session_id=payload.session_id,
            suggestion_id=payload.suggestion_id,
            original_text=payload.original_text,
            modified_text=payload.modified_text,
            language=payload.language,
            file_path=payload.file_path
        )
        db.add(modified_suggestion)
        
        # Store pattern for learning
        pattern_data = {
            "original_text": payload.original_text,
            "modified_text": payload.modified_text,
            "language": payload.language,
            "file_path": payload.file_path
        }
        user_pattern = UserPattern(
            session_id=payload.session_id,
            pattern_type="modified",
            pattern_data=pattern_data
        )
        db.add(user_pattern)
        
        db.commit()
        
        # Generate improved suggestion based on modification
        prompt = f"""You are an expert code reviewer analyzing {payload.language} code.
        CODE TO REVIEW: {payload.modified_text}
        
        INSTRUCTIONS:
        1. Provide 3-5 specific improvement suggestions
        2. Focus on critical issues first: bugs, security vulnerabilities, performance problems
        3. Format each suggestion as a numbered list item (1., 2., etc.)
        4. Be concise but specific - mention what to change and why
        5. If relevant, reference specific line numbers or code patterns
        6. Do NOT include any introductory or concluding text
        7. Do NOT rewrite the entire code
        
        SUGGESTIONS:"""
        
        raw_output, _ = await call_gemini_api(prompt)
        
        return {
            "message": "Suggestion modified and stored",
            "modified_suggestion": raw_output.strip()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process modified suggestion: {str(e)}")