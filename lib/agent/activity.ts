import type { SDKMessage } from "@cursor/sdk";

import { pointsToText, summarizeToPoints } from "@/lib/agent/format";
import { sanitizePublicText, summarizeUnknown } from "@/lib/agent/sanitize";
import { toolLabel } from "@/lib/agent/tool-copy";
import type { ActivityEvent } from "@/lib/agent/types";

function eventId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function activityFromSdkMessage(message: SDKMessage): ActivityEvent[] {
  switch (message.type) {
    case "system":
      return [
        {
          id: "status-connected",
          kind: "status",
          label: "Agent ready",
          detail: "Webflow tools loaded",
          state: "done",
        },
      ];
    case "thinking":
      return [
        {
          id: "thinking",
          kind: "thinking",
          label: "Thinking",
          detail: message.text
            ? sanitizePublicText(message.text).slice(0, 280)
            : undefined,
          state: "running",
        },
      ];
    case "tool_call":
      return [
        {
          id: message.call_id || eventId("tool"),
          kind: "tool",
          label: toolLabel(message.name, message.status, message.args),
          detail:
            message.status === "error"
              ? summarizeUnknown(message.result) ??
                "Unable to complete this Webflow operation."
              : undefined,
          state:
            message.status === "running"
              ? "running"
              : message.status === "error"
                ? "error"
                : "done",
        },
      ];
    case "assistant": {
      const text = message.message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (!text) {
        return [];
      }
      const points = summarizeToPoints(sanitizePublicText(text));
      return [
        {
          id: "assistant-turn",
          kind: "assistant",
          label: pointsToText(points.length > 0 ? points : [text.slice(0, 220)]),
          state: "done",
        },
      ];
    }
    case "task":
      if (!message.text) {
        return [];
      }
      return [
        {
          id: eventId("task"),
          kind: "status",
          label: sanitizePublicText(message.text),
          state: message.status === "error" ? "error" : "running",
        },
      ];
    case "status":
      if (message.status === "ERROR") {
        return [
          {
            id: eventId("status"),
            kind: "error",
            label: "Agent run failed",
            detail: message.message
              ? sanitizePublicText(message.message)
              : undefined,
            state: "error",
          },
        ];
      }
      return [];
    default:
      return [];
  }
}
