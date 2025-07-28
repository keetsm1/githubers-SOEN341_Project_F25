from fastapi import FastAPI
from app.config import settings

app = FastAPI(title="AI Interview Coach API")

# Import routers after app creation to avoid circular imports
from app.routes import auth, resume, interview

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(interview.router)

@app.get("/")
def health_check():
    return {"status": "healthy"}