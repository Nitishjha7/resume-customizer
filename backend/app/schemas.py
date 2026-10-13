from pydantic import BaseModel, Field


class ExperienceBullet(BaseModel):
    original: str = Field(..., description="The bullet as it appeared in the resume")
    rewritten: str = Field(..., description="The same point rephrased to fit the JD")


class CustomizeResult(BaseModel):
    """What the LLM gives us back, in a shape the frontend can render directly."""

    tailored_summary: str
    matched_skills: list[str]
    missing_keywords: list[str]
    experience: list[ExperienceBullet]
    match_score: int = Field(..., ge=0, le=100)


class CustomizeResponse(BaseModel):
    filename: str
    original_text: str
    result: CustomizeResult
