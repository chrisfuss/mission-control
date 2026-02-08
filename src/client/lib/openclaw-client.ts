// OpenClaw Gateway WebSocket Client
// Protocol: JSON-RPC over WebSocket

export interface OCRequest {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface OCResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: unknown;
}

export interface OCEvent {
  type: "event";
  event: string;
  payload: unknown;
  seq?: number;
}

type OCMessage = OCResponse | OCEvent;

export interface Agent {
  id: string;
  identity: { name: string; theme?: string };
  model: { primary: string };
  [key: string]: unknown;
}

export interface Session {
  id: string;
  agentId: string;
  key: string;
  lastActivity?: string;
  [key: string]: unknown;
}

export interface CronJob {
  id: string;
  name?: string;
  schedule: string;
  enabled: boolean;
  agentId?: string;
  lastRun?: string;
  [key: string]: unknown;
}

type EventHandler = (payload: unknown) => void;
type PendingCall = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private pendingCalls = new Map<string, PendingCall>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private _connected = false;
  private _onStatusChange: ((connected: boolean) => void) | null = null;

  constructor(
    private url: string,
    private requestTimeout = 30000
  ) {}

  get connected() {
    return this._connected;
  }

  set onStatusChange(handler: ((connected: boolean) => void) | null) {
    this._onStatusChange = handler;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this._connected = true;
          this._onStatusChange?.(true);
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (evt) => {
          try {
            const msg: OCMessage = JSON.parse(evt.data);
            if (msg.type === "res") {
              const pending = this.pendingCalls.get(msg.id);
              if (pending) {
                clearTimeout(pending.timeout);
                this.pendingCalls.delete(msg.id);
                if (msg.ok) {
                  pending.resolve(msg.payload);
                } else {
                  pending.reject(msg.error);
                }
              }
            } else if (msg.type === "event") {
              const handlers = this.eventHandlers.get(msg.event);
              handlers?.forEach((h) => h(msg.payload));
              // Also fire wildcard handlers
              const wildcard = this.eventHandlers.get("*");
              wildcard?.forEach((h) => h({ event: msg.event, payload: msg.payload }));
            }
          } catch {
            // Ignore malformed messages
          }
        };

        this.ws.onclose = () => {
          this._connected = false;
          this._onStatusChange?.(false);
          this.scheduleReconnect();
        };

        this.ws.onerror = () => {
          if (!this._connected) reject(new Error("WebSocket connection failed"));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this._connected = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect().catch(() => {});
    }, this.reconnectDelay);
  }

  // Send an RPC call and wait for response
  call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("Not connected"));
      }

      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, this.requestTimeout);

      this.pendingCalls.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
      });

      this.ws.send(JSON.stringify({ type: "req", id, method, params } satisfies OCRequest));
    });
  }

  // Subscribe to events
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.eventHandlers.get(event)?.delete(handler);
  }

  // Convenience API methods
  async listAgents(): Promise<Agent[]> {
    const result = await this.call<{ agents: Agent[] }>("agents.list");
    return result?.agents || [];
  }

  async listSessions(agentId?: string): Promise<Session[]> {
    const params = agentId ? { agentId } : {};
    const result = await this.call<{ sessions: Session[] }>("sessions.list", params);
    return result?.sessions || [];
  }

  async getSessionPreview(sessionId: string) {
    return this.call("sessions.preview", { sessionId });
  }

  async getSessionUsage(sessionId: string) {
    return this.call("sessions.usage", { sessionId });
  }

  async getChatHistory(sessionId: string) {
    return this.call("chat.history", { sessionId });
  }

  async sendChat(agentId: string, message: string, sessionId?: string) {
    return this.call("chat.send", { agentId, message, sessionId });
  }

  async listCronJobs(): Promise<CronJob[]> {
    const result = await this.call<{ crons: CronJob[] }>("cron.list");
    return result?.crons || [];
  }

  async triggerCron(cronId: string) {
    return this.call("cron.run", { id: cronId });
  }

  async getCronRuns(cronId: string) {
    return this.call("cron.runs", { id: cronId });
  }

  async getStatus() {
    return this.call("status");
  }

  async getHealth() {
    return this.call("health");
  }

  async getConfig() {
    return this.call("config.get");
  }

  async getChannelStatus() {
    return this.call("channels.status");
  }
}
