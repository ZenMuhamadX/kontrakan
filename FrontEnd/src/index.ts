import { serve } from "bun";
import index from "./index.html";

// URL backend untuk dev lokal (default http://localhost:3000)
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:3000";

const server = serve({
  hostname: "0.0.0.0",
  port: 4001,
  reusePort: true,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Reverse Proxy ke backend untuk setiap endpoint /api/*
    if (url.pathname.startsWith("/api")) {
      const targetUrl = new URL(url.pathname + url.search, BACKEND_URL);
      const reqHeaders = new Headers(req.headers);
      reqHeaders.set("host", targetUrl.host);

      return fetch(targetUrl.toString(), {
        method: req.method,
        headers: reqHeaders,
        body: req.body,
        duplex: "half",
      } as any);
    }
  },
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,
    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log("⚡ [DEV] Frontend running at", `http://localhost:${server.port}`);