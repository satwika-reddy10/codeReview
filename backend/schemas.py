from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class CodeInput(BaseModel):
    code: str
    language: str
    session_id: str
    
    @validator('code')
    def code_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Code cannot be empty')
        return v
    
    @validator('language')
    def language_must_be_valid(cls, v):
        valid_languages = ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'csharp', 'php']
        if v.lower() not in valid_languages:
            print(f"Warning: Unrecognized language '{v}'")
        return v

class GitRepoRequest(BaseModel):
    repo_url: str

    @validator('repo_url')
    def validate_repo_url(cls, v):
        if not v.startswith('https://github.com/'):
            raise ValueError('Repository URL must be a valid GitHub URL starting with https://github.com/')
        return v

class GitFile(BaseModel):
    path: str
    language: str

class GitRepoContentsResponse(BaseModel):
    files: List[GitFile]

class GitFileReviewRequest(BaseModel):
    repo_url: str
    file_paths: List[str]
    session_id: str

    @validator('repo_url')
    def validate_repo_url(cls, v):
        if not v.startswith('https://github.com/'):
            raise ValueError('Repository URL must be a valid GitHub URL starting with https://github.com/')
        return v

    @validator('file_paths')
    def validate_file_paths(cls, v):
        if not v:
            raise ValueError('At least one file path must be provided')
        return v

class GitFileReviewResponse(BaseModel):
    file_path: str
    language: str
    suggestions: List[dict]

class SuggestionAction(BaseModel):
    session_id: str
    suggestion_id: int
    suggestion_text: str
    language: str
    file_path: Optional[str] = None  # New field for file path

class AcceptSuggestion(SuggestionAction):
    modified_text: str
    original_code: str

class RejectSuggestion(SuggestionAction):
    reject_reason: str

class ModifySuggestion(BaseModel):
    session_id: str
    suggestion_id: int
    original_text: str
    modified_text: str
    language: str
    file_path: Optional[str] = None  # New field for file path

class AnalyticsFilter(BaseModel):
    user_id: Optional[int] = None
    language: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None