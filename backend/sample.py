import os
from dotenv import load_dotenv
import google.generativeai as genai

# load GEMINI_API_KEY from your .env file
load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# choose one of the models from your available list
model = genai.GenerativeModel("models/gemini-2.5-flash")

resp = model.generate_content("Write a friendly 3-line intro about yourself.")
print(resp.text)
