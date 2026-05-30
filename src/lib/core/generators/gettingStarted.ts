import type { Generator } from "./index";
import { SYSTEM_PROMPT, buildFileBlocks } from "./index";

const CANDIDATES = [
  "**/package.json",
  "**/pyproject.toml",
  "**/Gemfile",
  "**/go.mod",
  "**/Cargo.toml",
  "**/Makefile",
  "**/.env.example",
  "**/.env.sample",
  "**/env.example",
  "**/README.md",
];

export const gettingStarted: Generator = {
  id: "getting-started",
  title: "Getting started",
  filename: "getting-started.md",
  async run(ctx, llm) {
    const found = await ctx.findFiles(CANDIDATES, 16);

    const fileBlocks = await buildFileBlocks(ctx, found, 16 * 1024);

    const user = `Write the **Getting started** documentation for \`${ctx.owner}/${ctx.repo}\`.

Files available:

${fileBlocks || "(no manifest detected — base it on metadata only)"}

Repo description: ${ctx.metadata.description ?? "(none)"}
Primary language: ${ctx.metadata.language ?? "unknown"}

Produce internal onboarding documentation:
1. \`# Getting started\` heading.
2. \`## Prerequisites\` — runtime / language version + package manager (only what's visible).
3. \`## Install\` — concrete install command (npm/pnpm/yarn install, pip install, bundle install, etc.).
4. \`## Environment\` — list env vars from examples/configs if present, with names and visible purpose; never invent values.
5. \`## Run locally\` — dev/server/worker commands grounded in scripts and manifests.
6. \`## First-change workflow\` — recommended sequence for a new developer: install, configure env, run, make a small change, verify.
7. \`## Useful scripts\` — explain what important scripts likely do and when to use each.
8. \`## Troubleshooting\` — likely setup issues visible from the repo files and how to diagnose them.`;

    const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 3500 });
    return { filename: "getting-started.md", content, signals: found };
  },
};
