from pydantic import BaseModel, Field


class ExperienceBullet(BaseModel):
    original: str
    rewritten: str


class CustomizeResult(BaseModel):
    tailored_summary: str
    tailored_resume: str
    matched_skills: list[str]
    missing_keywords: list[str]
    experience: list[ExperienceBullet]
    match_score: int = Field(ge=0, le=100)


class ExportRequest(BaseModel):
    text: str = Field(min_length=1)


class CustomizeResponse(BaseModel):
    filename: str
    result: CustomizeResult
