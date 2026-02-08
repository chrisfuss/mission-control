import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OpenClawClient } from "@/lib/openclaw-client";
import type { Agent, Session, CronJob } from "@/lib/openclaw-client";

interface OpenClawContextType {
  client: OpenClawClient | null;
  connected: boolean;
}

const OpenClawContext = createContext<OpenClawContextType>({
  client: null,
  connected: false,
});

export function OpenClawProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<OpenClawClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
    const client = new OpenClawClient(wsUrl);
    client.onStatusChange = setConnected;
    clientRef.current = client;

    client.connect().catch((err) => {
      console.error("[openclaw] Connection failed:", err);
    });

    return () => {
      client.disconnect();
    };
  }, []);

  return (
    <OpenClawContext.Provider value={{ client: clientRef.current, connected }}>
      {children}
    </OpenClawContext.Provider>
  );
}

export function useOpenClaw() {
  return useContext(OpenClawContext);
}

// Data hooks
export function useAgents() {
  const { client, connected } = useOpenClaw();
  return useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => client!.listAgents(),
    enabled: connected && !!client,
    refetchInterval: 30_000,
  });
}

export function useSessions(agentId?: string) {
  const { client, connected } = useOpenClaw();
  return useQuery<Session[]>({
    queryKey: ["sessions", agentId],
    queryFn: () => client!.listSessions(agentId),
    enabled: connected && !!client,
    refetchInterval: 30_000,
  });
}

export function useCronJobs() {
  const { client, connected } = useOpenClaw();
  return useQuery<CronJob[]>({
    queryKey: ["cron-jobs"],
    queryFn: () => client!.listCronJobs(),
    enabled: connected && !!client,
    refetchInterval: 60_000,
  });
}

export function useGatewayStatus() {
  const { client, connected } = useOpenClaw();
  return useQuery({
    queryKey: ["gateway-status"],
    queryFn: () => client!.getStatus(),
    enabled: connected && !!client,
    refetchInterval: 15_000,
  });
}
