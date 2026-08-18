"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MenuIcon } from "lucide-react";

import { ActivityLog } from "@/components/agent/activity-log";
import { AgentStatus } from "@/components/agent/agent-status";
import { ConnectScreen } from "@/components/agent/connect-screen";
import { HistorySidebar } from "@/components/agent/history-sidebar";
import { PromptInput } from "@/components/agent/prompt-input";
import { WebflowConnectDialog } from "@/components/agent/webflow-connect-dialog";
import { WorkspaceIdle } from "@/components/agent/workspace-idle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityEvent, AgentStreamEvent } from "@/lib/agent/types";
import {
  clearHistory,
  deleteEntry,
  type HistoryEntry,
  loadHistory,
  saveEntry,
} from "@/lib/agent/history";
import type { WebflowSiteSummary, WebflowUserSummary } from "@/lib/webflow/sites";

type ConnectionState = {
  connected: boolean;
  oauthEnabled: boolean;
  sites: WebflowSiteSummary[];
  user?: WebflowUserSummary;
};

export function AgentPanel() {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(true);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [siteId, setSiteId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);

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
    setHistory(loadHistory());
  }, []);

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

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  async function handleSubmit(next = prompt.trim()) {
    if (!next || running) {
      return;
    }
    if (!connection.connected) {
      toast.error("Log in with Webflow before running the agent.");
      return;
    }

    const sessionId = crypto.randomUUID();
    setActiveSessionId(sessionId);
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

    const controller = new AbortController();
    abortRef.current = controller;

    let collectedEvents: ActivityEvent[] = [
      { id: "current-task", kind: "user", label: next, state: "done" },
    ];

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: next,
          site: activeSite
            ? { id: activeSite.id, displayName: activeSite.displayName }
            : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.body) {
        throw new Error("The agent API did not return a stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalMessage = "";
      let failed = false;

      try {
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
              const event = payload.event;
              if (event.kind === "assistant" && !event.label.trim()) {
                continue;
              }
              collectedEvents = [...collectedEvents, event];
              setEvents((current) => {
                if (
                  event.kind === "user" &&
                  current.some((item) => item.kind === "user")
                ) {
                  return current;
                }
                const existing = current.findIndex(
                  (item) => item.id === event.id,
                );
                if (existing !== -1) {
                  const copy = [...current];
                  copy[existing] = event;
                  return copy;
                }
                return [...current, event];
              });
            } else if (payload.type === "done") {
              finalMessage = payload.message;
            } else if (payload.type === "error") {
              failed = true;
              finalMessage = payload.message;
              const errorEvent: ActivityEvent = {
                id: crypto.randomUUID(),
                kind: "error",
                label: payload.message,
                state: "error",
              };
              collectedEvents = [...collectedEvents, errorEvent];
              setEvents((current) => [...current, errorEvent]);
            }
          }
        }
      } catch (readError) {
        if ((readError as Error).name === "AbortError") {
          const abortEvent: ActivityEvent = {
            id: crypto.randomUUID(),
            kind: "error",
            label: "Agent stopped by user.",
            state: "error",
          };
          collectedEvents = [...collectedEvents, abortEvent];
          setEvents((current) => [...current, abortEvent]);
        } else {
          throw readError;
        }
      }

      if (failed && !controller.signal.aborted) {
        throw new Error(finalMessage || "The agent failed.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while running the agent.";
        toast.error(message);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;

      const entry: HistoryEntry = {
        id: sessionId,
        prompt: next,
        createdAt: Date.now(),
        events: collectedEvents,
        siteName: activeSite?.displayName,
      };
      saveEntry(entry);
      setHistory(loadHistory());
    }
  }

  function handleNewSession() {
    setEvents([]);
    setPrompt("");
    setActiveSessionId(undefined);
  }

  function handleSelectHistory(entry: HistoryEntry) {
    setEvents(entry.events);
    setActiveSessionId(entry.id);
    setPrompt("");
  }

  function handleDeleteEntry(id: string) {
    deleteEntry(id);
    setHistory(loadHistory());
    if (activeSessionId === id) {
      handleNewSession();
    }
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
    handleNewSession();
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
    <div className="flex h-svh overflow-hidden bg-background">
      <HistorySidebar
        open={sidebarOpen}
        entries={history}
        activeId={activeSessionId}
        userName={connection.user?.name}
        onSelect={handleSelectHistory}
        onNew={handleNewSession}
        onDelete={handleDeleteEntry}
        onClear={handleClearHistory}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <MenuIcon />
            </Button>
            <button
              type="button"
              className="text-[15px] font-medium tracking-tight"
              onClick={handleNewSession}
            >
              Flowmind
            </button>
          </div>
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
              onStop={handleStop}
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
    </div>
  );
}
