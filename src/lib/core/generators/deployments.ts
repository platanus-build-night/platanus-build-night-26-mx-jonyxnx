import type { Generator } from "./index";
import { SYSTEM_PROMPT, buildFileBlocks, notDetectedStub } from "./index";

const PATTERN_GROUPS = [
  ["Dockerfile", "Dockerfile.*", "**/Dockerfile"],
  ["docker-compose.yml", "docker-compose.*.yml", "compose.yml", "compose.*.yml"],
  [".github/workflows/*.yml", ".github/workflows/*.yaml"],
  ["vercel.json"],
  ["render.yaml", "render.yml"],
  ["netlify.toml"],
  ["fly.toml"],
  ["Procfile"],
  ["app.yaml"],
  ["serverless.yml", "serverless.yaml"],
  ["**/*.tf"],
  ["k8s/**/*.yaml", "k8s/**/*.yml", "deploy/**/*.yaml"],
  ["railway.json", "railway.toml"],
];

const FLAT = PATTERN_GROUPS.flat();

export const deployments: Generator = {
  id: "deployments",
  title: "Deployments & infrastructure",
  filename: "deployments.md",
  async run(ctx, llm) {
    const found = new Set<string>();
    for (const group of PATTERN_GROUPS) {
      const matches = await ctx.glob(group as string[]);
      for (const m of matches) found.add(m);
    }
    const foundList = [...found].slice(0, 20);

    if (foundList.length === 0) {
      return {
        filename: "deployments.md",
        content: notDetectedStub("Deployments & infrastructure", FLAT),
        signals: [],
      };
    }

    const fileBlocks = await buildFileBlocks(ctx, foundList, 8 * 1024);

    const user = `Write the **Deployments & infrastructure** documentation for \`${ctx.owner}/${ctx.repo}\`.

${fileBlocks}

Produce internal deployment and operations guidance:
1. \`# Deployments & infrastructure\` heading.
2. \`## Hosting / platforms\` — Vercel, Render, Fly, AWS, k8s, etc. (only what's actually configured).
3. \`## CI/CD\` — workflows, triggers, jobs, build/test/deploy steps, and what each pipeline appears responsible for.
4. \`## Runtime shape\` — containers, serverless/runtime config, build artifacts, ports, process commands, and deployment entrypoints if visible.
5. \`## Environment variables\` — env vars referenced in configs, grouped by purpose when possible; do not invent values.
6. \`## How to deploy\` — concrete steps a company developer would follow, grounded in the above.
7. \`## Operational notes\` — risks, external services, secrets, migrations, or manual steps visible from configs.
8. \`## Agent checklist\` — what a coding agent should inspect before changing deployment or CI files.`;

    const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 4000 });
    return { filename: "deployments.md", content, signals: foundList };
  },
};
