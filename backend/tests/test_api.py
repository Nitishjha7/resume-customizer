import io

from docx import Document
from fastapi.testclient import TestClient

from app import main
from app.schemas import CustomizeResult
from app.services.llm import LLMError

client = TestClient(main.app)

JD = "Looking for a full stack developer with Next.js, FastAPI and PostgreSQL experience."


def make_docx(text: str) -> bytes:
    doc = Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def fake_result(*_):
    return CustomizeResult(
        tailored_summary="s",
        tailored_resume="SUMMARY\n- s",
        matched_skills=["Python"],
        missing_keywords=["Next.js"],
        experience=[{"original": "a", "rewritten": "b"}],
        match_score=55,
    )


def post(jd=JD, name="cv.docx", content=None):
    content = content if content is not None else make_docx("Python developer with three years of experience.")
    return client.post("/api/customize", data={"jd": jd}, files={"resume": (name, content)})


def test_short_jd_rejected():
    assert post(jd="too short").status_code == 422


def test_wrong_file_type_rejected():
    assert post(name="cv.txt", content=b"hello").status_code == 422


def test_oversized_file_rejected(monkeypatch):
    monkeypatch.setattr(main.settings, "max_file_size_mb", 1)
    assert post(content=b"x" * (1024 * 1024 + 10)).status_code == 422


def test_empty_resume_rejected():
    assert post(content=make_docx("hi")).status_code == 422


def test_success(monkeypatch):
    monkeypatch.setattr(main, "customize_resume", fake_result)
    res = post()
    assert res.status_code == 200
    assert res.json()["result"]["match_score"] == 55


def test_llm_failure_returns_502(monkeypatch):
    def boom(*_):
        raise LLMError("down")

    monkeypatch.setattr(main, "customize_resume", boom)
    assert post().status_code == 502


def test_docx_export():
    res = client.post("/api/export/docx", json={"text": "SUMMARY\n- one"})
    assert res.status_code == 200
    assert res.content[:2] == b"PK"
