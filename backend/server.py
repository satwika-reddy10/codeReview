from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
import bcrypt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:mypassword@localhost:5432/postgres")

# Database Configuration
try:
    engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10, pool_timeout=30)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base = declarative_base()
except Exception as e:
    print(f"Failed to connect to database: {e}")
    raise

# Database Model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

# Create table if not exists
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Failed to create database tables: {e}")
    raise

# Pydantic Schemas
class UserCreate(BaseModel):
    username: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    username: EmailStr
    password: str = Field(..., min_length=8)

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

# Dependency: DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Routes
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
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")