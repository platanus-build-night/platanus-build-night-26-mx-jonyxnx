#!/usr/bin/env -S node --import tsx

import path from "node:path";
import process from "node:process";
import simpleGit from "simple-git";
import { RepoContext } from "../lib/core/context";
import { changedTopDirs } from "../lib/core/diff";
import { folderGenerator } from "../lib/core/generators/folder";
import { getLLM, type ProviderName } from "../lib/core/llm";
import { createNotionDocsFromEnv } from "../lib/core/notion";

interface CliOptions {
  dir: string;
  base?: string;
  head?: string;
  owner?: string;
  repo?: string;
  provider?: ProviderName;
  all: boolean;
  dryRun: boolean;
}

function usage(): string {
  return `Usage: kitdoc [options]

Options:
  --dir <path>       Local repository path (default: cwd)
  --base <ref>       Base git ref for changed-folder detection
  --head <ref>       Head git ref for changed-folder detection
  --owner <owner>    Repository owner (default: parsed from origin remote)
  --repo <repo>      Repository name (default: parsed from origin remote)
  --provider <name>  LLM provider: anthropic or openai
  --all              Generate docs for all top-level folders
  --dry-run          Print generated markdown instead of syncing to Notion
  --help             Show this help message`;
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseProvider(value: string): ProviderName {
  if (value === "anthropic" || value === "openai") return value;
  throw new Error(`Unsupported --provider value: ${value}. Expected "anthropic" or "openai".`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dir: process.cwd(),
    all: false,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--dir":
        opts.dir = readValue(argv, i, arg);
        i++;
        break;
      case "--base":
        opts.base = readValue(argv, i, arg);
        i++;
        break;
      case "--head":
        opts.head = readValue(argv, i, arg);
        i++;
        break;
      case "--owner":
        opts.owner = readValue(argv, i, arg);
        i++;
        break;
      case "--repo":
        opts.repo = readValue(argv, i, arg);
        i++;
        break;
      case "--provider":
        opts.provider = parseProvider(readValue(argv, i, arg));
        i++;
        break;
      case "--all":
        opts.all = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/#?]+?)(?:\.git)?(?:[#?].*)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function defaultRepoIdentity(dir: string): Promise<{ owner: string; repo: string }> {
  const git = simpleGit(dir);
  const remoteOutput = await git.remote(["get-url", "origin"]);
  const remoteUrl = typeof remoteOutput === "string" ? remoteOutput.trim() : "";
  const parsed = parseGitHubRemote(remoteUrl);
  if (!parsed) {
    throw new Error("Could not infer --owner/--repo from origin remote. Pass both flags explicitly.");
  }
  return parsed;
}

function assertDiffArgs(opts: CliOptions): asserts opts is CliOptions & { base: string; head: string } {
  if (opts.all) return;
  if (!opts.base || !opts.head) {
    throw new Error("--base and --head are required unless --all is set.");
  }
}

function printDryRun(folder: string, markdown: string): void {
  console.log(`\n--- kitdoc dry-run: ${folder} ---\n`);
  console.log(markdown);
  console.log(`\n--- end ${folder} ---`);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const dir = path.resolve(opts.dir);
  const identity = opts.owner && opts.repo ? { owner: opts.owner, repo: opts.repo } : await defaultRepoIdentity(dir);

  assertDiffArgs(opts);

  const ctx = await RepoContext.fromLocalDir(dir, {
    owner: identity.owner,
    repo: identity.repo,
    ref: opts.head ?? "HEAD",
  });

  const folders = opts.all ? ctx.topDirs() : await changedTopDirs(dir, opts.base, opts.head);
  if (folders.length === 0) {
    console.log("No top-level folders to document.");
    return;
  }

  console.log(`Generating docs for ${folders.length} folder(s): ${folders.join(", ")}`);

  const llm = getLLM(opts.provider);
  const notionTarget = opts.dryRun ? null : createNotionDocsFromEnv();
  const repoPage = notionTarget
    ? await notionTarget.notion.ensureRepoPage(notionTarget.parentPageId, `${identity.owner}/${identity.repo}`)
    : null;

  for (const folder of folders) {
    console.log(`Generating ${folder}...`);
    const result = await folderGenerator(folder).run(ctx, llm);

    if (opts.dryRun) {
      printDryRun(folder, result.content);
      continue;
    }

    if (!notionTarget || !repoPage) {
      throw new Error("Notion target was not initialized.");
    }

    const page = await notionTarget.notion.upsertFolderPage(repoPage.id, folder, result.content);
    console.log(`${page.created ? "Created" : "Updated"} Notion page for ${folder}.`);
  }
}

main().catch((err) => {
  console.error((err as Error).message ?? String(err));
  process.exit(1);
});
