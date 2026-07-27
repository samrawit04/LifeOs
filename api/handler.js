// Vercel serverless function entry point for TanStack Start SSR
// This file is at the repo root's api/ directory and is auto-discovered by Vercel.
// At build time, Vercel runs `npm run build` first which populates dist/server/server.js,
// then this file is deployed as a Node.js serverless function.

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the built server entry relative to this file's location
const serverPath = path.resolve(__dirname, "../dist/server/server.js");

let handlerPromise;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = import(serverPath).then((m) => m.default ?? m);
  }
  return handlerPromise;
}

export default async function handler(req, res) {
  const server = await getHandler();

  // Convert Node.js req/res to Web Request/Response (Vercel Edge/Node runtime)
  if (typeof server.fetch === "function") {
    // Web standard fetch handler (what TanStack Start exports)
    const url = `https://${req.headers.host}${req.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value);
    }

    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? new ReadableStream({
            start(controller) {
              req.on("data", (chunk) => controller.enqueue(chunk));
              req.on("end", () => controller.close());
              req.on("error", (err) => controller.error(err));
            },
          })
        : undefined;

    const request = new Request(url, { method: req.method, headers, body });

    try {
      const response = await server.fetch(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err) {
      console.error("[SSR Error]", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  } else {
    // Fallback: server is already a Node.js handler
    return server(req, res);
  }
}
