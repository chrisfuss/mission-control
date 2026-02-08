import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  agent_id: string | null;
  priority: string;
  position: number;
  created_at: string;
  updated_at: string;
}

const columns = [
  { id: "inbox", label: "Inbox", color: "border-zinc-600" },
  { id: "assigned", label: "Assigned", color: "border-blue-500" },
  { id: "in_progress", label: "In Progress", color: "border-amber-500" },
  { id: "review", label: "Review", color: "border-purple-500" },
  { id: "done", label: "Done", color: "border-emerald-500" },
];

function TaskCard({
  task,
  onMove,
}: {
  task: Task;
  onMove: (taskId: string, newStatus: string) => void;
}) {
  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-300",
    high: "bg-orange-500/20 text-orange-300",
    medium: "bg-zinc-500/20 text-zinc-300",
    low: "bg-zinc-700/20 text-zinc-500",
  };

  const nextStatus: Record<string, string> = {
    inbox: "assigned",
    assigned: "in_progress",
    in_progress: "review",
    review: "done",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors cursor-default">
      <p className="text-sm font-medium text-zinc-100">{task.title}</p>
      {task.description && (
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          {task.agent_id && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              {task.agent_id}
            </span>
          )}
        </div>
        {nextStatus[task.status] && (
          <button
            onClick={() => onMove(task.id, nextStatus[task.status])}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            title={`Move to ${nextStatus[task.status]}`}
          >
            &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

export default function Board() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => fetch("/api/tasks").then((r) => r.json()),
    refetchInterval: 10_000,
  });

  const createTask = useMutation({
    mutationFn: (title: string) =>
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewTitle("");
    },
  });

  const moveTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Task Board</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) createTask.mutate(newTitle.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New task..."
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded transition-colors"
          >
            Add
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-center py-12">Loading tasks...</div>
      ) : (
        <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[220px]">
                <div
                  className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}
                >
                  <h3 className="text-sm font-semibold text-zinc-300">{col.label}</h3>
                  <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMove={(id, status) => moveTask.mutate({ taskId: id, status })}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-4">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
