"use client";

import { useEffect, useRef } from "react";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";

import { AgentMarkdown } from "@/components/agent/agent-markdown";
import { ThinkingStatus } from "@/components/agent/thinking-status";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/agent/types";

type ActivityLogProps = {
  events: ActivityEvent[];
  running: boolean;
  siteName?: string;
};

function ToolStep({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
        {event.state === "running" ? (
          <Spinner className="size-3" />
        ) : event.state === "error" ? (
          <TriangleAlertIcon className="size-3 text-destructive" />
        ) : (
          <CheckIcon className="size-3" />
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm leading-6",
            event.state === "running" && "thinking-shimmer",
            event.state === "error" && "text-destructive",
          )}
        >
          {event.label}
        </span>
        {event.detail ? (
          <span className="text-xs leading-5 text-muted-foreground">
            {event.detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ActivityLog({ events, running, siteName }: ActivityLogProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const visibleEvents = events.filter((event, index) => {
    if (event.kind !== "tool") {
      return true;
    }
    const previous = events[index - 1];
    return !(
      previous?.kind === "tool" &&
      previous.label === event.label &&
      previous.state === event.state
    );
  });

  const task = visibleEvents.find((event) => event.kind === "user");
  const statusEvents = visibleEvents.filter((event) => event.kind === "status");
  const toolEvents = visibleEvents.filter((event) => event.kind === "tool");
  const assistantEvents = visibleEvents.filter(
    (event) => event.kind === "assistant",
  );
  const otherEvents = visibleEvents.filter(
    (event) => event.kind === "error" || event.kind === "success",
  );
  const activeTool = toolEvents.find((event) => event.state === "running");
  const success = otherEvents.find((event) => event.kind === "success");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events, running]);

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-40 pt-6">
        {task ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Task
              </p>
              {siteName ? (
                <Badge variant="outline">{siteName}</Badge>
              ) : null}
            </div>
            <h2 className="text-xl font-medium tracking-tight leading-7">
              {task.label}
            </h2>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Agent
          </p>
          <div className="flex flex-col gap-3">
            {statusEvents.map((event) => (
              <p key={event.id} className="text-sm text-muted-foreground">
                {event.label}
                {event.detail ? ` · ${event.detail}` : ""}
              </p>
            ))}
            {toolEvents.map((event) => (
              <ToolStep key={event.id} event={event} />
            ))}
            {running ? (
              <ThinkingStatus running toolLabel={activeTool?.label} />
            ) : null}
          </div>
        </section>

        {assistantEvents.length > 0 || otherEvents.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Result
              </p>
              {success ? (
                <Badge variant="secondary">{success.label}</Badge>
              ) : null}
            </div>
            {assistantEvents.map((event) => (
              <div key={event.id} className="text-[15px] leading-8">
                <AgentMarkdown content={event.label} />
              </div>
            ))}
            {otherEvents
              .filter((event) => event.kind === "error")
              .map((event) => (
                <p key={event.id} className="text-sm text-destructive">
                  {event.label}
                </p>
              ))}
          </section>
        ) : null}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
