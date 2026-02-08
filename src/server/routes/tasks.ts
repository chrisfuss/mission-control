import { Hono } from "hono";
import { getDb } from "../db/schema.js";

export const tasksRoutes = new Hono();

// List tasks, optionally filtered by status
tasksRoutes.get("/", (c) => {
  const status = c.req.query("status");
  const db = getDb();

  const tasks = status
    ? db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY position, created_at").all(status)
    : db.prepare("SELECT * FROM tasks ORDER BY status, position, created_at").all();

  return c.json(tasks);
});

// Get single task with comments
tasksRoutes.get("/:id", (c) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(c.req.param("id"));
  if (!task) return c.json({ error: "Not found" }, 404);

  const comments = db
    .prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at")
    .all(c.req.param("id"));

  return c.json({ ...task, comments });
});

// Create task
tasksRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const maxPos = db
    .prepare("SELECT COALESCE(MAX(position), 0) + 1 as next FROM tasks WHERE status = ?")
    .get(body.status || "inbox") as { next: number };

  const result = db
    .prepare(
      "INSERT INTO tasks (title, description, status, agent_id, priority, position) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
    )
    .get(
      body.title,
      body.description || "",
      body.status || "inbox",
      body.agent_id || null,
      body.priority || "medium",
      maxPos.next
    );

  return c.json(result, 201);
});

// Update task
tasksRoutes.patch("/:id", async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of ["title", "description", "status", "agent_id", "priority", "position"] as const) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(c.req.param("id"));

  const result = db
    .prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ? RETURNING *`)
    .get(...values);

  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});

// Delete task
tasksRoutes.delete("/:id", (c) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(c.req.param("id"));
  if (result.changes === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// Add comment to task
tasksRoutes.post("/:id/comments", async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const result = db
    .prepare("INSERT INTO task_comments (task_id, author, content) VALUES (?, ?, ?) RETURNING *")
    .get(c.req.param("id"), body.author || "user", body.content);

  return c.json(result, 201);
});
