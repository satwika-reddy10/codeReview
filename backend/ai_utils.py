# ai_utils.py
import google.generativeai as genai
from dotenv import load_dotenv # This is typically not relative
import os
import asyncio
import time
from fastapi import HTTPException

# Load environment variables from .env
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure Gemini with the API key
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    raise ValueError("Missing GEMINI_API_KEY in environment")

async def call_gemini_api(prompt: str, retries=3):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")  # or "gemini-2.5-pro"
        
        for attempt in range(retries):
            try:
                start_time = time.time()
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config={
                        "max_output_tokens": 8000,
                        "temperature": 0.7,
                        "top_p": 0.95,
                    }
                )
                latency_ms = (time.time() - start_time) * 1000  # Convert to milliseconds
                if response.candidates and response.candidates[0].content.parts:
                    return response.text, latency_ms
                else:
                    reason = getattr(response.candidates[0] if response.candidates else None, 'finish_reason', "NO_CANDIDATES")
                    if reason == 2:  # MAX_TOKENS
                        print(f"Attempt {attempt + 1}: Hit MAX_TOKENS. Retrying...")
                        if attempt < retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                    else:
                        raise Exception(f"Empty response. Finish reason: {reason}")
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if attempt == retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")