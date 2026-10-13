"use client";

import { useState } from "react";

export type ExperienceBullet = { original: string; rewritten: string };

export type CustomizeResult = {
  tailored_summary: string;
  tailored_resume: string;
  matched_skills: string[];
  missing_keywords: string[];
  experience: ExperienceBullet[];
  match_score: number;
};

export type CustomizeResponse = {
  filename: string;
  original_text: string;
  result: CustomizeResult;
};

const btn =
  "rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60";

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="shrink-0">
      <circle cx="45" cy="45" r={r} stroke="#1f2937" strokeWidth="8" fill="none" />
      <circle
        cx="45"
        cy="45"
        r={r}
        stroke={color}
        strokeWidth="8"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
      />
      <text x="45" y="50" textAnchor="middle" fontSize="20" fill="#e5e7eb" fontWeight="600">
        {score}%
      </text>
    </svg>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultView({ data }: { data: CustomizeResponse }) {
  const r = data.result;

  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function downloadTxt() {
    saveBlob(new Blob([r.tailored_resume], { type: "text/plain" }), "tailored_resume.txt");
  }

  async function downloadDocx() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`${API_URL}/api/export/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: r.tailored_resume }),
      });
      if (!res.ok) throw new Error();
      saveBlob(await res.blob(), "tailored_resume.docx");
    } catch {
      setExportError("Couldn't create the DOCX. Try the .txt download instead.");
    } finally {
      setExporting(false);
    }
  }

  async function copyResume() {
    await navigator.clipboard.writeText(r.tailored_resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <ScoreRing score={r.match_score} />
        <div>
          <h2 className="text-lg font-semibold text-white">Match analysis</h2>
          <p className="text-sm text-gray-400">
            How well <span className="text-gray-200">{data.filename}</span> fits the pasted JD,
            before tailoring.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-400">
          Tailored summary
        </h3>
        <p className="leading-relaxed text-gray-200">{r.tailored_summary}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-400">
            Matched skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {r.matched_skills.map((s) => (
              <span key={s} className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-300">
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-400">
            Keywords to consider adding
          </h3>
          <div className="flex flex-wrap gap-2">
            {r.missing_keywords.length === 0 && (
              <span className="text-sm text-gray-500">Nothing major missing — nice.</span>
            )}
            {r.missing_keywords.map((s) => (
              <span key={s} className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
                {s}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-indigo-400">
          Experience, rewritten for this JD
        </h3>
        <div className="space-y-4">
          {r.experience.map((e, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-2">
              <p className="rounded-lg bg-gray-800/40 p-3 text-sm text-gray-400 line-through decoration-gray-600">
                {e.original}
              </p>
              <p className="rounded-lg bg-indigo-500/10 p-3 text-sm text-gray-100">{e.rewritten}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-semibold uppercase tracking-wide text-indigo-400">
            Tailored resume
          </h3>
          <button onClick={copyResume} className={btn}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={downloadTxt} className={btn}>
            Download .txt
          </button>
          <button onClick={downloadDocx} disabled={exporting} className={btn}>
            {exporting ? "Preparing…" : "Download .docx"}
          </button>
        </div>
        {exportError && <p className="mb-2 text-sm text-red-400">{exportError}</p>}
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-4 font-sans text-sm leading-relaxed text-gray-200">
          {r.tailored_resume}
        </pre>
      </section>
    </div>
  );
}
