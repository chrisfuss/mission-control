import { useState, useRef, useEffect } from "react";
import { useAgents, useOpenClaw } from "@/hooks/use-openclaw";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function Chat() {
  const { client, connected } = useOpenClaw();
  const { data: agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent || !client || sending) return;

    const userMsg: Message = { role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const result = await client.sendChat(selectedAgent, userMsg.content);
      const assistantMsg: Message = {
        role: "assistant",
        content: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err}`, timestamp: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Agent selector */}
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        <h1 className="text-lg font-bold">Chat</h1>
        <select
          value={selectedAgent}
          onChange={(e) => {
            setSelectedAgent(e.target.value);
            setMessages([]);
          }}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">Select agent...</option>
          {agents?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.identity?.name || a.id}
            </option>
          ))}
        </select>
        {!connected && <span className="text-xs text-red-400">Disconnected</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-zinc-600 text-center py-12">
            {selectedAgent ? "Send a message to start chatting" : "Select an agent to begin"}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-4 border-t border-zinc-800 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedAgent ? "Type a message..." : "Select an agent first"}
          disabled={!selectedAgent || !connected}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || !selectedAgent || !connected || sending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
