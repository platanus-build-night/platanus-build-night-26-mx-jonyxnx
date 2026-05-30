"use client";

import { useMemo, useState } from "react";
import { UrlForm } from "@/components/UrlForm";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { PixelCat } from "@/components/PixelCat";
import { MarkdownPreview, type PreviewFile } from "@/components/MarkdownPreview";
import { DocTree, type DocNavItem } from "@/components/DocTree";
import type { Phase } from "@/lib/core/orchestrator";

type UIPhase = Phase | "generating" | "complete" | null;
type DocStatus = "running" | "done" | "failed";

interface DocRuntime extends DocNavItem {
  content?: string;
  status: DocStatus;
}

export default function Home() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<UIPhase>(null);
  const [phaseDetail, setPhaseDetail] = useState<string | undefined>(undefined);
  const [target, setTarget] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, DocRuntime>>({});
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setRunning(true);
    setPhase("parsing");
    setPhaseDetail(undefined);
    setTarget(null);
    setFileTree([]);
    setDocs({});
    setSelectedDocId(null);
    setDownloadUrl(null);
    setError(null);
  }

  async function handleSubmit(url: string, provider: "anthropic" | "openai") {
    resetState();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, provider }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const block of events) {
          const lines = block.split("\n");
          const event = lines.find((l) => l.startsWith("event: "))?.slice(7);
          const dataLine = lines.find((l) => l.startsWith("data: "))?.slice(6);
          if (!event || !dataLine) continue;
          const data = JSON.parse(dataLine);
          handleEvent(event, data);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(event: string, data: unknown) {
    const d = data as Record<string, unknown>;
    if (event === "phase") {
      setPhase(d.phase as Phase);
      setPhaseDetail(d.detail as string | undefined);
    } else if (event === "repo") {
      setTarget(`${d.owner}/${d.repo}@${d.ref}`);
      setFileTree((d.fileTree as string[]) ?? []);
      setPhase("generating");
    } else if (event === "doc:started") {
      const id = d.id as string;
      setDocs((prev) => ({
        ...prev,
        [id]: docFromEvent(d, "running"),
      }));
      setSelectedDocId((current) => current ?? id);
    } else if (event === "doc:done") {
      const id = d.id as string;
      setDocs((prev) => ({
        ...prev,
        [id]: docFromEvent(d, "done"),
      }));
    } else if (event === "doc:failed") {
      const id = d.id as string;
      setDocs((prev) => ({
        ...prev,
        [id]: docFromEvent(d, "failed"),
      }));
    } else if (event === "complete") {
      setPhase("complete");
    } else if (event === "download") {
      setDownloadUrl(d.url as string);
    } else if (event === "error") {
      setError(d.error as string);
      setPhase(null);
    }
  }

  const docList = useMemo(() => Object.values(docs), [docs]);
  const previewFile = useMemo<PreviewFile | null>(() => {
    const selected = selectedDocId ? docs[selectedDocId] : null;
    if (selected?.status === "failed") {
      return {
        filename: selected.filename,
        content: `# ${selected.title}\n\nThis doc failed to generate.\n\n${selected.error ?? "Unknown error."}`,
      };
    }
    if (!selected?.content) return null;
    return { filename: selected.filename, content: selected.content };
  }, [docs, selectedDocId]);
  const showExplorer = docList.length > 0 || fileTree.length > 0 || Boolean(error);
  const isLandingView = !showExplorer && !running && !downloadUrl;

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {isLandingView ? (
          <section className="mx-auto flex flex-1 max-w-3xl flex-col items-center justify-center text-center">
            <PixelCat size="md" />
            <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-stone-400">kitdoc</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              Small docs for fast repo handoffs.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              Paste a GitHub repo and get concise developer docs, an agent guide, and a readable file map.
            </p>
            <div className="mt-10 w-full rounded-[2rem] border border-stone-200 bg-white/75 p-3 text-left shadow-sm">
              <UrlForm disabled={running} onSubmit={handleSubmit} />
            </div>
          </section>
        ) : (
          <header className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-stone-200 bg-white/75 p-4 shadow-sm lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <PixelCat size="sm" />
              <div>
                <p className="text-sm font-semibold text-stone-950">kitdoc</p>
                <p className="text-sm text-stone-500">{target ?? "Generating concise repo docs"}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <UrlForm disabled={running} onSubmit={handleSubmit} />
            </div>
          </header>
        )}

        {!isLandingView && phase && (
          <div className="mb-4">
            <PhaseIndicator phase={phase} detail={phaseDetail} target={target} />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <strong className="font-semibold">Error: </strong>
            {error}
          </div>
        )}

        {downloadUrl && (
          <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900">Docs ready</p>
              <p className="text-sm text-emerald-700">{docList.length} markdown files are ready to download.</p>
            </div>
            <a
              href={downloadUrl}
              className="rounded-xl bg-stone-950 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              Download .zip
            </a>
          </div>
        )}

        {showExplorer && (
          <section className="grid min-h-[620px] flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <DocTree docs={docList} files={fileTree} selectedId={selectedDocId} onSelect={setSelectedDocId} />
            <div className="min-h-0">
              <MarkdownPreview file={previewFile} />
            </div>
          </section>
        )}

        <footer className="mt-auto flex items-center justify-center pt-8 text-xs text-stone-500">
          <span>
            Built at Platanus Build Night by{" "}
            <a
              href="https://github.com/jonyxnx"
              className="underline decoration-dotted text-stone-700"
            >
              @jonyxnx
            </a>
            .
          </span>
        </footer>
      </main>
    </div>
  );
}

function docFromEvent(d: Record<string, unknown>, status: DocStatus): DocRuntime {
  return {
    id: d.id as string,
    title: d.title as string,
    filename: d.filename as string,
    icon: d.icon as string,
    kind: d.kind as DocRuntime["kind"],
    status,
    content: d.content as string | undefined,
    error: d.error as string | undefined,
  };
}
