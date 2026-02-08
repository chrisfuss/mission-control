import { Routes, Route, NavLink } from "react-router-dom";
import { useOpenClaw } from "@/hooks/use-openclaw";
import Fleet from "@/pages/Fleet";
import Board from "@/pages/Board";
import Sessions from "@/pages/Sessions";
import Chat from "@/pages/Chat";
import Scheduler from "@/pages/Scheduler";
import Logs from "@/pages/Logs";
import Usage from "@/pages/Usage";

const navItems = [
  { to: "/", label: "Fleet", icon: "grid" },
  { to: "/board", label: "Board", icon: "kanban" },
  { to: "/sessions", label: "Sessions", icon: "messages" },
  { to: "/chat", label: "Chat", icon: "message" },
  { to: "/scheduler", label: "Scheduler", icon: "clock" },
  { to: "/logs", label: "Logs", icon: "terminal" },
  { to: "/usage", label: "Usage", icon: "chart" },
];

function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    grid: "M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zM3 14h7v7H3z",
    kanban: "M3 3h4v18H3zm7 0h4v12h-4zm7 0h4v16h-4z",
    messages: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    message: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4.2 2.5",
    terminal: "M4 17l6-6-6-6m8 14h8",
    chart: "M18 20V10M12 20V4M6 20v-6",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d={icons[icon] || icons.grid} />
    </svg>
  );
}

export default function App() {
  const { connected } = useOpenClaw();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-zinc-100">Mission Control</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
            />
            <span className="text-xs text-zinc-400">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex-1 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 border-r-2 border-indigo-500"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`
              }
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
          Henry Agent Fleet
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-zinc-950">
        <Routes>
          <Route path="/" element={<Fleet />} />
          <Route path="/board" element={<Board />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/usage" element={<Usage />} />
        </Routes>
      </main>
    </div>
  );
}
