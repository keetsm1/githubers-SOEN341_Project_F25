from fastapi import APIRouter, UploadFile

router = APIRouter(prefix="/resume", tags=["Resume"])

@router.post("/upload")
async def upload_resume(file: UploadFile):
    return {"filename": file.filename}