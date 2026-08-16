import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { saveWebflowAuth } from "@/lib/webflow/auth-store";
import { exchangeWebflowCode } from "@/lib/webflow/oauth";
import { fetchWebflowSites } from "@/lib/webflow/sites";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expected = cookieStore.get("webflow_oauth_state")?.value;
  cookieStore.delete("webflow_oauth_state");

  const origin = url.origin;

  if (error || !code || !state || !expected || state !== expected) {
    return Response.redirect(`${origin}/?webflow=error`);
  }

  try {
    const token = await exchangeWebflowCode(code);
    const sites = await fetchWebflowSites(token);
    await saveWebflowAuth({
      token,
      connectedAt: new Date().toISOString(),
      siteCount: sites.length,
    });
    return Response.redirect(`${origin}/?webflow=connected`);
  } catch (cause) {
    console.error("[flowmind] webflow oauth callback failed", cause);
    return Response.redirect(`${origin}/?webflow=error`);
  }
}
