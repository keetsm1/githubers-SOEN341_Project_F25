from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.database import db
from app.routes import auth, resume, interview, db as db_router

app = FastAPI(title="AI Interview Coach API")

# Include all routers
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(interview.router)
app.include_router(db_router.router)

@app.get("/")
async def root():
    return {"message": "AI Interview Coach API"}

@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )