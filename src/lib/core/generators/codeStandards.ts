import type { Generator } from "./index";
import { SYSTEM_PROMPT, buildFileBlocks, notDetectedStub } from "./index";

const CONFIG_PATTERNS = [
  "**/.eslintrc",
  "**/.eslintrc.{js,cjs,json,yml,yaml}",
  "**/eslint.config.{js,mjs,cjs,ts}",
  "**/.prettierrc",
  "**/.prettierrc.{json,js,yaml,yml}",
  "**/prettier.config.{js,cjs,mjs}",
  "**/.editorconfig",
  "**/tsconfig*.json",
  "**/biome.{json,jsonc}",
  "**/pyproject.toml",
  "**/setup.cfg",
  "**/.rubocop.yml",
  "**/.pylintrc",
  "**/.flake8",
  "**/.golangci.{yml,yaml}",
  "**/rustfmt.toml",
  "**/.rustfmt.toml",
  "**/.clang-format",
  "**/package.json",
];

export const codeStandards: Generator = {
  id: "code-standards",
  title: "Code standards",
  filename: "code-standards.md",
  async run(ctx, llm) {
    const configFiles = await ctx.findFiles(CONFIG_PATTERNS, 20);
    const sampleFiles = ctx.sampleSourceFiles(16);
    const signals = [...configFiles, ...sampleFiles];

    if (signals.length === 0) {
      return {
        filename: "code-standards.md",
        content: notDetectedStub("Code standards", CONFIG_PATTERNS),
        signals: [],
      };
    }

    const fileBlocks = await buildFileBlocks(ctx, signals, 12 * 1024);

    const user = `Write the **Code standards** documentation for \`${ctx.owner}/${ctx.repo}\`.

The repository was explored from the cloned checkout. Use both explicit tooling config and representative source files.

Detected config files:
${configFiles.map((f) => "- `" + f + "`").join("\n") || "- none"}

Representative source files analyzed:
${sampleFiles.map((f) => "- `" + f + "`").join("\n") || "- none"}

${fileBlocks}

Produce internal engineering guidance:
1. \`# Code standards\` heading.
2. \`## Tooling\` — linters, formatters, compilers, package scripts, and where they are configured.
3. \`## Formatting\` — indentation, quotes, semicolons, trailing commas, import style, naming, component/function style, etc. Prefer explicit config; otherwise infer cautiously from sampled code.
4. \`## Language / compiler settings\` — TypeScript strict flags, Python version, lint targets, etc. (only what's visible).
5. \`## Code patterns observed\` — patterns from sampled source files: module boundaries, component/function style, error handling, async/data flow, naming, and file organization.
6. \`## Conventions to follow\` — actionable bullets for a new developer or coding agent making changes in this repo.
7. \`## Review checklist\` — concrete checks a reviewer or coding agent should apply before handing off changes.
8. \`## Things to avoid\` — risky changes or style mismatches that would conflict with the observed codebase.`;

    const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 5000 });
    return { filename: "code-standards.md", content, signals };
  },
};
