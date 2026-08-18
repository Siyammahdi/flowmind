"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ActivityLog } from "@/components/agent/activity-log";
import { AgentStatus } from "@/components/agent/agent-status";
import { ConnectScreen } from "@/components/agent/connect-screen";
import { PromptInput } from "@/components/agent/prompt-input";
import { WebflowConnectDialog } from "@/components/agent/webflow-connect-dialog";
import { WorkspaceIdle } from "@/components/agent/workspace-idle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityEvent, AgentStreamEvent } from "@/lib/agent/types";
import type { WebflowSiteSummary, WebflowUserSummary } from "@/lib/webflow/sites";

type ConnectionState = {
  connected: boolean;
  oauthEnabled: boolean;
  sites: WebflowSiteSummary[];
  user?: WebflowUserSummary;
};

async function runAgent(
  prompt: string,
  site: WebflowSiteSummary | undefined,
  onEvent: (event: ActivityEvent) => void,
) {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      site: site
        ? { id: site.id, displayName: site.displayName }
        : undefined,
    }),
  });

  if (!response.body) {
    throw new Error("The agent API did not return a stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalMessage = "";
  let failed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (!line) {
        continue;
      }

      let payload: AgentStreamEvent;
      try {
        payload = JSON.parse(line.slice(6)) as AgentStreamEvent;
      } catch {
        continue;
      }
      if (payload.type === "activity") {
        onEvent(payload.event);
      } else if (payload.type === "done") {
        finalMessage = payload.message;
      } else if (payload.type === "error") {
        failed = true;
        finalMessage = payload.message;
        onEvent({
          id: crypto.randomUUID(),
          kind: "error",
          label: payload.message,
          state: "error",
        });
      }
    }
  }

  if (failed) {
    throw new Error(finalMessage || "The agent failed.");
  }

  return finalMessage;
}

export function AgentPanel() {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(true);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [siteId, setSiteId] = useState<string>();
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    oauthEnabled: false,
    sites: [],
  });

  const activeSite =
    connection.sites.find((site) => site.id === siteId) ?? connection.sites[0];
  const isEmpty = events.length === 0 && !running;

  function applyConnection(
    sites: WebflowSiteSummary[],
    user?: WebflowUserSummary,
  ) {
    setConnection((current) => ({
      ...current,
      connected: true,
      sites,
      user: user ?? current.user,
    }));
    setSiteId(sites[0]?.id);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("webflow");
    const reason = params.get("reason");
    if (status) {
      window.history.replaceState({}, "", "/");
      if (status === "connected") {
        toast.success("Logged in with Webflow");
      } else if (status === "error") {
        toast.error(reason || "Webflow login failed. Try again.");
      } else if (status === "setup") {
        toast.error(
          "Webflow login is not configured yet. Use a site token, or add a Webflow Data Client in .env.local.",
        );
      }
    }

    void (async () => {
      const response = await fetch("/api/webflow");
      const body = (await response.json()) as ConnectionState & {
        message?: string;
      };
      setConnection({
        connected: Boolean(body.connected),
        oauthEnabled: Boolean(body.oauthEnabled),
        sites: body.sites ?? [],
        user: body.user ?? undefined,
      });
      setSiteId(body.sites?.[0]?.id);
      setChecking(false);
      if (body.connected === false && body.message) {
        toast.error(body.message);
      }
    })();
  }, []);

  async function handleSubmit(next = prompt.trim()) {
    if (!next || running) {
      return;
    }
    if (!connection.connected) {
      toast.error("Log in with Webflow before running the agent.");
      return;
    }

    setRunning(true);
    setPrompt("");
    setEvents([
      {
        id: "current-task",
        kind: "user",
        label: next,
        state: "done",
      },
    ]);

    try {
      await runAgent(next, activeSite, (event) => {
        if (event.kind === "assistant" && !event.label.trim()) {
          return;
        }
        setEvents((current) => {
          if (event.kind === "user" && current.some((item) => item.kind === "user")) {
            return current;
          }
          const existing = current.findIndex((item) => item.id === event.id);
          if (existing !== -1) {
            const copy = [...current];
            copy[existing] = event;
            return copy;
          }
          return [...current, event];
        });
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while running the agent.";
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }

  if (checking) {
    return (
      <div className="flex h-svh flex-col gap-6 bg-background px-6 py-8">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-24 w-full max-w-xl" />
      </div>
    );
  }

  if (!connection.connected) {
    return (
      <ConnectScreen
        oauthEnabled={connection.oauthEnabled}
        onConnected={applyConnection}
      />
    );
  }

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-background">
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          className="text-[15px] font-medium tracking-tight"
          onClick={() => {
            setEvents([]);
            setPrompt("");
          }}
        >
          Flowmind
        </button>
        <div className="flex items-center gap-2">
          {connection.sites.length > 1
            ? connection.sites.map((site) => (
                <Button
                  key={site.id}
                  size="sm"
                  variant={site.id === activeSite?.id ? "secondary" : "ghost"}
                  onClick={() => setSiteId(site.id)}
                >
                  {site.displayName}
                </Button>
              ))
            : null}
          <button type="button" onClick={() => setConnectOpen(true)}>
            <AgentStatus
              connected
              running={running}
              siteName={activeSite?.displayName}
            />
          </button>
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
        {isEmpty ? (
          <WorkspaceIdle
            siteName={activeSite?.displayName || "Webflow project"}
            accountName={connection.user?.name}
            onSelect={(task) => {
              setPrompt(task);
              void handleSubmit(task);
            }}
          />
        ) : (
          <ActivityLog
            events={events}
            running={running}
            siteName={activeSite?.displayName}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(to_top,var(--background)_55%,transparent)] pt-16">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl px-4 pb-6">
          <PromptInput
            value={prompt}
            running={running}
            onChange={setPrompt}
            onSubmit={() => void handleSubmit()}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            The agent edits {activeSite?.displayName || "the connected site"}{" "}
            through Webflow. Review the Designer before publishing.
          </p>
        </div>
      </div>

      <WebflowConnectDialog
        open={connectOpen}
        connected
        oauthEnabled={connection.oauthEnabled}
        onOpenChange={setConnectOpen}
        onConnected={applyConnection}
        onDisconnected={() => {
          setConnection({
            connected: false,
            oauthEnabled: connection.oauthEnabled,
            sites: [],
            user: undefined,
          });
          setSiteId(undefined);
          setEvents([]);
        }}
      />
    </div>
  );
}
