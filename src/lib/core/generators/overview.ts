import type { Generator } from "./index";
import { SYSTEM_PROMPT, buildFileBlocks } from "./index";

const README_PATTERNS = ["**/{README,README.md,README.MD,readme.md,README.rst,Readme.md}"];
const MANIFESTS = [
  "**/package.json",
  "**/pyproject.toml",
  "**/Cargo.toml",
  "**/go.mod",
  "**/Gemfile",
  "**/composer.json",
  "**/build.gradle",
  "**/build.gradle.kts",
  "**/pom.xml",
];

export const overview: Generator = {
  id: "overview",
  title: "Overview",
  filename: "overview.md",
  async run(ctx, llm) {
    const signals: string[] = [];
    const filesToInclude: string[] = [];

    const [readme] = await ctx.findFiles(README_PATTERNS, 1);
    const manifests = await ctx.findFiles(MANIFESTS, 12);
    const sourceSamples = ctx.sampleSourceFiles(14);
    if (readme) filesToInclude.push(readme);
    filesToInclude.push(...manifests);
    filesToInclude.push(...sourceSamples);
    signals.push(...filesToInclude);

    const fileBlocks = await buildFileBlocks(ctx, filesToInclude, 12 * 1024);

    const langSummary = Object.entries(ctx.metadata.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k} (${v} bytes)`)
      .join(", ") || "unknown";

    const user = `Write the **Overview** documentation for the repo \`${ctx.owner}/${ctx.repo}\`.

Repo metadata:
- Default branch: ${ctx.metadata.defaultBranch}
- Description: ${ctx.metadata.description ?? "(none)"}
- Primary language: ${ctx.metadata.language ?? "unknown"}
- Languages by bytes: ${langSummary}
- Topics: ${ctx.metadata.topics.join(", ") || "(none)"}
- License: ${ctx.metadata.license ?? "(none)"}
- Stars: ${ctx.metadata.stars}

Top-level directories: ${ctx.topDirs().join(", ") || "(none)"}

File tree (truncated):
\`\`\`
${ctx.fileTreePreview(260)}
\`\`\`

Source files:

${fileBlocks || "(no manifest or README found)"}

Produce sections for internal repo onboarding:
1. \`# Overview\` — explain what this repo appears to own and how it fits together.
2. \`## Mental model\` — describe the main moving parts a developer or coding agent should keep in mind before changing code.
3. \`## Tech stack\` — languages, frameworks, runtime, package managers, and important dependencies grounded in manifests.
4. \`## Repository layout\` — explain what each important top-level directory/file is for and where common changes likely belong.
5. \`## Entry points\` — main app/server/CLI/library entrypoints, scripts, binaries, or routes if discoverable.
6. \`## Data and control flow\` — describe how requests, CLI commands, jobs, or core operations appear to move through the codebase.
7. \`## Development workflow\` — likely local edit/build/run loop based on scripts and structure.
8. \`## Change map\` — bullets mapping common tasks to likely files/directories to inspect first.
9. \`## Agent notes\` — direct guidance for a coding agent: what to inspect before edits, what not to assume, and where coupling seems likely.
10. \`## Open questions\` — only list important repo facts that were not visible from the provided files.`;

    const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 5000 });
    return { filename: "overview.md", content, signals };
  },
};
