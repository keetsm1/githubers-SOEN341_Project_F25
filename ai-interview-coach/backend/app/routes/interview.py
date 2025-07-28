from fastapi import APIRouter

router = APIRouter(prefix="/interview", tags=["Interview"])

@router.get("/test")
async def test_interview():
    return {"message": "Interview endpoint working"}