import { createServer } from "node:http";
import { Renderer } from "./renderer.js";
import { tokenMatches } from "./policy.js";

const token = process.env.RENDER_SERVICE_TOKEN;
if (!token) throw new Error("RENDER_SERVICE_TOKEN is required; an unauthenticated renderer is an open proxy");

const port = Number(process.env.PORT ?? 8080);
const concurrency = Math.max(1, Math.min(Number(process.env.RENDER_CONCURRENCY ?? 2), 8));
const renderer = new Renderer({
  ...(process.env.RENDER_TIMEOUT_MS ? { timeoutMs: Number(process.env.RENDER_TIMEOUT_MS) } : {}),
});

let active = 0;

const server = createServer(async (request, response) => {
  const send = (status: number, body: unknown) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  };

  if (request.method === "GET" && request.url === "/health") return send(200, { ok: true, active, concurrency });
  if (request.method !== "POST" || request.url !== "/render") return send(404, { error: "Not found" });
  if (!tokenMatches(request.headers.authorization?.replace(/^Bearer\s+/i, ""), token)) return send(401, { error: "Unauthorized" });
  // Shedding load is better than queueing behind Chromium and timing out the caller.
  if (active >= concurrency) return send(503, { error: "Renderer is at capacity" });

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
    if (Buffer.concat(chunks).length > 8_192) return send(413, { error: "Request body is too large" });
  }

  let target: unknown;
  try {
    target = (JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as { url?: unknown }).url;
  } catch {
    return send(400, { error: "The request body must be JSON" });
  }

  active += 1;
  try {
    send(200, await renderer.render(String(target ?? "")));
  } catch (error) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 500;
    send(Number.isFinite(status) ? status : 500, { error: error instanceof Error ? error.message : String(error) });
  } finally {
    active -= 1;
  }
});

server.listen(port, () => console.log(`[missa-render-service] listening on ${port}; concurrency=${concurrency}`));

async function shutdown(signal: string): Promise<void> {
  console.log(`[missa-render-service] received ${signal}; shutting down`);
  server.close();
  await renderer.close();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
