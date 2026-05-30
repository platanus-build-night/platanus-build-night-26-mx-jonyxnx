import type { RepoContext } from "../context";
import type { LLMProvider } from "../llm";
import { SYSTEM_PROMPT, buildFileBlocks, type GeneratorResult } from "./index";

const AGENT_CONTEXT_PATTERNS = [
  "**/README.md",
  "**/package.json",
  "**/pyproject.toml",
  "**/Cargo.toml",
  "**/go.mod",
  "**/Makefile",
  "**/.github/workflows/*.{yml,yaml}",
  "**/.github/actions/**/action.{yml,yaml}",
  "**/.env.example",
  "**/tsconfig*.json",
  "**/next.config.*",
  "**/vite.config.*",
];

export async function generateAgentDoc(
  ctx: RepoContext,
  llm: LLMProvider,
): Promise<GeneratorResult> {
  const contextFiles = await ctx.findFiles(AGENT_CONTEXT_PATTERNS, 24);
  const sourceSamples = ctx.sampleSourceFiles(18);
  const paths = [...new Set([...contextFiles, ...sourceSamples])];
  const fileBlocks = await buildFileBlocks(ctx, paths, 10 * 1024);

  const user = `Write a root **AGENT.md** file for \`${ctx.owner}/${ctx.repo}\`.

This document will live at the root of the Notion repo page and should act as the main operating guide for a coding agent or new company developer.

Repo ref: ${ctx.ref}
Top-level directories: ${ctx.topDirs().join(", ") || "(none)"}

File tree (truncated):
\`\`\`
${ctx.fileTreePreview(320)}
\`\`\`

Repository evidence:

${fileBlocks || "(no representative files found)"}

Produce:
1. \`# AGENT.md\` heading.
2. \`## Mission\` - what the agent should help with in this repo.
3. \`## Repo mental model\` - the main systems, entry points, and how they relate.
4. \`## Where to look first\` - map common tasks to likely files/directories.
5. \`## Local workflow\` - install, run, build, test, and verification commands when visible.
6. \`## Coding rules\` - conventions and safety rules grounded in the files.
7. \`## CI and Notion docs workflow\` - how automation appears to run, especially GitHub Actions and Notion sync when visible.
8. \`## Change safety checklist\` - checks an agent should complete before handing off changes.
9. \`## Unknowns to verify\` - important facts not visible from the provided files.`;

  const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 5500 });
  return { filename: "AGENT.md", content, signals: paths };
}
