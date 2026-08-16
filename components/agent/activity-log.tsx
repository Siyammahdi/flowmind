"use client";

import { useEffect, useRef } from "react";
import {
  CheckIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { AgentMarkdown } from "@/components/agent/agent-markdown";
import { ThinkingStatus } from "@/components/agent/thinking-status";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/agent/types";

type ActivityLogProps = {
  events: ActivityEvent[];
  running: boolean;
};

function ToolBar({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
      <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-3">
        {event.state === "running" ? (
          <Spinner className="size-3" />
        ) : event.state === "error" ? (
          <TriangleAlertIcon className="size-3 text-destructive" />
        ) : (
          <CheckIcon className="size-3" />
        )}
      </span>
      <span
        className={cn(
          "text-[12px] leading-4 text-muted-foreground",
          event.state === "running" && "thinking-shimmer",
          event.state === "error" && "text-destructive",
        )}
      >
        {event.label}
      </span>
    </div>
  );
}

export function ActivityLog({ events, running }: ActivityLogProps) {
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

  const userEvents = visibleEvents.filter((event) => event.kind === "user");
  const toolEvents = visibleEvents.filter((event) => event.kind === "tool");
  const assistantEvents = visibleEvents.filter(
    (event) => event.kind === "assistant",
  );
  const otherEvents = visibleEvents.filter(
    (event) =>
      event.kind === "error" || event.kind === "success",
  );
  const activeTool = toolEvents.find((event) => event.state === "running");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events, running]);

  if (events.length === 0) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SparklesIcon />
          </EmptyMedia>
          <EmptyTitle>What should we change in Webflow?</EmptyTitle>
          <EmptyDescription>
            Connect a site, then ask Flowmind to inspect pages, restyle a
            section, or make a precise layout change.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className="h-full">
      <ol className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
        {userEvents.map((event) => (
          <li key={event.id} className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm leading-6">
              {event.label}
            </div>
          </li>
        ))}

        {toolEvents.length > 0 ? (
          <li className="flex flex-col gap-1">
            {toolEvents.map((event) => (
              <ToolBar key={event.id} event={event} />
            ))}
          </li>
        ) : null}

        {running ? (
          <li>
            <ThinkingStatus running toolLabel={activeTool?.label} />
          </li>
        ) : null}

        {assistantEvents.map((event) => (
          <li key={event.id} className="flex gap-3">
            <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-3">
              <SparklesIcon />
            </div>
            <div className="min-w-0 flex-1">
              <AgentMarkdown content={event.label} />
            </div>
          </li>
        ))}

        {otherEvents.map((event) => (
          <li
            key={event.id}
            className={cn(
              "text-xs text-muted-foreground",
              event.kind === "error" && "text-destructive",
            )}
          >
            {event.label}
          </li>
        ))}
        <div ref={endRef} />
      </ol>
    </ScrollArea>
  );
}
