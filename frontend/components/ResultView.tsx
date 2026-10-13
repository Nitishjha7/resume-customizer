"use client";

export type ExperienceBullet = { original: string; rewritten: string };

export type CustomizeResult = {
  tailored_summary: string;
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

function buildDownloadText(data: CustomizeResponse): string {
  const r = data.result;
  const lines = [
    "TAILORED RESUME SUGGESTIONS",
    "===========================",
    "",
    `Match score (original vs JD): ${r.match_score}%`,
    "",
    "SUMMARY",
    r.tailored_summary,
    "",
    "SKILLS THAT MATCH THE JD",
    ...r.matched_skills.map((s) => `- ${s}`),
    "",
    "KEYWORDS WORTH ADDING",
    ...r.missing_keywords.map((s) => `- ${s}`),
    "",
    "EXPERIENCE (rewritten)",
    ...r.experience.map((e) => `- ${e.rewritten}`),
  ];
  return lines.join("\n");
}

export default function ResultView({ data }: { data: CustomizeResponse }) {
  const r = data.result;

  function handleDownload() {
    const blob = new Blob([buildDownloadText(data)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored_resume.txt";
    a.click();
    URL.revokeObjectURL(url);
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
        <button
          onClick={handleDownload}
          className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Download .txt
        </button>
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
    </div>
  );
}
