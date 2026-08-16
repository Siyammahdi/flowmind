"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const PHASES = [
  "Thinking",
  "Understanding the request",
  "Analyzing the Webflow project",
  "Planning the next step",
  "Waiting for tools",
];

export function ThinkingStatus({
  running,
  toolLabel,
}: {
  running: boolean;
  toolLabel?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!running || toolLabel) {
      return;
    }
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % PHASES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [running, toolLabel]);

  if (!running) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="thinking-dot" />
      <span className={cn("thinking-shimmer font-medium")}>
        {toolLabel || PHASES[index]}
      </span>
    </div>
  );
}
