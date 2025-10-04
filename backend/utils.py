# utils.py
from database import UserPattern # Changed from .database to database
from schemas import UserCreate # Changed from .schemas to schemas
import bcrypt
from typing import List
import os
from dotenv import load_dotenv # This is typically not relative

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY", "your_32_char_secret_key_here")

if not GOOGLE_CLIENT_ID:
    raise ValueError("Missing GOOGLE_CLIENT_ID in environment")
if not GOOGLE_CLIENT_SECRET:
    raise ValueError("Missing GOOGLE_CLIENT_SECRET in environment")
if len(SECRET_KEY) < 32:
    raise ValueError("SECRET_KEY must be at least 32 characters long")

def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

def verify_password(password: bytes, hashed: str) -> bool:
    return bcrypt.checkpw(password, hashed.encode("utf-8"))

def summarize_user_patterns(patterns: List[UserPattern]) -> str:
    """
    Summarizes user feedback patterns into a natural-language context for the AI.
    """
    if not patterns:
        return "No prior feedback available."

    accepted = []
    rejected = []
    modified = []

    for p in patterns:
        data = p.pattern_data or {}
        if p.pattern_type == "accepted":
            accepted.append(data.get("suggestion_text", "")[:100])
        elif p.pattern_type == "rejected":
            reason = data.get("reject_reason", "No reason given")
            suggestion = data.get("suggestion_text", "")[:100]
            rejected.append(f"'{suggestion}' (Reason: {reason})")
        elif p.pattern_type == "modified":
            orig = data.get("original_text", "")[:80]
            mod = data.get("modified_text", "")[:80]
            modified.append(f"Original: '{orig}' → Modified: '{mod}'")

    summary = []
    if accepted:
        summary.append(f"User has accepted suggestions like: {'; '.join(accepted[:3])}.")
    if rejected:
        summary.append(f"User has rejected suggestions such as: {'; '.join(rejected[:3])}.")
    if modified:
        summary.append(f"User tends to modify suggestions, e.g.: {'; '.join(modified[:2])}.")

    return " ".join(summary) if summary else "User has provided feedback but no clear pattern yet."

def get_google_client_config():
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth", # Ensure NO spaces here
            "token_uri": "https://oauth2.googleapis.com/token",     # Ensure NO spaces here
            "redirect_uris": ["http://localhost:8000/auth/google/callback"] # Ensure NO spaces here
        }
    }