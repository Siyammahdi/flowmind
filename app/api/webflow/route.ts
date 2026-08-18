import { AgentRequestError } from "@/lib/agent/errors";
import { getWebflowToken, readWebflowAuth } from "@/lib/webflow/auth-store";
import { isWebflowOAuthConfigured } from "@/lib/webflow/oauth";
import {
  fetchWebflowSites,
  fetchWebflowUser,
  normalizeWebflowToken,
} from "@/lib/webflow/sites";

export const runtime = "nodejs";

export async function GET() {
  const token = await getWebflowToken();
  if (!token) {
    return Response.json({
      connected: false,
      oauthEnabled: isWebflowOAuthConfigured(),
      sites: [],
      user: null,
    });
  }

  try {
    const stored = await readWebflowAuth();
    const [sites, user] = await Promise.all([
      fetchWebflowSites(token),
      stored?.user ?? fetchWebflowUser(token),
    ]);
    return Response.json({
      connected: true,
      oauthEnabled: isWebflowOAuthConfigured(),
      sites,
      user: user ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to connect to Webflow. Please reconnect your Webflow account and try again.";
    return Response.json(
      {
        connected: false,
        oauthEnabled: isWebflowOAuthConfigured(),
        sites: [],
        user: null,
        message,
      },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof body.token === "string"
      ? normalizeWebflowToken(body.token)
      : "";

  if (!token) {
    return Response.json(
      { message: "Paste a Webflow API token to connect." },
      { status: 400 },
    );
  }

  try {
    const { saveWebflowAuth } = await import("@/lib/webflow/auth-store");
    const [sites, user] = await Promise.all([
      fetchWebflowSites(token),
      fetchWebflowUser(token),
    ]);
    await saveWebflowAuth({
      token,
      connectedAt: new Date().toISOString(),
      siteCount: sites.length,
      user,
    });
    return Response.json({ connected: true, sites, user: user ?? null });
  } catch (error) {
    const mapped =
      error instanceof AgentRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to connect to Webflow. Please reconnect your Webflow account and try again.";
    return Response.json({ message: mapped }, { status: 401 });
  }
}

export async function DELETE() {
  const { clearWebflowAuth } = await import("@/lib/webflow/auth-store");
  await clearWebflowAuth();
  return Response.json({ connected: false, sites: [], user: null });
}
