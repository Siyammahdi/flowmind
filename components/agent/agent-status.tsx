"use client";

import { Badge } from "@/components/ui/badge";

type AgentStatusProps = {
  connected: boolean;
  running: boolean;
  siteName?: string;
};

export function AgentStatus({
  connected,
  running,
  siteName,
}: AgentStatusProps) {
  const label = running
    ? "Agent working"
    : connected
      ? siteName || "Project connected"
      : "Not connected";

  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <span
        className={
          running
            ? "size-1.5 animate-pulse rounded-full bg-primary"
            : connected
              ? "size-1.5 rounded-full bg-primary"
              : "size-1.5 rounded-full bg-muted-foreground"
        }
      />
      {label}
    </Badge>
  );
}
