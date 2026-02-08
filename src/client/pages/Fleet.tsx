import { useAgents, useGatewayStatus } from "@/hooks/use-openclaw";
import type { Agent } from "@/lib/openclaw-client";

const agentGroups: Record<string, { label: string; color: string; agents: string[] }> = {
  cloud: {
    label: "Cloud LLM",
    color: "bg-blue-500/10 border-blue-500/30",
    agents: ["henry-claude", "henry-gemini", "henry-gpt4"],
  },
  local: {
    label: "Local LLM",
    color: "bg-amber-500/10 border-amber-500/30",
    agents: ["henry-llama70", "henry-deepseek", "henry-coder"],
  },
  squad: {
    label: "Agent Squad",
    color: "bg-purple-500/10 border-purple-500/30",
    agents: ["henry-researcher", "henry-writer", "henry-finance", "henry-social", "henry-strategist"],
  },
};

function getModelBadge(model: string) {
  if (model.includes("claude")) return { label: "Claude", color: "bg-orange-500/20 text-orange-300" };
  if (model.includes("gemini")) return { label: "Gemini", color: "bg-blue-500/20 text-blue-300" };
  if (model.includes("gpt")) return { label: "GPT-4", color: "bg-green-500/20 text-green-300" };
  if (model.includes("llama")) return { label: "Llama 70B", color: "bg-amber-500/20 text-amber-300" };
  if (model.includes("deepseek")) return { label: "DeepSeek", color: "bg-cyan-500/20 text-cyan-300" };
  if (model.includes("qwen")) return { label: "Qwen 32B", color: "bg-pink-500/20 text-pink-300" };
  return { label: model.split("/").pop() || model, color: "bg-zinc-500/20 text-zinc-300" };
}

function AgentCard({ agent }: { agent: Agent }) {
  const badge = getModelBadge(agent.model?.primary || "");
  const isLocal = (agent.model?.primary || "").includes("ollama");

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-zinc-100">{agent.identity?.name || agent.id}</h3>
          <p className="text-sm text-zinc-500 mt-0.5">{agent.identity?.theme || agent.id}</p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" title="Available" />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isLocal ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
          }`}
        >
          {isLocal ? "Local" : "Cloud"}
        </span>
      </div>
    </div>
  );
}

export default function Fleet() {
  const { data: agents, isLoading, error } = useAgents();
  const { data: status } = useGatewayStatus();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agent Fleet</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {agents?.length || 0} agents configured
          </p>
        </div>
        {status != null && (
          <div className="text-right text-sm text-zinc-500">
            <p>Gateway: <span className="text-emerald-400">Online</span></p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-zinc-500 text-center py-12">Loading agents...</div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
          Failed to load agents: {String(error)}
        </div>
      )}

      {agents && Object.entries(agentGroups).map(([key, group]) => {
        const groupAgents = agents.filter((a) => group.agents.includes(a.id));
        if (groupAgents.length === 0) return null;

        return (
          <div key={key} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {group.label}
              </h2>
              <span className="text-xs text-zinc-600">{groupAgents.length} agents</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Show any agents not in predefined groups */}
      {agents && (() => {
        const knownIds = Object.values(agentGroups).flatMap((g) => g.agents);
        const unknown = agents.filter((a) => !knownIds.includes(a.id));
        if (unknown.length === 0) return null;
        return (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Other
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unknown.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
