import { serve } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";

const distDir = path.join(import.meta.dir, "..", "dist");

const server = serve({
  hostname: "0.0.0.0",
  port: 4001,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = path.join(distDir, url.pathname);

    // Serve file jika ada
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // Fallback ke index.html untuk SPA routing
    const indexFile = Bun.file(path.join(distDir, "index.html"));
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log("Server running at", server.url.href);
