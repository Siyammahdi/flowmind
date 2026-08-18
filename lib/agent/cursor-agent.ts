import { Agent, type SDKAgent } from "@cursor/sdk";

import { activityFromSdkMessage } from "@/lib/agent/activity";
import {
  AgentRequestError,
  mapAgentError,
} from "@/lib/agent/errors";
import {
  isChangeRequest,
  pointsToText,
  summarizeToPoints,
} from "@/lib/agent/format";
import { sanitizePublicText } from "@/lib/agent/sanitize";
import { WEBFLOW_AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import type { ActivityEvent } from "@/lib/agent/types";
import { resolveToolName } from "@/lib/agent/tool-copy";
import { getWebflowMcpServer } from "@/lib/mcp/webflow";
import { getWebflowToken } from "@/lib/webflow/auth-store";

const DEFAULT_TIMEOUT_MS = 180_000;

export type RunWebflowAgentOptions = {
  prompt: string;
  site?: { id: string; displayName: string };
  onEvent: (event: ActivityEvent) => void;
};

export type RunWebflowAgentResult = {
  success: boolean;
  message: string;
  events: ActivityEvent[];
};

function requireApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new AgentRequestError(
      "missing_api_key",
      "CURSOR_API_KEY is missing. Add it to .env.local and restart the server.",
      500,
    );
  }
  return apiKey;
}

function composePrompt(
  userPrompt: string,
  site?: { id: string; displayName: string },
): string {
  const siteBlock = site
    ? `
Target Webflow site:
- name: ${site.displayName}
- id: ${site.id}
Work on this site unless the user names another.
`
    : "";

  return `${WEBFLOW_AGENT_SYSTEM_PROMPT}
${siteBlock}
User request:
${userPrompt}`;
}

async function disposeAgent(agent: SDKAgent | undefined): Promise<void> {
  if (!agent) {
    return;
  }
  try {
    await agent[Symbol.asyncDispose]();
  } catch {
    agent.close();
  }
}

export async function runWebflowAgent({
  prompt,
  site,
  onEvent,
}: RunWebflowAgentOptions): Promise<RunWebflowAgentResult> {
  const apiKey = requireApiKey();
  const webflowToken = await getWebflowToken();
  if (!webflowToken) {
    throw new AgentRequestError(
      "webflow_auth_failed",
      "Unable to connect to Webflow. Please reconnect your Webflow account and try again.",
      401,
    );
  }
  const events: ActivityEvent[] = [];
  const emit = (event: ActivityEvent) => {
    events.push(event);
    onEvent(event);
  };

  emit({
    id: crypto.randomUUID(),
    kind: "user",
    label: prompt,
    state: "done",
  });

  const timeoutMs = Number(process.env.AGENT_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  let agent: SDKAgent | undefined;
  let timedOut = false;

  try {
    agent = await Agent.create({
      apiKey,
      model: { id: process.env.CURSOR_MODEL?.trim() || "composer-2.5" },
      name: "Flowmind Webflow Agent",
      local: { cwd: process.cwd() },
      mcpServers: await getWebflowMcpServer(),
      tools: [
        "mcp",
        "getMcpTools",
        "listMcpResources",
        "readMcpResource",
        "mcpAuth",
        "askQuestion",
        "fetch",
      ],
    });

    const run = await agent.send(composePrompt(prompt, site));
    console.info("[flowmind] agent started", {
      agentId: agent.agentId,
      runId: run.id,
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      if (run.supports("cancel")) {
        void run.cancel();
      }
    }, timeoutMs);

    try {
      if (run.supports("stream")) {
        for await (const message of run.stream()) {
          if (message.type === "system") {
            console.info("[flowmind] agent tools", message.tools ?? []);
          }
          if (message.type === "tool_call") {
            console.info("[flowmind] mcp tool", {
              name: message.name,
              status: message.status,
              toolName: resolveToolName(message.name, message.args),
            });
          }
          for (const activity of activityFromSdkMessage(message)) {
            emit(activity);
          }
        }
      }

      const result = await run.wait();
      if (timedOut || result.status === "cancelled") {
        throw new AgentRequestError(
          "agent_timeout",
          "The agent timed out before finishing. Try a smaller request.",
          504,
        );
      }

      if (result.status === "error") {
        const toolFailed = events.some(
          (event) => event.kind === "tool" && event.state === "error",
        );
        throw new AgentRequestError(
          toolFailed ? "mcp_tool_failed" : "unexpected_response",
          toolFailed
            ? "A Webflow MCP tool failed. The requested change was not completed."
            : "The agent finished without a successful result.",
          502,
        );
      }

      const assistantMessages = events
        .filter((event) => event.kind === "assistant")
        .map((event) => event.label);
      const rawMessage =
        result.result || assistantMessages.at(-1) || "";
      const points = summarizeToPoints(sanitizePublicText(rawMessage));
      const message =
        points.length > 0
          ? pointsToText(points)
          : "The agent finished without a short summary.";

      const successfulTools = events.filter(
        (event) => event.kind === "tool" && event.state === "done",
      );
      const failedTools = events.filter(
        (event) => event.kind === "tool" && event.state === "error",
      );

      if (failedTools.length > 0 && successfulTools.length === 0) {
        throw new AgentRequestError(
          "mcp_tool_failed",
          "A Webflow MCP tool failed. The project was not updated.",
          502,
        );
      }

      if (isChangeRequest(prompt) && successfulTools.length === 0) {
        throw new AgentRequestError(
          "mcp_tool_failed",
          "No Webflow change was applied. The agent did not complete a successful MCP tool call. Open the site in Webflow Designer, keep the MCP Bridge App open, and try again.",
          502,
        );
      }

      if (!rawMessage && successfulTools.length === 0) {
        throw new AgentRequestError(
          "unexpected_response",
          "The agent finished without a usable response.",
          502,
        );
      }

      emit({
        id: "assistant-turn",
        kind: "assistant",
        label: message,
        state: "done",
      });

      emit({
        id: crypto.randomUUID(),
        kind: "success",
        label:
          successfulTools.length > 0
            ? `Webflow tools succeeded (${successfulTools.length})`
            : "Inspection finished",
        state: "done",
      });

      return {
        success: true,
        message,
        events,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const mapped = mapAgentError(error);
    console.error("[flowmind] agent error", {
      code: mapped.code,
      message: error instanceof Error ? error.message : "unknown",
    });
    emit({
      id: crypto.randomUUID(),
      kind: "error",
      label: mapped.message,
      state: "error",
    });
    throw mapped;
  } finally {
    await disposeAgent(agent);
  }
}
