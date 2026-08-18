"use client";

import { ClockIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/agent/history";

type HistorySidebarProps = {
  open: boolean;
  entries: HistoryEntry[];
  activeId?: string;
  userName?: string;
  onSelect: (entry: HistoryEntry) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function HistorySidebar({
  open,
  entries,
  activeId,
  userName,
  onSelect,
  onNew,
  onDelete,
  onClear,
}: HistorySidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-200",
        !open && "w-0 overflow-hidden border-r-0",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-4">
        <span className="text-sm font-medium text-sidebar-foreground">
          History
        </span>
        <Button size="icon-xs" variant="ghost" onClick={onNew}>
          <PlusIcon />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {entries.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No tasks yet. Run the agent to see history here.
            </p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={cn(
                  "group flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent",
                  entry.id === activeId && "bg-sidebar-accent",
                )}
                onClick={() => onSelect(entry)}
              >
                <ClockIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm text-sidebar-foreground">
                    {entry.prompt}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(entry.createdAt)}
                    {entry.siteName ? ` · ${entry.siteName}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="mt-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(entry.id);
                  }}
                >
                  <Trash2Icon className="size-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex shrink-0 flex-col gap-2 px-4 py-3">
        {entries.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={onClear}>
            <Trash2Icon data-icon="inline-start" />
            Clear history
          </Button>
        ) : null}
        {userName ? (
          <p className="truncate text-xs text-muted-foreground">{userName}</p>
        ) : null}
      </div>
    </aside>
  );
}
