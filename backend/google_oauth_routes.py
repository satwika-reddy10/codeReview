# google_oauth_routes.py (Updated with debugging)
from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
import secrets
from database import get_db, User
from utils import get_google_client_config
import logging
from google.auth.exceptions import GoogleAuthError
import os

# Google OAuth routes
def google_auth():
    flow = Flow.from_client_config(
        get_google_client_config(),
        scopes=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
    )
    flow.redirect_uri = "http://localhost:8000/auth/google/callback"

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=secrets.token_urlsafe(32)
    )

    return RedirectResponse(authorization_url)

async def google_auth_callback(request: Request, db: Session = Depends(get_db)):
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    print(f"DEBUG: Received code: {code[:10] if code else 'None'}...")
    print(f"DEBUG: Received state: {state[:10] if state else 'None'}...")

    if not code:
        print("DEBUG: Authorization code not provided in callback.")
        raise HTTPException(status_code=400, detail="Authorization code not provided")

    flow = Flow.from_client_config(
        get_google_client_config(),
        scopes=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
    )
    flow.redirect_uri = "http://localhost:8000/auth/google/callback"

    try:
        print("DEBUG: Fetching token from Google...")
        flow.fetch_token(code=code)
        credentials = flow.credentials
        print("DEBUG: Token fetched successfully.")

        print("DEBUG: Verifying ID token...")
        id_info = id_token.verify_oauth2_token(credentials.id_token, GoogleRequest(), os.getenv("GOOGLE_CLIENT_ID"))
        email = id_info.get('email')
        google_id = id_info.get('sub')

        print(f"DEBUG: Verified user - Email: {email}, Google ID: {google_id}...")
        existing_user = db.query(User).filter(User.google_id == google_id).first()
        if existing_user:
            print(f"DEBUG: Existing user found: {existing_user.username}")
            return RedirectResponse(url=f"http://localhost:3000/submit?login=success&username={existing_user.username}")

        print("DEBUG: No user found with Google ID. Querying by email...")
        existing_email_user = db.query(User).filter(User.username == email).first()
        if existing_email_user:
            print(f"DEBUG: User with email {email} exists but no Google ID. Updating...")
            existing_email_user.google_id = google_id
            existing_email_user.is_google_user = True
            db.commit()
            db.refresh(existing_email_user)
            print(f"DEBUG: User {existing_email_user.username} updated with Google ID.")
            return RedirectResponse(url=f"http://localhost:3000/submit?login=success&username={existing_email_user.username}")

        print("DEBUG: No existing user found. Creating new user...")
        new_user = User(
            username=email,
            google_id=google_id,
            is_google_user=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"DEBUG: New user {new_user.username} created.")

        return RedirectResponse(url=f"http://localhost:3000/submit?signup=success&username={new_user.username}")
    except GoogleAuthError as e:
        logging.error(f"Google Auth error: {str(e)}")
        print(f"DEBUG: GoogleAuthError occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Google authentication error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"General Google OAuth error: {str(e)}")
        print(f"DEBUG: General Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google OAuth error: {str(e)}")