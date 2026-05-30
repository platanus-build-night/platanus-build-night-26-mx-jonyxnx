import { runOrchestrator } from "@/lib/core/orchestrator";
import { zipResults } from "@/lib/core/zip";
import { createJob, setJobArtifact } from "@/lib/server/jobs";
import type { ProviderName } from "@/lib/core/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  let body: { url?: string; provider?: ProviderName; only?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  if (!body.url) return new Response("Missing url", { status: 400 });

  const jobId = createJob();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseLine(event, data)));

      send("job", { jobId });

      try {
        const results = [];
        for await (const evt of runOrchestrator({
          url: body.url!,
          provider: body.provider,
          only: body.only,
        })) {
          send(evt.type, evt);
          if (evt.type === "generator:done") results.push(evt.result);
          if (evt.type === "complete") {
            const zip = await zipResults(evt.results);
            setJobArtifact(jobId, zip, evt.results);
            send("download", { jobId, url: `/api/download/${jobId}` });
          }
        }
      } catch (err) {
        send("error", { error: (err as Error).message ?? String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
