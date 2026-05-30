import simpleGit from "simple-git";

const IGNORED_TOP_DIRS = new Set([".git", ".next", "build", "dist", "node_modules"]);

export async function changedTopDirs(dir: string, baseRef: string, headRef: string): Promise<string[]> {
  const git = simpleGit(dir);
  const output = await git.diff(["--name-only", `${baseRef}...${headRef}`]);
  const dirs = new Set<string>();

  for (const changedPath of output.split(/\r?\n/)) {
    const [topDir, ...rest] = changedPath.trim().split("/");
    if (!topDir || rest.length === 0 || IGNORED_TOP_DIRS.has(topDir)) continue;
    dirs.add(topDir);
  }

  return [...dirs].sort();
}
