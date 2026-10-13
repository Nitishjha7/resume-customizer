FROM python:3.11-slim

WORKDIR /app

# System deps kept minimal; pdfplumber/pillow wheels ship binaries.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Cloud Run provides $PORT (defaults to 8080). Bind to it.
ENV PORT=8080
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
