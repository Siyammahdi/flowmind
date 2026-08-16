"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LayersIcon } from "lucide-react";

import { ActivityLog } from "@/components/agent/activity-log";
import { AgentStatus } from "@/components/agent/agent-status";
import { PromptInput } from "@/components/agent/prompt-input";
import { WebflowConnectDialog } from "@/components/agent/webflow-connect-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ActivityEvent, AgentStreamEvent } from "@/lib/agent/types";
import type { WebflowSiteSummary } from "@/lib/webflow/sites";

const EXAMPLES = [
  "List my Webflow sites.",
  "Inspect the homepage and identify the main sections.",
  "Find the hero section and tell me its current structure and styling.",
];

type ConnectionState = {
  connected: boolean;
  oauthEnabled: boolean;
  sites: WebflowSiteSummary[];
};

async function runAgent(prompt: string, onEvent: (event: ActivityEvent) => void) {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
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
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    oauthEnabled: false,
    sites: [],
  });

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/webflow");
      const body = (await response.json()) as ConnectionState & {
        message?: string;
      };
      setConnection({
        connected: Boolean(body.connected),
        oauthEnabled: Boolean(body.oauthEnabled),
        sites: body.sites ?? [],
      });
      if (body.connected === false && body.message) {
        toast.error(body.message);
      }
    })();
  }, []);

  async function handleSubmit() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt || running) {
      return;
    }
    if (!connection.connected) {
      setConnectOpen(true);
      toast.error("Connect a Webflow account before running the agent.");
      return;
    }

    setRunning(true);
    setEvents([]);
    setPrompt("");

    try {
      await runAgent(nextPrompt, (event) => {
        if (event.kind === "assistant" && !event.label.trim()) {
          return;
        }
        setEvents((current) => {
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

  async function disconnect() {
    await fetch("/api/webflow", { method: "DELETE" });
    setConnection((current) => ({ ...current, connected: false, sites: [] }));
    toast.success("Webflow disconnected");
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden h-svh w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar lg:flex">
        <div className="flex shrink-0 items-center gap-2 px-4 py-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayersIcon />
          </div>
          <div>
            <p className="text-sm font-medium">Flowmind</p>
            <p className="text-xs text-muted-foreground">Webflow Agent</p>
          </div>
        </div>
        <Separator />
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Account</p>
            <p className="mt-2 text-sm">
              {connection.connected ? "Webflow connected" : "Not connected"}
            </p>
            {connection.connected ? (
              <Button className="mt-3" size="sm" variant="outline" onClick={disconnect}>
                Disconnect
              </Button>
            ) : (
              <Button className="mt-3" size="sm" onClick={() => setConnectOpen(true)}>
                Connect Webflow
              </Button>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Live edits</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The MCP Bridge App is not in the Webflow marketplace. It appears in
              Designer → Apps only after official Webflow MCP OAuth. Most style and
              element edits use the Data API and do not need that app. On first run,
              complete the Webflow login window if it opens.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Sites</p>
            <div className="mt-2 flex flex-col gap-1">
              {connection.sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sites yet. Connect an account to load projects.
                </p>
              ) : (
                connection.sites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    className="rounded-lg px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent"
                    onClick={() =>
                      setPrompt(`Inspect the Webflow site named ${site.displayName}.`)
                    }
                  >
                    {site.displayName}
                  </button>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Prompts</p>
            <div className="mt-2 flex flex-col gap-1">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 lg:hidden">
            <p className="text-sm font-medium">Flowmind</p>
            <Button size="sm" variant="outline" onClick={() => setConnectOpen(true)}>
              {connection.connected ? "Webflow" : "Connect"}
            </Button>
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">Agent</p>
          <AgentStatus connected={connection.connected} running={running} />
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ActivityLog events={events} running={running} />
        </div>
        <div className="shrink-0 border-t border-border bg-background/90 p-4 backdrop-blur-md">
          <div className="mx-auto max-w-3xl">
            <PromptInput
              value={prompt}
              running={running}
              onChange={setPrompt}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>

      <WebflowConnectDialog
        open={connectOpen}
        oauthEnabled={connection.oauthEnabled}
        onOpenChange={setConnectOpen}
        onConnected={(sites) =>
          setConnection((current) => ({
            ...current,
            connected: true,
            sites,
          }))
        }
      />
    </div>
  );
}
