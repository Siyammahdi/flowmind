# Flowmind

Flowmind is a small Next.js MVP that proves this workflow:

**User prompt → Cursor Agent SDK → Webflow MCP 2.0 → Webflow project**

Type a natural-language instruction such as “Make the hero section 80px taller.” The server starts a Cursor agent, gives it the official Webflow MCP remote server, and streams a clean activity log while the agent inspects or updates the site.

This is not a chatbot shell. The agent is restricted to MCP tools and is expected to call real Webflow MCP operations.

## Requirements

- Node.js **22.13+** (`@cursor/sdk` requires it)
- pnpm 11+
- A Cursor API key
- A Webflow account with at least one site you can access

## Installation

```bash
pnpm install
```

Copy environment variables:

```bash
cp .env.example .env.local
```

## Environment variables

```env
CURSOR_API_KEY=
WEBFLOW_MCP_URL=https://mcp.webflow.com/mcp
```

Optional:

```env
WEBFLOW_TOKEN=
WEBFLOW_MCP_TRANSPORT=http
CURSOR_MODEL=composer-2.5
AGENT_TIMEOUT_MS=180000
```

Never commit `.env.local`. The Cursor API key is read only on the server.

## Cursor API key

1. Open [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations).
2. Create a user API key (or a team service-account key).
3. Set `CURSOR_API_KEY` in `.env.local`.

If requests fail with an invalid-key error, check for extra whitespace and confirm the key belongs to an account that can run local agents.

## Webflow authentication

Log in with Webflow in the app. That uses a Data Client OAuth app so Flowmind can see the sites on your account.

Create a Webflow **Data Client** app, then set:

```env
WEBFLOW_CLIENT_ID=
WEBFLOW_CLIENT_SECRET=
WEBFLOW_REDIRECT_URI=http://localhost:3000/api/webflow/callback
```

Add the same redirect URI in the Webflow app settings, with `sites:read`, `sites:write`, `pages:read`, `pages:write`, `cms:read`, `cms:write`, and `authorized_user:read`. Restart the server, then click **Log in with Webflow**.

A site API token still works as a fallback from the connect screen.

Set `WEBFLOW_MCP_TRANSPORT=http` only if you want the remote MCP URL with a bearer token instead of the official local MCP server.

## Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
pnpm typecheck
pnpm lint
```

## Example prompts

```text
Inspect the current Webflow project and tell me what pages are available.
```

```text
Inspect the homepage and identify the main sections.
```

```text
Find the hero section and tell me its current structure and styling.
```

```text
Change the hero section background color to #111111.
```

```text
Change the primary button border radius to 12px.
```

```text
Make the hero section 80px taller.
```

The agent is instructed not to report success unless the MCP tool call actually succeeded.

## Known limitations

- Connect a Webflow account in the UI before running the agent.
- Some visual/layout edits require an open Webflow Designer session plus the MCP Bridge App.
- MCP only exposes the tools Webflow publishes. If a capability is missing, Flowmind should explain that instead of faking the change.
- Local Cursor agents default to the current repo as `cwd`. Flowmind disables non-MCP built-in tools (`tools: ["mcp"]`) so the agent works on Webflow rather than this codebase.
- Designer live-canvas tools and Data API tools differ. Inspect first, then modify.
- Streaming activity is summarized. Raw MCP JSON is not dumped into the UI.

## Architecture

```text
Browser
   │
   │ POST /api/agent  { prompt }
   ▼
Next.js Node route (SSE)
   │
   ▼
@cursor/sdk Agent.create / agent.send
   │
   └── Webflow MCP 2.0 (https://mcp.webflow.com/mcp)
           │
           ▼
       Webflow project
```
