"use client";

import { Badge } from "@/components/ui/badge";

type AgentStatusProps = {
  connected: boolean;
  running: boolean;
};

export function AgentStatus({ connected, running }: AgentStatusProps) {
  const label = running ? "Running" : connected ? "Connected" : "Ready";

  return (
    <Badge variant="secondary" className="gap-1.5 font-medium">
      <span
        className={
          running
            ? "size-1.5 animate-pulse rounded-full bg-primary"
            : "size-1.5 rounded-full bg-primary"
        }
      />
      {label}
    </Badge>
  );
}
