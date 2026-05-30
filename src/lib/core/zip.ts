import archiver from "archiver";
import { PassThrough } from "node:stream";
import type { GeneratorResult } from "./generators";

export async function zipResults(results: GeneratorResult[]): Promise<Buffer> {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const out = new PassThrough();
  const chunks: Buffer[] = [];

  out.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  const closed = new Promise<void>((resolve, reject) => {
    out.on("end", () => resolve());
    out.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(out);
  for (const r of results) {
    archive.append(r.content, { name: r.filename });
  }
  await archive.finalize();
  await closed;
  return Buffer.concat(chunks);
}
