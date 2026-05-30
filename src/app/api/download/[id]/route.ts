import { getJob } from "@/lib/server/jobs";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job?.zip) return new Response("Not found or expired", { status: 404 });

  return new Response(new Uint8Array(job.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="auto-doc-${id}.zip"`,
      "Content-Length": String(job.zip.byteLength),
    },
  });
}
