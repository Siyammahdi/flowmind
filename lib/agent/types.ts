export type ActivityKind =
  | "user"
  | "status"
  | "thinking"
  | "tool"
  | "assistant"
  | "error"
  | "success";

export type ActivityState = "pending" | "running" | "done" | "error";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  label: string;
  detail?: string;
  state?: ActivityState;
};

export type AgentStreamEvent =
  | { type: "activity"; event: ActivityEvent }
  | { type: "done"; success: boolean; message: string }
  | { type: "error"; code: string; message: string };

export type AgentErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "empty_prompt"
  | "agent_init_failed"
  | "mcp_connection_failed"
  | "webflow_auth_failed"
  | "mcp_tool_failed"
  | "agent_timeout"
  | "unexpected_response";
