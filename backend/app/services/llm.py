import json

from google import genai
from google.genai import types

from app.config import settings
from app.schemas import CustomizeResult

# The quality of the output is basically all in this prompt, so it's worth
# being explicit: tell the model exactly what to return and what NOT to do
# (the most common failure is it inventing experience the candidate doesn't have).
SYSTEM_PROMPT = """You are an expert technical resume editor and recruiter.

You will be given a Job Description (JD) and the plain text of a candidate's resume.
Your job is to tailor the resume to the JD WITHOUT inventing anything.

Hard rules:
- Never add skills, tools, companies or achievements the resume does not already support.
- You may rephrase, reorder and re-emphasise what is already there to match the JD's wording.
- Keep every rewritten line truthful and in a natural, human first-person-neutral resume tone.
- "missing_keywords" are important terms from the JD that are genuinely absent from the
  resume. List them as suggestions for the candidate to consider adding — do not silently
  insert them into the rewritten content.

Return ONLY a JSON object with exactly this shape:
{
  "tailored_summary": "2-3 line professional summary rewritten to align with the JD",
  "matched_skills": ["skills already in the resume that match the JD"],
  "missing_keywords": ["important JD keywords not found in the resume"],
  "experience": [
    {"original": "an experience bullet from the resume", "rewritten": "the same point, re-angled toward the JD"}
  ],
  "match_score": <integer 0-100 estimating how well the ORIGINAL resume fits the JD>
}
"""


def _build_user_prompt(jd: str, resume_text: str) -> str:
    return (
        f"=== JOB DESCRIPTION ===\n{jd.strip()}\n\n"
        f"=== CANDIDATE RESUME ===\n{resume_text.strip()}\n"
    )


class LLMError(Exception):
    """Wraps any failure talking to the LLM so the route can return a clean message."""


def customize_resume(jd: str, resume_text: str) -> CustomizeResult:
    if not settings.gemini_api_key:
        raise LLMError("GEMINI_API_KEY is not set on the server.")

    client = genai.Client(api_key=settings.gemini_api_key)

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=_build_user_prompt(jd, resume_text),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",  # ask for JSON directly
                temperature=0.4,
            ),
        )
        raw = response.text
    except Exception as exc:  # network / quota / safety blocks all land here
        raise LLMError(f"LLM request failed: {exc}") from exc

    try:
        data = json.loads(raw)
        return CustomizeResult(**data)
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        # The model returned something we couldn't trust as valid JSON.
        raise LLMError("The model returned an unexpected format. Please try again.") from exc
