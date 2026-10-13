from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import CustomizeResponse
from app.services.llm import LLMError, customize_resume
from app.services.resume_parser import ResumeParseError, extract_text

app = FastAPI(title="Resume Customizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

MIN_JD_LENGTH = 50


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/customize", response_model=CustomizeResponse)
async def customize(jd: str = Form(...), resume: UploadFile = File(...)):
    # 1) Validate the JD
    if not jd or len(jd.strip()) < MIN_JD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Job description looks too short — paste at least {MIN_JD_LENGTH} characters.",
        )

    # 2) Validate the file type before reading it
    ext = "." + resume.filename.rsplit(".", 1)[-1].lower() if "." in resume.filename else ""
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=422,
            detail="Unsupported file type. Please upload a PDF or DOCX.",
        )

    # 3) Read with a size guard (UploadFile is a stream, so we check after reading)
    data = await resume.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=422,
            detail=f"File is too large ({size_mb:.1f} MB). Max allowed is {settings.max_file_size_mb} MB.",
        )

    # 4) Parse the resume
    try:
        resume_text = extract_text(resume.filename, data)
    except ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # 5) Hand JD + resume to the LLM
    try:
        result = customize_resume(jd, resume_text)
    except LLMError as exc:
        # 502: the upstream model failed, not the client's fault
        raise HTTPException(status_code=502, detail=str(exc))

    return CustomizeResponse(
        filename=resume.filename,
        original_text=resume_text,
        result=result,
    )
