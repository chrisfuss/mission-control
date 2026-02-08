import { useCronJobs, useOpenClaw } from "@/hooks/use-openclaw";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function Scheduler() {
  const { client } = useOpenClaw();
  const queryClient = useQueryClient();
  const { data: cronJobs, isLoading, error } = useCronJobs();

  const triggerCron = useMutation({
    mutationFn: (cronId: string) => client!.triggerCron(cronId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cron-jobs"] }),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scheduler</h1>

      {isLoading && <div className="text-zinc-500 text-center py-12">Loading cron jobs...</div>}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
          Failed to load cron jobs: {String(error)}
        </div>
      )}

      {cronJobs && cronJobs.length === 0 && (
        <div className="text-zinc-500 text-center py-12">No scheduled jobs found</div>
      )}

      {cronJobs && cronJobs.length > 0 && (
        <div className="space-y-3">
          {cronJobs.map((cron) => (
            <div
              key={cron.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      cron.enabled ? "bg-emerald-500" : "bg-zinc-600"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-zinc-100">{cron.name || cron.id}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                        {cron.schedule}
                      </code>
                      {cron.agentId && (
                        <span className="ml-2">Agent: {cron.agentId}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cron.lastRun && (
                    <span className="text-xs text-zinc-500">
                      Last: {new Date(cron.lastRun).toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={() => triggerCron.mutate(cron.id)}
                    disabled={triggerCron.isPending}
                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs px-3 py-1.5 rounded transition-colors"
                  >
                    {triggerCron.isPending ? "Running..." : "Run Now"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
