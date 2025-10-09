# auth_routes.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, User
from schemas import UserCreate, UserLogin
from utils import hash_password, verify_password
import bcrypt

# ------------------ AUTH ROUTES ------------------
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = db.query(User).filter(User.username == user.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        hashed_pw = hash_password(user.password)
        new_user = User(
            username=user.username, 
            password=hashed_pw.decode("utf-8"),
            role=user.role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": "User created successfully", 
            "username": new_user.username,
            "role": new_user.role,
            "user_id": new_user.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(User.username == user.username).first()
        if not db_user:
            raise HTTPException(status_code=400, detail="Invalid username or password")
        if not db_user.password:  # Google user without password
            raise HTTPException(status_code=400, detail="Please login with Google")
        if not verify_password(user.password.encode("utf-8"), db_user.password.encode("utf-8")):
            raise HTTPException(status_code=400, detail="Invalid username or password")
        return {
            "message": "Login successful", 
            "username": db_user.username,
            "role": db_user.role,
            "user_id": db_user.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")