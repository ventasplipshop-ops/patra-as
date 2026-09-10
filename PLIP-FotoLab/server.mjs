import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(packageRoot, "site");
const port = Number(process.env.PORT || 8080);
const types = { ".html": "text/html; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".md": "text/markdown; charset=UTF-8" };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filename = path.resolve(root, relative);
  if (!filename.startsWith(root + path.sep) || !existsSync(filename) || !statSync(filename).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" }); response.end("No encontrado"); return;
  }
  response.writeHead(200, {
    "Content-Type": types[path.extname(filename).toLowerCase()] || "application/octet-stream",
    "Cache-Control": path.extname(filename) === ".html" ? "no-store" : "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  });
  createReadStream(filename).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`PLIP FotoLab: http://127.0.0.1:${port}`));
