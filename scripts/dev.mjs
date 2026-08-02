import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicRoot = resolve(root, "public");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function existingFile(pathname) {
  const relative = pathname.replace(/^\/+/, "");
  const candidates = [resolve(publicRoot, relative), resolve(root, relative)];

  for (const candidate of candidates) {
    if (!candidate.startsWith(root)) continue;
    try {
      await access(candidate);
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://internal.invalid");
    const pathname = decodeURIComponent(requestUrl.pathname);
    const requestedFile = pathname === "/" ? resolve(root, "index.html") : await existingFile(pathname);
    const file = requestedFile || resolve(root, "index.html");
    const contentType = mimeTypes[extname(file)] || "application/octet-stream";

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("开发服务器读取文件失败");
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Jackson 工作台开发服务器已启动，端口 ${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
