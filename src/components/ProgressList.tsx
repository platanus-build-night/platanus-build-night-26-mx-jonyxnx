"use client";

export type GenStatus = "pending" | "running" | "done" | "failed";

export interface GenRow {
  id: string;
  title: string;
  status: GenStatus;
  error?: string;
  signals?: string[];
}

export function ProgressList({ rows }: { rows: GenRow[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-[#fffdf7] px-3 py-2.5 text-sm text-stone-800"
        >
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-center shadow-sm">
            {r.status === "pending" && <span className="text-stone-400">·</span>}
            {r.status === "running" && <span className="animate-pulse text-amber-500">●</span>}
            {r.status === "done" && <span className="text-emerald-500">✓</span>}
            {r.status === "failed" && <span className="text-rose-500">✗</span>}
          </span>
          <span className="flex-1 font-medium">{r.title}</span>
          {r.signals && r.signals.length > 0 && (
            <span className="hidden max-w-[40%] truncate font-mono text-xs text-stone-500 sm:inline">
              {r.signals.slice(0, 3).join(", ")}
              {r.signals.length > 3 ? "…" : ""}
            </span>
          )}
          {r.error && <span className="truncate text-xs text-rose-600">{r.error}</span>}
        </li>
      ))}
    </ul>
  );
}
