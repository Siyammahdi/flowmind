"use client";

import { MoveVerticalIcon, PaletteIcon, ScanSearchIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TASKS = [
  {
    title: "Inspect the project",
    description: "List pages and the homepage structure before editing.",
    prompt:
      "Inspect this Webflow project. List the pages and the main homepage sections.",
    icon: ScanSearchIcon,
  },
  {
    title: "Restyle a control",
    description: "Change a button radius, color, or type style.",
    prompt: "Change the primary button border radius to 12px.",
    icon: PaletteIcon,
  },
  {
    title: "Adjust layout",
    description: "Change spacing or make a section taller.",
    prompt: "Make the hero section 80px taller.",
    icon: MoveVerticalIcon,
  },
];

type WorkspaceIdleProps = {
  siteName: string;
  accountName?: string;
  onSelect: (prompt: string) => void;
};

export function WorkspaceIdle({
  siteName,
  accountName,
  onSelect,
}: WorkspaceIdleProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center gap-8 px-5 pb-36">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {accountName ? `Signed in as ${accountName}` : "Connected project"}
        </p>
        <h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
          {siteName}
        </h1>
        <p className="max-w-lg text-base leading-7 text-muted-foreground">
          Tell the agent what to change. It will inspect this site, then edit it
          in Webflow.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {TASKS.map((task) => (
          <button
            key={task.title}
            type="button"
            className="text-left"
            onClick={() => onSelect(task.prompt)}
          >
            <Card size="sm" className="h-full transition-colors hover:bg-muted/60">
              <CardHeader>
                <task.icon className="size-4 text-muted-foreground" />
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>{task.description}</CardDescription>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
