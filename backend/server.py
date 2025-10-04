from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import the app instance and all routes using absolute imports
from app import app
from auth_routes import signup, login
from suggestion_routes import generate_suggestions, accept_suggestion, reject_suggestion, modify_suggestion
from analytics_routes import get_suggestions_stats, get_detection_accuracy, get_latency_stats, get_learning_effectiveness, get_trends_stats
from google_oauth_routes import google_auth, google_auth_callback
from git_routes import get_repo_contents, review_repo_files

# Add the routes to the app
app.post("/signup")(signup)
app.post("/login")(login)
app.post("/generate-suggestions")(generate_suggestions)
app.post("/accept-suggestion")(accept_suggestion)
app.post("/reject-suggestion")(reject_suggestion)
app.post("/modify-suggestion")(modify_suggestion)
app.post("/analytics/suggestions")(get_suggestions_stats)
app.post("/analytics/detection-accuracy")(get_detection_accuracy)
app.post("/analytics/latency")(get_latency_stats)
app.post("/analytics/learning-effectiveness")(get_learning_effectiveness)
app.post("/analytics/trends")(get_trends_stats)
app.get("/auth/google")(google_auth)
app.get("/auth/google/callback")(google_auth_callback)
app.post("/git/repo-contents")(get_repo_contents)
app.post("/git/review")(review_repo_files)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))