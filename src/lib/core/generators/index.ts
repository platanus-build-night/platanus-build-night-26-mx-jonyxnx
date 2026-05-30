import type { RepoContext } from "../context";
import type { LLMProvider } from "../llm";
import { overview } from "./overview";
import { setup } from "./setup";
import { testing } from "./testing";
import { deployment } from "./deployment";
import { conventions } from "./conventions";
import { migrations } from "./migrations";

export interface GeneratorResult {
  filename: string;
  content: string;
  signals: string[];
}

export interface Generator {
  id: string;
  title: string;
  filename: string;
  run(ctx: RepoContext, llm: LLMProvider): Promise<GeneratorResult>;
}

export const ALL_GENERATORS: Generator[] = [
  overview,
  setup,
  testing,
  deployment,
  conventions,
  migrations,
];

export function getGenerators(ids?: string[]): Generator[] {
  if (!ids || ids.length === 0) return ALL_GENERATORS;
  const set = new Set(ids);
  return ALL_GENERATORS.filter((g) => set.has(g.id));
}

const FALLBACK_CONTEXT_PATTERNS = [
  "**/README.md",
  "**/readme.md",
  "**/package.json",
  "**/pyproject.toml",
  "**/Makefile",
  "**/go.mod",
];

export async function buildBroadContext(
  ctx: RepoContext,
  maxFiles = 6,
): Promise<{ blocks: string; paths: string[] }> {
  const paths = await ctx.findFiles(FALLBACK_CONTEXT_PATTERNS, maxFiles);
  const blocks = await buildFileBlocks(ctx, paths, 12 * 1024);
  return { blocks, paths };
}

export async function buildFileBlocks(
  ctx: RepoContext,
  paths: string[],
  perFileMax = 16 * 1024,
): Promise<string> {
  const blocks: string[] = [];
  for (const p of paths) {
    if (!(await ctx.exists(p))) continue;
    const content = await ctx.readFile(p, perFileMax);
    blocks.push(`<file path="${p}">\n${content}\n</file>`);
  }
  return blocks.join("\n\n");
}

export const SYSTEM_PROMPT = `You are a technical writer creating SHORT, high-signal internal docs for a real codebase. Your reader is a human developer joining the team.
Rules:
- Keep it short. Each page should be skimmable in under a minute. Prefer a few strong bullets over long prose.
- Document only what matters: the important files, decisions, and gotchas. Skip the obvious, the trivial, and anything a developer can read from the code in seconds. Do NOT try to document everything.
- Use plain, simple language. Short sentences. No jargon, no filler, no marketing.
- Write ONLY what is supported by the provided files. Do not invent commands, versions, URLs, or behavior. If something important is missing, say so in one line; otherwise just omit it.
- Write for people, not AI agents. Do not include "agent" instructions or checklists — that lives in a separate AGENTS.md file.
- Output GitHub-flavored markdown. No preamble. Start with the requested heading. Omit any section that has nothing important to say.
- Prefer short bullets and small tables. Reference files with backticks and repo-relative paths.
- Do not add source-footers or explain where the information came from.`;

export function notDetectedStub(title: string, _looked: string[]): string {
  return [
    `# ${title}`,
    "",
    "_No clear evidence for this area was detected in the repository._",
    "",
    "Treat this topic as unknown until the repo gains explicit configuration or source files for it.",
    "",
  ].join("\n");
}
