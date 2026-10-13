# Resume Customizer

Paste a job description, upload your resume (PDF or DOCX), and get a version tailored to that
role: a rewritten summary, the skills that already match, keywords you are missing, reworded
experience bullets and a match score. The full tailored resume can be copied or downloaded as
.txt or .docx.

## Stack

- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Python, FastAPI
- LLM: Google Gemini, `gemini-3.8-flash` by default (set `GEMINI_MODEL` to change), called through the `google-genai` SDK
- Parsing: pdfplumber for PDF, python-docx for DOCX
- Hosting: backend on Google Cloud Run (Docker), frontend on Vercel

## How it works

```
browser (Next.js)
   |  POST /api/customize   multipart: jd + resume file
   v
FastAPI
   1. validate the JD and the file (type, size)
   2. extract text from the PDF/DOCX
   3. send JD + resume text to Gemini and ask for JSON back
   4. validate that JSON with pydantic and return it
   ^
browser renders it; "Download .docx" calls POST /api/export/docx
```

The system prompt tells the model not to invent skills, employers or numbers, and to list
missing JD keywords as suggestions instead of writing them into the resume. Transient Gemini
errors (429/500/503) are retried up to 3 times.

## Layout

```
backend/
  app/main.py                  routes and validation
  app/config.py               settings from env
  app/schemas.py              response models
  app/services/resume_parser.py  PDF/DOCX to text
  app/services/llm.py          prompt and Gemini call
  app/services/exporter.py     text to DOCX
  tests/                       pytest
frontend/
  app/page.tsx                 form and request
  components/ResultView.tsx    results and downloads
  lib/api.ts                   API base URL
```

## Run locally

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # source venv/bin/activate on Mac/Linux
pip install -r requirements.txt
cp .env.example .env             # put your Gemini key in .env
uvicorn app.main:app --reload --port 8000
```

A free key is available at https://aistudio.google.com/app/apikey

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

With Docker instead:

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Tests: `pip install -r requirements-dev.txt && pytest` inside `backend/`.

## Deploy

Backend on Cloud Run:

```bash
cd backend
gcloud run deploy resume-api --source . --region asia-south1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=YOUR_KEY,CORS_ORIGINS=http://localhost:3000
```

Frontend on Vercel: import the repo, set the root directory to `frontend` and add
`NEXT_PUBLIC_API_URL` = the Cloud Run URL (no trailing slash).

Then point CORS at the Vercel URL:

```bash
gcloud run services update resume-api --region asia-south1 --update-env-vars CORS_ORIGINS=https://YOUR_APP.vercel.app
```

## Error handling

- Wrong file type, file over 5 MB, JD under 50 or over 15,000 characters: 422 with a readable message
- Scanned PDF with no text layer: asks for a text-based resume
- Gemini down or returning bad JSON: 502, shown inline in the UI

## Limitations

- The match score is the model's estimate, not a keyword count. Treat it as a rough signal.
- The DOCX export is plain (headings and bullets) and does not keep the original layout. No PDF export.
- Nothing is stored. No login, no history.
- A cold start on Cloud Run adds a few seconds to the first request.
