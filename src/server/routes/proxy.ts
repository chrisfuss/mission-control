import { Hono } from "hono";

export const proxyRoutes = new Hono();

const ocUrl = process.env.OPENCLAW_WS_URL || "ws://localhost:18789";

// Expose the OpenClaw connection config (no token exposed)
proxyRoutes.get("/config", (c) => {
  return c.json({
    wsUrl: "/ws",
    features: {
      kanban: true,
      activityFeed: true,
      hooks: true,
    },
  });
});
