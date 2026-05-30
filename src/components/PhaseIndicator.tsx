import type { Phase } from "@/lib/core/orchestrator";

const PHASE_LABELS: Record<Phase, string> = {
  parsing: "Parsing the GitHub URL",
  fetching: "Fetching repo metadata",
  cloning: "Cloning the repo",
  ready: "Repo ready - running generators",
};

const PHASE_ORDER: Phase[] = ["parsing", "fetching", "cloning", "ready"];

export function PhaseIndicator({
  phase,
  detail,
  target,
}: {
  phase: Phase | "generating" | "complete" | null;
  detail?: string;
  target?: string | null;
}) {
  if (!phase) return null;

  const phaseIdx = PHASE_ORDER.indexOf(phase as Phase);
  const generating = phase === "generating";
  const complete = phase === "complete";

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!complete && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
        {complete && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
        <span className={`font-medium ${complete ? "text-emerald-700" : "text-amber-800"}`}>
          {complete
            ? "Docs ready for Notion"
            : generating
              ? "Generating markdown sections..."
              : PHASE_LABELS[phase as Phase]}
        </span>
        {detail && <span className="font-mono text-stone-500">· {detail}</span>}
        {target && <span className="font-mono text-stone-500">· {target}</span>}
      </div>
      {!complete && !generating && (
        <div className="flex gap-1">
          {PHASE_ORDER.map((p, i) => (
            <div
              key={p}
              className={`h-1 flex-1 rounded-full ${
                i <= phaseIdx ? "bg-amber-400" : "bg-stone-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
