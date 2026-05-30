import { parseGitHubUrl } from "./url";
import { fetchRepo } from "./fetcher";
import { RepoContext } from "./context";
import { getLLM, type LLMProvider, type ProviderName } from "./llm";
import { getGenerators, type GeneratorResult, type Generator } from "./generators";

export type Phase = "parsing" | "fetching" | "cloning" | "ready";

export type ProgressEvent =
  | { type: "phase"; phase: Phase; detail?: string }
  | { type: "started"; owner: string; repo: string; ref: string; generators: { id: string; title: string }[] }
  | { type: "generator:started"; id: string }
  | { type: "generator:done"; id: string; result: GeneratorResult }
  | { type: "generator:failed"; id: string; error: string }
  | { type: "complete"; results: GeneratorResult[] }
  | { type: "error"; error: string };

export interface PreparedRun {
  ctx: RepoContext;
  llm: LLMProvider;
  generators: Generator[];
  cleanup: () => Promise<void>;
}

export interface RunOptions {
  url: string;
  provider?: ProviderName;
  only?: string[];
}

export async function prepareRun(opts: RunOptions): Promise<PreparedRun> {
  const parsed = parseGitHubUrl(opts.url);
  const llm = getLLM(opts.provider);
  const generators = getGenerators(opts.only);
  const fetched = await fetchRepo(parsed);
  const ctx = new RepoContext(fetched);
  return { ctx, llm, generators, cleanup: fetched.cleanup };
}

export async function* runGenerators(prepared: PreparedRun): AsyncGenerator<ProgressEvent> {
  const { ctx, llm, generators } = prepared;
  yield {
    type: "started",
    owner: ctx.owner,
    repo: ctx.repo,
    ref: ctx.ref,
    generators: generators.map((g) => ({ id: g.id, title: g.title })),
  };

  const results: GeneratorResult[] = [];
  const started = generators.map((g) => ({ id: g.id, p: g.run(ctx, llm) }));
  for (const { id } of started) yield { type: "generator:started", id };

  for (const { id, p } of started) {
    try {
      const result = await p;
      results.push(result);
      yield { type: "generator:done", id, result };
    } catch (err) {
      yield {
        type: "generator:failed",
        id,
        error: (err as Error).message ?? String(err),
      };
    }
  }
  yield { type: "complete", results };
}

/** One-shot run with phase events + auto-cleanup. Used by the web SSE route. */
export async function* runOrchestrator(opts: RunOptions): AsyncGenerator<ProgressEvent> {
  let cleanup: (() => Promise<void>) | null = null;
  try {
    yield { type: "phase", phase: "parsing" };
    const parsed = parseGitHubUrl(opts.url);

    const llm = getLLM(opts.provider);
    const generators = getGenerators(opts.only);

    yield { type: "phase", phase: "fetching", detail: `${parsed.owner}/${parsed.repo}` };
    const fetched = await fetchRepo(parsed);
    cleanup = fetched.cleanup;
    const ctx = new RepoContext(fetched);

    yield { type: "phase", phase: "ready" };

    yield* runGenerators({ ctx, llm, generators, cleanup });
  } catch (err) {
    yield { type: "error", error: (err as Error).message ?? String(err) };
  } finally {
    if (cleanup) {
      try {
        await cleanup();
      } catch {
        // ignore
      }
    }
  }
}
