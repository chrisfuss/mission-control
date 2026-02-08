import { useQuery } from "@tanstack/react-query";

interface ActivityEntry {
  id: number;
  event: string;
  agent_id: string | null;
  session_id: string | null;
  summary: string | null;
  created_at: string;
}

export default function Usage() {
  const { data: activities, isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ["activity"],
    queryFn: () => fetch("/api/hooks/activity?limit=100").then((r) => r.json()),
    refetchInterval: 15_000,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Usage & Activity</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-500">Total Events (24h)</p>
          <p className="text-3xl font-bold text-zinc-100 mt-1">
            {activities?.length || 0}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-500">Active Agents</p>
          <p className="text-3xl font-bold text-zinc-100 mt-1">
            {new Set(activities?.map((a) => a.agent_id).filter(Boolean)).size || 0}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-500">Latest Activity</p>
          <p className="text-sm text-zinc-300 mt-2">
            {activities?.[0]?.summary || "No activity yet"}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Activity Feed</h2>

      {isLoading && <div className="text-zinc-500 text-center py-12">Loading activity...</div>}

      {activities && activities.length === 0 && (
        <div className="text-zinc-500 text-center py-12">
          No activity recorded yet. Events will appear here when agents run via hooks.
        </div>
      )}

      {activities && activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    {entry.event}
                  </span>
                  {entry.agent_id && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {entry.agent_id}
                    </span>
                  )}
                </div>
                {entry.summary && (
                  <p className="text-xs text-zinc-500 mt-0.5">{entry.summary}</p>
                )}
              </div>
              <span className="text-xs text-zinc-600 shrink-0">
                {new Date(entry.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
