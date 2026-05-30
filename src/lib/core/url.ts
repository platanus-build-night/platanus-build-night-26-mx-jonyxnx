export interface ParsedRepo {
  owner: string;
  repo: string;
  ref?: string;
}

export function parseGitHubUrl(input: string): ParsedRepo {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }
  if (!/github\.com$/i.test(url.hostname)) {
    throw new Error(`Not a github.com URL: ${input}`);
  }
  const parts = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "").split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`URL must include owner and repo: ${input}`);
  }
  const [owner, repo, kind, ...rest] = parts;
  const ref = kind === "tree" || kind === "blob" ? rest.join("/") || undefined : undefined;
  return { owner, repo, ref };
}
