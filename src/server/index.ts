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
app.use("/api/*", cors({
  origin: "https://mission.periorcorp.com",
  credentials: true,
}));

// Rate limit hooks endpoint (60 req/min per IP)
const hookRateLimit = new Map<string, number[]>();
app.use("/api/hooks/*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  const window = hookRateLimit.get(ip) || [];
  const recent = window.filter((t) => now - t < 60000);
  if (recent.length >= 60) {
    return c.json({ error: "rate limited" }, 429);
  }
  recent.push(now);
  hookRateLimit.set(ip, recent);
  await next();
});

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

      let authenticated = false;

      // Wait for connect.challenge, then send connect with required fields
      ocWs.on("message", (data) => {
        const msg = data.toString();
        try {
          const parsed = JSON.parse(msg);

          // Handle connect.challenge → respond with full connect params
          if (!authenticated && parsed.type === "event" && parsed.event === "connect.challenge") {
            const nonce = parsed.payload?.nonce;
            ocWs.send(
              JSON.stringify({
                type: "req",
                id: "__auth__",
                method: "connect",
                params: {
                  minProtocol: 3,
                  maxProtocol: 3,
                  client: {
                    id: "gateway-client",
                    version: "1.0.0",
                    platform: "linux",
                    mode: "backend",
                  },
                  role: "operator",
                  scopes: ["operator.admin"],
                  auth: { token },
                },
              })
            );
            return; // Don't relay challenge to browser
          }

          // Mark authenticated on successful connect response
          if (!authenticated && parsed.type === "res" && parsed.id === "__auth__") {
            if (parsed.ok) {
              authenticated = true;
              console.log("[ws-proxy] Authenticated with OpenClaw");
            } else {
              console.error("[ws-proxy] Auth failed:", JSON.stringify(parsed.error));
            }
            return; // Don't relay auth response to browser
          }
        } catch {
          // Not JSON, relay as-is
        }

        // Relay OpenClaw → Browser
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(msg);
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
