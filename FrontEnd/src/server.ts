import { serve } from "bun";
import path from "node:path";

const distDir = path.join(import.meta.dir, "..", "dist");
// URL internal backend di jaringan Docker (default http://backend:3000)
const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:3000";

const server = serve({
  hostname: "0.0.0.0",
  port: 4001,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Reverse Proxy: Setiap request /api/* diforward ke backend internal
    if (url.pathname.startsWith("/api")) {
      const targetUrl = new URL(url.pathname + url.search, BACKEND_INTERNAL_URL);
      
      const reqHeaders = new Headers(req.headers);
      reqHeaders.set("host", targetUrl.host);

      return fetch(targetUrl.toString(), {
        method: req.method,
        headers: reqHeaders,
        body: req.body,
        duplex: "half",
      } as any);
    }

    // 2. Serve Static File jika ada di dist/
    let filePath = path.join(distDir, url.pathname);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // 3. Fallback ke index.html untuk SPA routing
    const indexFile = Bun.file(path.join(distDir, "index.html"));
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log("Server running at", server.url.href);
