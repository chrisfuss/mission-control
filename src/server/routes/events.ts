import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

export const eventsRoutes = new Hono();

// SSE clients
const clients = new Set<(data: string) => void>();

export function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  for (const send of clients) {
    try {
      send(msg);
    } catch {
      clients.delete(send);
    }
  }
}

// SSE endpoint for real-time events
eventsRoutes.get("/stream", (c) => {
  return streamSSE(c, async (stream) => {
    const send = (data: string) => {
      stream.writeSSE({ data, event: "message" });
    };

    clients.add(send);
    console.log(`[sse] Client connected (${clients.size} total)`);

    // Send heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        stream.writeSSE({ data: '{"type":"heartbeat"}', event: "ping" });
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    // Keep connection open
    stream.onAbort(() => {
      clients.delete(send);
      clearInterval(heartbeat);
      console.log(`[sse] Client disconnected (${clients.size} total)`);
    });

    // Block until abort
    await new Promise(() => {});
  });
});
