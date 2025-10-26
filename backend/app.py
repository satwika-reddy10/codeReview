# app.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db # Changed from .database to database
from fastapi.middleware.cors import CORSMiddleware
import logging

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or your frontend URL after deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FastAPI App
app = FastAPI()

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

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "openai/gpt-4o-mini"}

# Test AI connection endpoint
@app.get("/test-ai")
async def test_ai_connection():
    from ai_utils import call_gemini_api # Changed from .ai_utils to ai_utils
    try:
        test_prompt = "Say hello world"
        result, _ = await call_gemini_api(test_prompt)
        return {"status": "success", "response": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}