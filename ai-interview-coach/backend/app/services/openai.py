import openai
from app.config import settings
from app.utils.file_utils import extract_text_from_pdf

openai.api_key = settings.openai_key

RESUME_PROMPT = """Extract the following from this resume in JSON format:
- Skills (technical and soft skills)
- Work experience (company, role, duration)
- Education
- Projects
Return only valid JSON, no commentary."""

async def parse_resume(file_path: str):
    text = extract_text_from_pdf(file_path)
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[{"role": "user", "content": f"{RESUME_PROMPT}\n\n{text}"}],
        temperature=0.1
    )
    return response.choices[0].message.content