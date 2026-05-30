export interface GeneratorMeta {
  id: string;
  title: string;
  filename: string;
  description: string;
  detects: string[];
}

export const GENERATOR_CATALOG: GeneratorMeta[] = [
  {
    id: "overview",
    title: "Overview",
    filename: "overview.md",
    description:
      "What the project does, the tech stack, and how the repo is laid out.",
    detects: ["README.md", "package.json", "pyproject.toml", "language stats"],
  },
  {
    id: "code-standards",
    title: "Code standards",
    filename: "code-standards.md",
    description: "Linting, formatting, and language conventions in the codebase.",
    detects: [".eslintrc*", ".prettierrc*", "tsconfig.json", ".editorconfig", "biome.json"],
  },
  {
    id: "deployments",
    title: "Deployments",
    filename: "deployments.md",
    description: "Hosting platforms, CI/CD workflows, containers, env vars.",
    detects: ["Dockerfile", ".github/workflows/*", "vercel.json", "render.yaml", "fly.toml"],
  },
  {
    id: "migrations",
    title: "Database & migrations",
    filename: "migrations.md",
    description: "ORM in use, schema models, and how to create + apply migrations.",
    detects: ["prisma/schema.prisma", "drizzle.config", "alembic.ini", "migrations/"],
  },
  {
    id: "testing",
    title: "Testing & quality",
    filename: "testing.md",
    description: "Test frameworks, how to run tests, and where they live.",
    detects: ["jest.config*", "vitest.config*", "pytest.ini", "playwright.config*", "__tests__/"],
  },
  {
    id: "getting-started",
    title: "Getting started",
    filename: "getting-started.md",
    description: "Prerequisites, install, env vars, dev server, useful scripts.",
    detects: ["package.json scripts", ".env.example", "Makefile", "README install"],
  },
];

export function getCatalogEntry(id: string): GeneratorMeta | undefined {
  return GENERATOR_CATALOG.find((g) => g.id === id);
}
