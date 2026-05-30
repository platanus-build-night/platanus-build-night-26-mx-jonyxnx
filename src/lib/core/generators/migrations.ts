import type { Generator } from "./index";
import { SYSTEM_PROMPT, buildFileBlocks, notDetectedStub } from "./index";

const SIGNAL_PATTERNS = [
  "**/prisma/schema.prisma",
  "**/drizzle.config.{ts,js,mjs}",
  "**/alembic.ini",
  "**/knexfile.{js,ts}",
  "**/db/schema.rb",
  "**/config/database.yml",
  "**/sequelize.config.js",
  "**/typeorm.config.ts",
  "**/ormconfig.json",
  "**/supabase/config.toml",
];

const FOLDER_PATTERNS = [
  "prisma/migrations/**/*.sql",
  "drizzle/**/*.sql",
  "migrations/**/*.sql",
  "migrations/**/*.py",
  "migrations/**/*.rb",
  "db/migrate/**/*.rb",
  "alembic/versions/**/*.py",
  "supabase/migrations/**/*.sql",
];

export const migrations: Generator = {
  id: "migrations",
  title: "Database & migrations",
  filename: "migrations.md",
  async run(ctx, llm) {
    const found = new Set<string>();
    for (const p of await ctx.findFiles(SIGNAL_PATTERNS, 20)) found.add(p);
    const sampleMigrations: string[] = [];
    for (const pattern of FOLDER_PATTERNS) {
      const matches = await ctx.glob(pattern);
      for (const m of matches) found.add(m);
      sampleMigrations.push(...matches.slice(0, 2));
    }

    const foundList = [...found].slice(0, 15);
    if (foundList.length === 0) {
      return {
        filename: "migrations.md",
        content: notDetectedStub("Database & migrations", [...SIGNAL_PATTERNS, ...FOLDER_PATTERNS]),
        signals: [],
      };
    }

    const filesToRead = [
      ...[...found].filter((p) => !sampleMigrations.includes(p)),
      ...sampleMigrations.slice(0, 3),
    ];
    const fileBlocks = await buildFileBlocks(ctx, filesToRead, 12 * 1024);

    const user = `Write the **Database & migrations** documentation for \`${ctx.owner}/${ctx.repo}\`.

Detected files:
${foundList.map((f) => "- `" + f + "`").join("\n")}

Contents of key files:

${fileBlocks}

Produce internal database guidance:
1. \`# Database & migrations\` heading.
2. \`## ORM / tooling\` — which ORM and migration tool (Prisma, Drizzle, Alembic, etc.).
3. \`## Schema overview\` — the main models/tables visible in schema or migrations, with short descriptions grounded in names/fields.
4. \`## How migrations work\` — where migrations live, naming/versioning pattern, and workflow to create/apply them for this stack.
5. \`## Local development workflow\` — how a developer should prepare, migrate, reset, seed, or inspect the database when commands/configs are visible.
6. \`## Common commands\` — concrete CLI commands a developer would run (e.g., \`npx prisma migrate dev\`).
7. \`## Change safety\` — cautions for schema changes, destructive operations, generated clients, and deployment ordering visible from files.`;

    const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 4000 });
    return { filename: "migrations.md", content, signals: foundList };
  },
};
