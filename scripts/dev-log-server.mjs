import { appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.COPY_TO_MD_DEBUG_PORT || "47321");
const LOG_FILE = resolve(
  __dirname,
  "..",
  process.env.COPY_TO_MD_DEBUG_LOG_FILE || "tmp/debug-log.jsonl",
);

await mkdir(dirname(LOG_FILE), { recursive: true });
await rm(LOG_FILE, { force: true });
await writeFile(
  LOG_FILE,
  `${JSON.stringify({
    event: "session-start",
    pid: process.pid,
    timestamp: new Date().toISOString(),
  })}\n`,
);

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ logFile: LOG_FILE, ok: true, port: PORT }));
    return;
  }

  if (request.method !== "POST" || request.url !== "/log") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const chunks = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    await appendFile(LOG_FILE, `${JSON.stringify(payload)}\n`);

    response.writeHead(204);
    response.end();
  } catch (error) {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Invalid log payload",
      }),
    );
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`copy-to-md debug log server listening on http://127.0.0.1:${PORT}`);
  console.log(`writing logs to ${LOG_FILE}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}
