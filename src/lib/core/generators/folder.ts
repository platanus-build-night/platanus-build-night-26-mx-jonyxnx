import path from "node:path";
import type { Generator } from "./index";
import { SYSTEM_PROMPT, buildFileBlocks, notDetectedStub } from "./index";

const SAMPLE_LIMIT = 18;
const FILE_TREE_LIMIT = 240;

const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".php",
  ".css",
  ".scss",
  ".md",
  ".mdx",
]);

const testLike = /(^|\/)(__tests__|test|tests|spec|fixtures|mocks)(\/|$)|\.(test|spec)\./;
const entryLike = /(^|\/)(README(\.[\w]+)?|package\.json|index\.[\w]+|main\.[\w]+|app\.[\w]+|route\.[\w]+|layout\.[\w]+)$/i;
const configLike = /(^|\/)(tsconfig|next\.config|vite\.config|webpack\.config|tailwind\.config|postcss\.config|eslint\.config|\.eslintrc|\.prettierrc)/i;

function normalizeFolder(folder: string): string {
  return folder.replace(/^\/+|\/+$/g, "");
}

function folderFileTree(files: string[], maxEntries = FILE_TREE_LIMIT): string {
  const list = files.slice(0, maxEntries);
  const more = files.length - list.length;
  return list.join("\n") + (more > 0 ? `\n... (${more} more files)` : "");
}

function pickRepresentativeFiles(files: string[]): string[] {
  const sourceFiles = files.filter((file) => SOURCE_EXTS.has(path.extname(file))).filter((file) => !testLike.test(file));

  return [...sourceFiles]
    .sort((a, b) => {
      const aEntry = entryLike.test(a) ? 0 : 1;
      const bEntry = entryLike.test(b) ? 0 : 1;
      if (aEntry !== bEntry) return aEntry - bEntry;

      const aConfig = configLike.test(a) ? 0 : 1;
      const bConfig = configLike.test(b) ? 0 : 1;
      if (aConfig !== bConfig) return aConfig - bConfig;

      const aDepth = a.split("/").length;
      const bDepth = b.split("/").length;
      if (aDepth !== bDepth) return aDepth - bDepth;

      return a.length - b.length || a.localeCompare(b);
    })
    .slice(0, SAMPLE_LIMIT);
}

export function folderGenerator(folder: string): Generator {
  const normalizedFolder = normalizeFolder(folder);

  return {
    id: `folder:${normalizedFolder}`,
    title: normalizedFolder,
    filename: `${normalizedFolder}.md`,
    async run(ctx, llm) {
      const files = ctx.fileTree.filter((file) => file === normalizedFolder || file.startsWith(`${normalizedFolder}/`)).sort();

      if (files.length === 0) {
        return {
          filename: `${normalizedFolder}.md`,
          content: notDetectedStub(normalizedFolder, [`${normalizedFolder}/**/*`]),
          signals: [],
        };
      }

      const sampleFiles = pickRepresentativeFiles(files);
      const fileBlocks = await buildFileBlocks(ctx, sampleFiles, 12 * 1024);

      const user = `Write focused documentation for the \`${normalizedFolder}\` folder in \`${ctx.owner}/${ctx.repo}\`.

Folder file tree (truncated):
\`\`\`
${folderFileTree(files)}
\`\`\`

Representative files:

${fileBlocks || "(no representative source files found)"}

Produce internal folder documentation:
1. \`# ${normalizedFolder}\` heading.
2. \`## Purpose\` - what this folder appears to own.
3. \`## Structure\` - important subfolders and key files.
4. \`## Key modules and responsibilities\` - explain the main files/classes/functions visible from the samples.
5. \`## Connections\` - how this folder appears to interact with the rest of the repo.
6. \`## Change map\` - where a developer or coding agent should start for common changes in this folder.
7. \`## Agent notes\` - practical cautions, verification hints, and unknowns that should be checked before editing.`;

      const content = await llm.complete({ system: SYSTEM_PROMPT, user, maxTokens: 4500 });
      return { filename: `${normalizedFolder}.md`, content, signals: sampleFiles };
    },
  };
}
