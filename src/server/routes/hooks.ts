import { Hono } from "hono";
import { getDb } from "../db/schema.js";
import { broadcast } from "./events.js";

export const hooksRoutes = new Hono();

// Receive events from OpenClaw hooks
hooksRoutes.post("/event", async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const { event, payload, ts } = body;

  // Log the activity
  db.prepare(
    "INSERT INTO activity_log (event, agent_id, session_id, summary, payload) VALUES (?, ?, ?, ?, ?)"
  ).run(
    event,
    payload?.agentId || payload?.agent_id || null,
    payload?.sessionId || payload?.session_id || null,
    payload?.summary || event,
    JSON.stringify(payload)
  );

  // Auto-update task status based on agent events
  if (event === "agent:run:start" && payload?.agentId) {
    db.prepare(
      "UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE agent_id = ? AND status = 'assigned'"
    ).run(payload.agentId);
  }

  if (event === "agent:run:end" && payload?.agentId) {
    db.prepare(
      "UPDATE tasks SET status = 'done', updated_at = datetime('now') WHERE agent_id = ? AND status = 'in_progress'"
    ).run(payload.agentId);
  }

  if (event === "agent:run:error" && payload?.agentId) {
    db.prepare(
      "UPDATE tasks SET status = 'review', updated_at = datetime('now') WHERE agent_id = ? AND status = 'in_progress'"
    ).run(payload.agentId);
  }

  // Broadcast to SSE clients
  broadcast({
    type: "hook",
    event,
    agentId: payload?.agentId,
    timestamp: ts || Date.now(),
    summary: payload?.summary || event,
  });

  return c.json({ ok: true });
});

// Get activity log
hooksRoutes.get("/activity", (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const agentId = c.req.query("agent_id");
  const db = getDb();

  const activities = agentId
    ? db
        .prepare(
          "SELECT * FROM activity_log WHERE agent_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
        )
        .all(agentId, limit, offset)
    : db
        .prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(limit, offset);

  return c.json(activities);
});
