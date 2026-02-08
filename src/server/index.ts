import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { WebSocketServer, WebSocket } from "ws";
import { tasksRoutes } from "./routes/tasks.js";
import { hooksRoutes } from "./routes/hooks.js";
import { eventsRoutes } from "./routes/events.js";
import { proxyRoutes } from "./routes/proxy.js";
import { initDb } from "./db/schema.js";

const app = new Hono();

// Initialize database
initDb();

// Middleware
app.use("*", logger());
app.use("/api/*", cors());

// API routes
app.route("/api/tasks", tasksRoutes);
app.route("/api/hooks", hooksRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/proxy", proxyRoutes);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Serve React SPA (production)
app.use("/*", serveStatic({ root: "./dist/client" }));
app.get("/*", serveStatic({ root: "./dist/client", path: "index.html" }));

const port = parseInt(process.env.PORT || "3000");
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Mission Control running at http://localhost:${info.port}`);
});

// WebSocket proxy: browser connects to /ws, we proxy to OpenClaw Gateway
const wss = new WebSocketServer({ noServer: true });
const ocUrl = process.env.OPENCLAW_WS_URL || "ws://localhost:18789";
const token = process.env.GATEWAY_TOKEN || "";

server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws") {
    wss.handleUpgrade(req, socket, head, (clientWs) => {
      // Connect to OpenClaw Gateway
      const ocWs = new WebSocket(ocUrl);

      ocWs.on("open", () => {
        // Authenticate with OpenClaw
        ocWs.send(
          JSON.stringify({
            type: "req",
            id: "__auth__",
            method: "connect",
            params: { auth: { token } },
          })
        );
      });

      // Relay OpenClaw → Browser
      ocWs.on("message", (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      });

      // Relay Browser → OpenClaw
      clientWs.on("message", (data) => {
        if (ocWs.readyState === WebSocket.OPEN) {
          ocWs.send(data.toString());
        }
      });

      // Cleanup
      clientWs.on("close", () => ocWs.close());
      ocWs.on("close", () => clientWs.close());
      ocWs.on("error", (err) =>
        console.error("[ws-proxy] OpenClaw error:", err.message)
      );
    });
  } else {
    socket.destroy();
  }
});

console.log(`WebSocket proxy ready: /ws → ${ocUrl}`);
