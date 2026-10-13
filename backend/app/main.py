from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.schemas import CustomizeResponse, ExportRequest
from app.services.exporter import resume_to_docx
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
MAX_JD_LENGTH = 15000


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/customize", response_model=CustomizeResponse)
def customize(jd: str = Form(...), resume: UploadFile = File(...)):
    if len(jd.strip()) < MIN_JD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Job description looks too short. Paste at least {MIN_JD_LENGTH} characters.",
        )

    if len(jd) > MAX_JD_LENGTH:
        raise HTTPException(status_code=422, detail="Job description is too long.")

    filename = resume.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=422,
            detail="Unsupported file type. Please upload a PDF or DOCX.",
        )

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    data = resume.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=422,
            detail=f"File is too large. Max allowed is {settings.max_file_size_mb} MB.",
        )

    try:
        resume_text = extract_text(filename, data)
    except ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        result = customize_resume(jd, resume_text)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return CustomizeResponse(filename=filename, result=result)


@app.post("/api/export/docx")
def export_docx(body: ExportRequest):
    return Response(
        content=resume_to_docx(body.text),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="tailored_resume.docx"'},
    )
