from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, func, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import List, Optional
import os
# from dotenv import load_dotenv  # Removed since not needed in Render

# Load environment variables (optional if not using .env locally)
# load_dotenv()  # Comment out or remove if not needed locally

# Use DATABASE_URL from environment, raise error if missing
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

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
    password = Column(String(200), nullable=True)  # Nullable for Google auth
    google_id = Column(String, unique=True, nullable=True)  # New field for Google ID
    is_google_user = Column(Boolean, default=False)  # New field to track Google users
    role = Column(String, default='developer')  # New field: 'admin' or 'developer'
    created_at = Column(DateTime, default=datetime.utcnow)  # New field for timestamp

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    repo_url = Column(String, nullable=False)
    repo_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RepoFile(Base):
    __tablename__ = "repo_files"
    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    session_id = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    severity = Column(String)  # New column for severity (High, Medium, Low)
    error_category = Column(String)  # New column for error category
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=True)  # New column to track file path for repo files

class AcceptedSuggestion(Base):
    __tablename__ = "accepted_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    suggestion_text = Column(Text)
    modified_text = Column(Text)
    error_category = Column(String)  # New column for error category
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=True)  # New column to track file path for repo files

class RejectedSuggestion(Base):
    __tablename__ = "rejected_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    suggestion_text = Column(Text)
    reject_reason = Column(String)
    error_category = Column(String)  # New column for error category
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=True)  # New column to track file path for repo files

class ModifiedSuggestion(Base):
    __tablename__ = "modified_suggestions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    suggestion_id = Column(Integer)
    original_text = Column(Text)
    modified_text = Column(Text)
    error_category = Column(String)  # New column for error category
    language = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=True)  # New column to track file path for repo files

class UserPattern(Base):
    __tablename__ = "user_patterns"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    session_id = Column(String, nullable=False)
    pattern_type = Column(String)  # 'accepted', 'rejected', 'modified'
    pattern_data = Column(JSONB)  # Store relevant data about the pattern
    created_at = Column(DateTime, default=datetime.utcnow)

class SuggestionLatency(Base):
    __tablename__ = "suggestion_latency"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False)
    latency_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()