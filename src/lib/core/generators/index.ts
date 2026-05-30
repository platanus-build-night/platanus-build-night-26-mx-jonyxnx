import type { RepoContext } from "../context";
import type { LLMProvider } from "../llm";
import { overview } from "./overview";
import { codeStandards } from "./codeStandards";
import { deployments } from "./deployments";
import { migrations } from "./migrations";
import { testing } from "./testing";
import { gettingStarted } from "./gettingStarted";

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
  codeStandards,
  deployments,
  migrations,
  testing,
  gettingStarted,
];

export function getGenerators(ids?: string[]): Generator[] {
  if (!ids || ids.length === 0) return ALL_GENERATORS;
  const set = new Set(ids);
  return ALL_GENERATORS.filter((g) => set.has(g.id));
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

export const SYSTEM_PROMPT = `You are a precise technical writer creating internal engineering documentation for a real codebase.
Rules:
- Write ONLY what is supported by the provided files. If something is unknown or absent, say so explicitly.
- Do not invent versions, commands, URLs, or behavior.
- Optimize for a new company developer or coding agent that needs to work safely in this repo, not for public product marketing or end-user usage.
- Explain how the repo is put together, where to make changes, what conventions to follow, and what to be careful about.
- Output GitHub-flavored markdown. No preamble. Start with the requested heading.
- Keep a consistent style: short paragraphs, flat bullet lists, and predictable section headings.
- Prefer bullets for steps, commands, conventions, and file lists. Use prose only for brief summaries.
- Go deep enough that a new developer can make a safe first change without reading the whole repo first.
- Include relationships between files and systems when the evidence supports them.
- Prefer actionable guidance over generic explanation.
- Do not add source-footers such as "Generated from" or explain where the information came from.
- When you reference a file, use backticks and its repo-relative path.`;

export function notDetectedStub(title: string, _looked: string[]): string {
  return [
    `# ${title}`,
    "",
    "_No clear evidence for this area was detected in the repository._",
    "",
    "A developer or coding agent should treat this topic as unknown until the repo gains explicit configuration or source files for it.",
    "",
  ].join("\n");
}
