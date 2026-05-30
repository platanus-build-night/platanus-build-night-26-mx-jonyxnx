export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^\uFEFF?\s*#\s+[^\n]*(?:\n\s*)?/, "");
}
