# google_oauth_routes.py (Updated with debugging)
from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
import secrets
from database import get_db, User # Changed from .database to database
from utils import get_google_client_config # Changed from .utils to utils
import logging
from google.auth.exceptions import GoogleAuthError
import os # Add os import to get client ID

# Google OAuth routes
def google_auth():
    flow = Flow.from_client_config(
        get_google_client_config(),
        scopes=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"] # Removed spaces
    )
    flow.redirect_uri = "http://localhost:8000/auth/google/callback"

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=secrets.token_urlsafe(32)  # Add state parameter for security
    )

    return RedirectResponse(authorization_url)

async def google_auth_callback(request: Request, db: Session = Depends(get_db)): # Keep Depends here, no route decorator
    code = request.query_params.get("code")
    state = request.query_params.get("state")

    print(f"DEBUG: Received code: {code[:10] if code else 'None'}...") # Log first 10 chars of code
    print(f"DEBUG: Received state: {state[:10] if state else 'None'}...") # Log first 10 chars of state

    if not code:
        print("DEBUG: Authorization code not provided in callback.")
        raise HTTPException(status_code=400, detail="Authorization code not provided")

    flow = Flow.from_client_config(
        get_google_client_config(),
        scopes=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"] # Removed spaces
    )
    flow.redirect_uri = "http://localhost:8000/auth/google/callback"

    try:
        print("DEBUG: Fetching token from Google...")
        # Exchange the authorization code for an access token
        flow.fetch_token(code=code)
        credentials = flow.credentials
        print("DEBUG: Token fetched successfully.")

        print("DEBUG: Verifying ID token...")
        # Verify the ID token to get user info
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            GoogleRequest(),
            os.getenv("GOOGLE_CLIENT_ID"), # Use the environment variable directly here too
            clock_skew_in_seconds=10  # Add clock skew allowance
        )
        print("DEBUG: ID token verified successfully.")

        email = id_info.get('email')
        google_id = id_info.get('sub')  # Google's unique user ID
        print(f"DEBUG: Retrieved email: {email}, Google ID: {google_id[:10] if google_id else 'None'}...")

        # Check if user exists
        print("DEBUG: Querying database for existing user by Google ID...")
        existing_user = db.query(User).filter(User.google_id == google_id).first()
        if existing_user:
            print(f"DEBUG: Existing user found: {existing_user.username}")
            # User already exists, return success
            # Redirect to frontend with success message
            return RedirectResponse(url=f"http://localhost:3000/submit?login=success&username={existing_user.username}")

        print("DEBUG: No user found with Google ID. Querying by email...")
        # Check if email already exists (but without Google ID)
        existing_email_user = db.query(User).filter(User.username == email).first()
        if existing_email_user:
            print(f"DEBUG: User with email {email} exists but no Google ID. Updating...")
            # Update existing user with Google ID
            existing_email_user.google_id = google_id
            existing_email_user.is_google_user = True
            db.commit()
            db.refresh(existing_email_user) # Refresh to ensure changes are committed
            print(f"DEBUG: User {existing_email_user.username} updated with Google ID.")
            return RedirectResponse(url=f"http://localhost:3000/submit?login=success&username={existing_email_user.username}")

        print("DEBUG: No existing user found. Creating new user...")
        # Create new user
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
        # Re-raise HTTPExceptions as they are (e.g., 400)
        raise
    except Exception as e:
        logging.error(f"General Google OAuth error: {str(e)}")
        print(f"DEBUG: General Exception occurred: {str(e)}")
        # Print the full traceback for debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google OAuth error: {str(e)}")