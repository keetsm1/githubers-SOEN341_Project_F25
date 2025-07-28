from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/test")
async def test_auth():
    return {"message": "Auth endpoint working"}