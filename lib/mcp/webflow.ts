import type { McpServerConfig } from "@cursor/sdk";

import { getWebflowToken } from "@/lib/webflow/auth-store";

export const DEFAULT_WEBFLOW_MCP_URL = "https://mcp.webflow.com/mcp";

function processEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
}

export async function getWebflowMcpServer(): Promise<
  Record<string, McpServerConfig>
> {
  const token = await getWebflowToken();
  const url = process.env.WEBFLOW_MCP_URL?.trim() || DEFAULT_WEBFLOW_MCP_URL;
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";

  const servers: Record<string, McpServerConfig> = {
    webflow: {
      type: "stdio",
      command: npx,
      args: ["-y", "mcp-remote", url],
      env: processEnv(),
    },
  };

  if (token) {
    servers["webflow-api"] = {
      type: "stdio",
      command: npx,
      args: ["-y", "webflow-mcp-server@latest"],
      env: {
        ...processEnv(),
        WEBFLOW_TOKEN: token,
      },
    };
  }

  return servers;
}
