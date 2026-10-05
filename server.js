/**
 * GoDaddy Node.js Hosting entrypoint.
 * Serves the static Next.js export from /out on process.env.PORT.
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { pipeline } = require("stream");

const port = Number(process.env.PORT) || 3000;
const root = path.resolve(__dirname, "out");

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeResolve(urlPath) {
  let pathname = decodeURIComponent((urlPath || "/").split("?")[0].split("#")[0]);
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.includes("\0")) return null;

  // Next export uses trailingSlash folders: /dashboard/ -> dashboard/index.html
  if (pathname.endsWith("/")) {
    pathname = `${pathname}index.html`;
  } else if (!path.extname(pathname)) {
    pathname = `${pathname}/index.html`;
  }

  const full = path.normalize(path.join(root, pathname));
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}

function send(res, status, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(status, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  pipeline(fs.createReadStream(filePath), res, () => {});
}

const server = http.createServer((req, res) => {
  const filePath = safeResolve(req.url || "/");
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    send(res, 200, filePath);
    return;
  }

  const notFound = path.join(root, "404.html");
  if (fs.existsSync(notFound)) {
    send(res, 404, notFound);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(port, () => {
  console.log(`Amore Global Travels listening on ${port}`);
});
