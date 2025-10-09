# admin_routes.py
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, User
from schemas import UserResponse
from typing import List

def get_all_users(db: Session = Depends(get_db)):
    try:
        users = db.query(User.id, User.username, User.role).all()
        if not users:
            print("No users found in database")
        return {"users": [{"id": user.id, "username": user.username, "role": user.role} for user in users]}
    except Exception as e:
        print(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"id": user.id, "username": user.username, "role": user.role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_developers(db: Session = Depends(get_db)):
    try:
        developers = db.query(User).filter(User.role == 'developer').all()
        return {
            "developers": [
                {
                    "id": dev.id, 
                    "username": dev.username, 
                    "created_at": dev.created_at.isoformat() if dev.created_at else None
                } for dev in developers
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")