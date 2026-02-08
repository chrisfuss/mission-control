import { useState, useEffect, useRef } from "react";
import { useOpenClaw } from "@/hooks/use-openclaw";

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export default function Logs() {
  const { client, connected } = useOpenClaw();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!client || !connected) return;

    // Subscribe to log events
    unsubRef.current = client.on("log", (payload) => {
      const entry = payload as LogEntry;
      setLogs((prev) => [...prev.slice(-500), entry]); // Keep last 500
    });

    // Also try to tail logs via RPC
    client.call("logs.tail", { lines: 100 }).catch(() => {});

    return () => {
      unsubRef.current?.();
    };
  }, [client, connected]);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter
    ? logs.filter(
        (l) =>
          l.message?.toLowerCase().includes(filter.toLowerCase()) ||
          l.level?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  const levelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-amber-400";
      case "info":
        return "text-blue-400";
      case "debug":
        return "text-zinc-500";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        <h1 className="text-lg font-bold">Live Logs</h1>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter..."
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 ml-auto">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
        <span className="text-xs text-zinc-600">{filteredLogs.length} entries</span>
      </div>

      <div className="flex-1 overflow-auto font-mono text-xs p-4 bg-zinc-950">
        {filteredLogs.length === 0 && (
          <div className="text-zinc-600 text-center py-12">
            {connected ? "Waiting for log entries..." : "Connect to see logs"}
          </div>
        )}
        {filteredLogs.map((log, i) => (
          <div key={i} className="flex gap-2 py-0.5 hover:bg-zinc-900/50">
            <span className="text-zinc-600 shrink-0 w-20">
              {log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString()
                : ""}
            </span>
            <span className={`shrink-0 w-12 uppercase ${levelColor(log.level)}`}>
              {log.level || "log"}
            </span>
            <span className="text-zinc-300">{log.message || JSON.stringify(log)}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
