import {
  AuthenticationError,
  CursorAgentError,
  IntegrationNotConnectedError,
} from "@cursor/sdk";

import type { AgentErrorCode } from "@/lib/agent/types";

export class AgentRequestError extends Error {
  readonly code: AgentErrorCode;
  readonly status: number;

  constructor(code: AgentErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AgentRequestError";
    this.code = code;
    this.status = status;
  }
}

export function mapAgentError(error: unknown): AgentRequestError {
  if (error instanceof AgentRequestError) {
    return error;
  }

  if (error instanceof AuthenticationError) {
    return new AgentRequestError(
      "invalid_api_key",
      "The Cursor API key was rejected. Check CURSOR_API_KEY and try again.",
      401,
    );
  }

  if (error instanceof IntegrationNotConnectedError) {
    return new AgentRequestError(
      "webflow_auth_failed",
      "Unable to connect to Webflow. Please reconnect your Webflow account and try again.",
      401,
    );
  }

  if (error instanceof CursorAgentError) {
    const raw = `${error.message} ${error.code ?? ""}`.toLowerCase();

    if (raw.includes("timeout") || raw.includes("timed out")) {
      return new AgentRequestError(
        "agent_timeout",
        "The agent timed out before finishing. Try a smaller request.",
        504,
      );
    }

    if (raw.includes("unknown tool name") || raw.includes("disallowedtools")) {
      return new AgentRequestError(
        "agent_init_failed",
        "The Cursor agent could not start because of an invalid tool configuration. Please try again.",
        500,
      );
    }

    if (
      raw.includes("webflow") ||
      raw.includes("oauth") ||
      raw.includes("mcp connection") ||
      raw.includes("mcp server")
    ) {
      return new AgentRequestError(
        "mcp_connection_failed",
        "Unable to connect to Webflow. Please reconnect your Webflow account and try again.",
        502,
      );
    }

    if (error.status === 401 || error.status === 403) {
      return new AgentRequestError(
        "invalid_api_key",
        "The Cursor API key was rejected. Check CURSOR_API_KEY and try again.",
        401,
      );
    }

    return new AgentRequestError(
      "agent_init_failed",
      "The Cursor agent could not start. Please try again.",
      500,
    );
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return new AgentRequestError(
      "agent_timeout",
      "The agent timed out before finishing. Try a smaller request.",
      504,
    );
  }

  return new AgentRequestError(
    "unexpected_response",
    "Something went wrong while running the agent. Please try again.",
    500,
  );
}

export function userMessageForCode(code: AgentErrorCode): string {
  switch (code) {
    case "missing_api_key":
      return "CURSOR_API_KEY is missing. Add it to .env.local and restart the server.";
    case "invalid_api_key":
      return "The Cursor API key was rejected. Check CURSOR_API_KEY and try again.";
    case "empty_prompt":
      return "Enter an instruction before running the agent.";
    case "webflow_auth_failed":
    case "mcp_connection_failed":
      return "Unable to connect to Webflow. Please reconnect your Webflow account and try again.";
    case "mcp_tool_failed":
      return "No Webflow change was applied. Open the site in Designer, keep the MCP Bridge App open, and try again.";
    case "agent_timeout":
      return "The agent timed out before finishing. Try a smaller request.";
    case "agent_init_failed":
      return "The Cursor agent could not start. Please try again.";
    default:
      return "Something went wrong while running the agent. Please try again.";
  }
}
