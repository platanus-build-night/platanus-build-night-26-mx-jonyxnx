import { Octokit } from "@octokit/rest";
import fg from "fast-glob";
import simpleGit from "simple-git";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ParsedRepo } from "./url";

export interface RepoMetadata {
  defaultBranch: string;
  description: string | null;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  topics: string[];
  license: string | null;
}

export interface FetchedRepo {
  parsed: Required<ParsedRepo>;
  tempDir: string;
  fileTree: string[];
  metadata: RepoMetadata;
  cleanup: () => Promise<void>;
}

function makeOctokit() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
  });
}

export async function fetchRepo(parsed: ParsedRepo): Promise<FetchedRepo> {
  const octokit = makeOctokit();

  const repoInfo = await octokit.repos
    .get({ owner: parsed.owner, repo: parsed.repo })
    .catch((err) => {
      if (err.status === 404)
        throw new Error(
          `Repo not found or private without GITHUB_TOKEN: ${parsed.owner}/${parsed.repo}`,
        );
      throw err;
    });

  const defaultBranch = repoInfo.data.default_branch;
  const ref = parsed.ref || defaultBranch;

  const langs = await octokit.repos
    .listLanguages({ owner: parsed.owner, repo: parsed.repo })
    .catch(() => ({ data: {} as Record<string, number> }));

  const topics = (repoInfo.data.topics as string[] | undefined) ?? [];

  const tempDir = await mkdtemp(path.join(tmpdir(), "auto-doc-"));
  const cloneUrl = process.env.GITHUB_TOKEN
    ? `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${parsed.owner}/${parsed.repo}.git`
    : `https://github.com/${parsed.owner}/${parsed.repo}.git`;

  const git = simpleGit();
  try {
    await git.clone(cloneUrl, tempDir, ["--depth=1", `--branch=${ref}`]);
  } catch {
    await git.clone(cloneUrl, tempDir, ["--depth=1"]);
  }

  const fileTree = await fg("**/*", {
    cwd: tempDir,
    dot: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.next/**", "**/build/**"],
    followSymbolicLinks: false,
  });

  return {
    parsed: { owner: parsed.owner, repo: parsed.repo, ref },
    tempDir,
    fileTree,
    metadata: {
      defaultBranch,
      description: repoInfo.data.description ?? null,
      language: repoInfo.data.language ?? null,
      languages: langs.data,
      stars: repoInfo.data.stargazers_count ?? 0,
      topics,
      license: repoInfo.data.license?.name ?? null,
    },
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}
