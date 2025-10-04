from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from github import Github
from schemas import GitRepoRequest, GitRepoContentsResponse, GitFileReviewRequest, GitFileReviewResponse
from database import get_db, Repository, RepoFile
from suggestion_routes import process_code_for_review
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

async def get_repo_contents(payload: GitRepoRequest, db: Session = Depends(get_db)):
    try:
        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            raise HTTPException(status_code=500, detail="GitHub token not configured")
        
        g = Github(github_token)
        repo_url = payload.repo_url
        repo_name = repo_url.replace("https://github.com/", "").rstrip("/")
        try:
            repo = g.get_repo(repo_name)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid repository URL or access denied: {str(e)}")

        # Store repository in database
        repo_record = Repository(
            repo_url=repo_url,
            repo_name=repo_name,
            created_at=datetime.utcnow()
        )
        db.add(repo_record)
        db.commit()
        db.refresh(repo_record)

        # Get repository contents
        contents = repo.get_contents("")
        files = []
        language_map = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.c': 'c',
            '.cpp': 'cpp',
            '.java': 'java',
            '.html': 'html',
            '.css': 'css',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.cs': 'csharp'
        }

        def process_contents(contents, path=""):
            for content in contents:
                if content.type == "file":
                    ext = os.path.splitext(content.path)[1].lower()
                    if ext in language_map:
                        files.append({
                            "path": content.path,
                            "language": language_map[ext]
                        })
                elif content.type == "dir":
                    process_contents(repo.get_contents(content.path), content.path)

        process_contents(contents)
        db.commit()
        return GitRepoContentsResponse(files=files)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch repository contents: {str(e)}")

async def review_repo_files(payload: GitFileReviewRequest, db: Session = Depends(get_db)):
    try:
        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            raise HTTPException(status_code=500, detail="GitHub token not configured")
        
        g = Github(github_token)
        repo_url = payload.repo_url
        repo_name = repo_url.replace("https://github.com/", "").rstrip("/")
        try:
            repo = g.get_repo(repo_name)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid repository URL or access denied: {str(e)}")

        # Store or retrieve repository in database
        repo_record = db.query(Repository).filter(Repository.repo_url == repo_url).first()
        if not repo_record:
            repo_record = Repository(
                repo_url=repo_url,
                repo_name=repo_name,
                created_at=datetime.utcnow()
            )
            db.add(repo_record)
            db.commit()
            db.refresh(repo_record)

        reviews = []
        for file_path in payload.file_paths:
            try:
                file_content = repo.get_contents(file_path)
                content = file_content.decoded_content.decode('utf-8')
                ext = os.path.splitext(file_path)[1].lower()
                language_map = {
                    '.js': 'javascript',
                    '.jsx': 'javascript',
                    '.ts': 'typescript',
                    '.tsx': 'typescript',
                    '.py': 'python',
                    '.c': 'c',
                    '.cpp': 'cpp',
                    '.java': 'java',
                    '.html': 'html',
                    '.css': 'css',
                    '.php': 'php',
                    '.rb': 'ruby',
                    '.go': 'go',
                    '.rs': 'rust',
                    '.cs': 'csharp'
                }
                language = language_map.get(ext, 'javascript')

                # Store file content in database
                repo_file = RepoFile(
                    repo_id=repo_record.id,
                    session_id=payload.session_id,
                    file_path=file_path,
                    content=content,
                    language=language,
                    created_at=datetime.utcnow()
                )
                db.add(repo_file)

                # Process code for review
                suggestions = await process_code_for_review(
                    code=content,
                    language=language,
                    session_id=payload.session_id,
                    file_path=file_path,
                    db=db
                )

                reviews.append({
                    "file_path": file_path,
                    "language": language,
                    "suggestions": suggestions,
                    "original_code": content
                })

            except Exception as e:
                print(f"Error processing file {file_path}: {str(e)}")
                reviews.append({
                    "file_path": file_path,
                    "language": language,
                    "suggestions": [{
                        "id": 1,
                        "text": f"Error processing file: {str(e)}",
                        "severity": "Low",
                        "modifiedText": "",
                        "rejectReason": "",
                        "status": "error",
                        "file_path": file_path
                    }],
                    "original_code": ""
                })

        db.commit()
        return {"reviews": reviews}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to review repository files: {str(e)}")