from fastapi import APIRouter
from app.database import db

router = APIRouter(prefix="/db", tags=["Database"])

@router.get("/ping")
async def ping_db():
    try:
        await db.command("ping")
        return {"status": "Database connected"}
    except Exception as e:
        return {"error": str(e)}