import { useSessions, useAgents } from "@/hooks/use-openclaw";

export default function Sessions() {
  const { data: sessions, isLoading, error } = useSessions();
  const { data: agents } = useAgents();

  const agentMap = new Map(agents?.map((a) => [a.id, a]) || []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sessions</h1>

      {isLoading && <div className="text-zinc-500 text-center py-12">Loading sessions...</div>}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
          Failed to load sessions: {String(error)}
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <div className="text-zinc-500 text-center py-12">No sessions found</div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => {
            const agent = agentMap.get(session.agentId);
            return (
              <div
                key={session.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-100">
                      {session.key || session.id}
                    </p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      Agent: {agent?.identity?.name || session.agentId || "Unknown"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    {session.lastActivity && (
                      <p>{new Date(session.lastActivity).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
