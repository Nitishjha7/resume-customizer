import json
import logging

from google import genai
from google.genai import types

from app.config import settings
from app.schemas import CustomizeResult

# Most of the output quality comes from this prompt. The failure to guard against
# is the model inventing experience the candidate doesn't have, so that rule is first.
SYSTEM_PROMPT = """You are an expert technical resume editor and recruiter.

You will be given a Job Description (JD) and the plain text of a candidate's resume.
Your job is to tailor the resume to the JD WITHOUT inventing anything.

Hard rules:
- Never add skills, tools, companies or achievements the resume does not already support.
- You may rephrase, reorder and re-emphasise what is already there to match the JD's wording.
- Keep every rewritten line truthful, in a plain resume tone (no first person, no buzzword stuffing).
- Preserve names, dates, employers, job titles, degrees and numbers exactly as written.
- "missing_keywords" are important terms from the JD that are genuinely absent from the
  resume. List them as suggestions for the candidate to consider adding — do not silently
  insert them into the rewritten content.

Return ONLY a JSON object with exactly this shape:
{
  "tailored_summary": "2-3 line professional summary rewritten to align with the JD",
  "tailored_resume": "the COMPLETE resume as plain text, ready to use: contact details first, then sections with UPPERCASE headings (SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION, ...), bullets starting with '- '. Use the tailored summary, put JD-relevant skills first and rephrase experience bullets toward the JD. Keep every section the original had.",
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


logger = logging.getLogger(__name__)


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
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        raw = response.text
    except Exception as exc:  # network, quota and safety blocks all end up here
        logger.exception("Gemini request failed")
        raise LLMError("The AI service is unavailable right now. Please try again in a moment.") from exc

    try:
        data = json.loads(raw)
        return CustomizeResult(**data)
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise LLMError("The model returned an unexpected format. Please try again.") from exc
