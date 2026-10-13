"use client";

import { useState } from "react";
import ResultView, { CustomizeResponse } from "@/components/ResultView";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ACCEPTED = [".pdf", ".docx"];

export default function Home() {
  const [jd, setJd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomizeResponse | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        setError("Please upload a PDF or DOCX file.");
        setFile(null);
        return;
      }
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (jd.trim().length < 50) {
      setError("Please paste a fuller job description (at least 50 characters).");
      return;
    }
    if (!file) {
      setError("Please upload your resume first.");
      return;
    }

    const form = new FormData();
    form.append("jd", jd);
    form.append("resume", file);

    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`${API_URL}/api/customize`, { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) {
        // FastAPI puts the message in `detail`
        throw new Error(body.detail ?? "Something went wrong. Please try again.");
      }
      setData(body as CustomizeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Resume Customizer</h1>
        <p className="mt-1 text-gray-400">
          Paste a job description, upload your resume, and let AI tailor it to match.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Job description</label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={8}
            placeholder="Paste the full JD here..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">{jd.trim().length} characters</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Resume (PDF or DOCX)</label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={onFileChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500">
              {file.name} — {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Tailoring…" : "Customize my resume"}
        </button>
      </form>

      {data && (
        <div className="mt-10">
          <ResultView data={data} />
        </div>
      )}
    </main>
  );
}
