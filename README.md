# Resume Customizer

A web app that takes a job description and a resume, and uses an LLM to tailor the
resume to the JD — rewriting the summary, highlighting the skills that match,
suggesting keywords worth adding, and re-angling the experience bullets.

Built for the Full Stack Developer assignment (Next.js + Python + LLM).

## Tech stack

| Layer    | Choice                                  |
|----------|-----------------------------------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend  | Python, FastAPI                         |
| LLM      | Google Gemini (`gemini-2.5-flash`) via the official `google-genai` SDK |
| Parsing  | `pdfplumber` (PDF), `python-docx` (DOCX) |
| Hosting  | Google Cloud Run (both services, containerised) |

## How it works

```
Next.js frontend  ──POST /api/customize (multipart: jd + resume)──►  FastAPI backend
      ▲                                                                   │
      │                                                   parse PDF/DOCX → plain text
      │                                                                   │
      └──────────────── JSON (summary, skills, keywords, ◄── Gemini (system prompt +
                        experience, match score)              JD + resume) returns JSON
```

The backend parses the resume to text, sends it with the JD to Gemini using a strict
system prompt (which forbids inventing anything the resume doesn't support), and returns
structured JSON the frontend renders: a match score, the tailored summary, matched-skill
and missing-keyword chips, a before/after view of the experience bullets, and the full
tailored resume with copy / .txt / .docx download (the DOCX is built by `POST /api/export/docx`).

## Project structure

```
.
├── backend/            FastAPI service
│   ├── app/
│   │   ├── main.py             routes + validation
│   │   ├── config.py           env settings
│   │   ├── schemas.py          pydantic response models
│   │   └── services/
│   │       ├── exporter.py        tailored text → DOCX
│   │       ├── resume_parser.py   PDF/DOCX → text
│   │       └── llm.py             Gemini call + system prompt
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/           Next.js app
    ├── app/
    │   ├── page.tsx            the form + flow
    │   └── layout.tsx
    ├── components/ResultView.tsx
    ├── Dockerfile
    └── .env.example
```

## Running locally

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then paste your Gemini key into .env
uvicorn app.main:app --reload --port 8000
```

Get a free Gemini key from Google AI Studio: https://aistudio.google.com/app/apikey
API docs will be at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000

## Deploying (Google Cloud Run)

Both services ship with a Dockerfile.

```bash
# Backend
cd backend
gcloud run deploy resume-api \
  --source . --region asia-south1 --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY,CORS_ORIGINS=https://YOUR_FRONTEND_URL

# Frontend (pass the deployed backend URL at build time)
cd ../frontend
gcloud run deploy resume-web \
  --source . --region asia-south1 --allow-unauthenticated \
  --set-build-env-vars NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL
```

After the backend is live, update its `CORS_ORIGINS` to the real frontend URL.

## Error handling

- Invalid file type, oversized file (>5 MB) and too-short JD → `422` with a readable message
- Scanned/image-only PDFs (no extractable text) → clear "upload a text-based resume" error
- LLM/network failures → `502` with a friendly message; the UI shows it inline

## Known limitations / trade-offs

- The match score is the model's estimate, not a deterministic keyword overlap — good as a
  signal, not an exact metric.
- DOCX parsing covers paragraphs and tables; very graphic-heavy layouts may lose formatting.
- Download is .txt or .docx. The DOCX is simple (headings, bullets) and does not keep the
  original resume's visual layout. No PDF export.
- Nothing is stored: no database, no auth, no history.

## Possible next steps

Diff view of every changed line, section-wise toggles, a cover-letter generator, and
streaming the LLM output token by token.
