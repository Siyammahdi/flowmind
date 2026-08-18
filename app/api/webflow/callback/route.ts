import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { saveWebflowAuth } from "@/lib/webflow/auth-store";
import {
  exchangeWebflowCode,
  getRegisteredRedirectUri,
  WEBFLOW_OAUTH_STATE_COOKIE,
} from "@/lib/webflow/oauth";
import { fetchWebflowSites, fetchWebflowUser } from "@/lib/webflow/sites";

export const runtime = "nodejs";

function redirectWithError(origin: string, reason: string) {
  const params = new URLSearchParams({
    webflow: "error",
    reason,
  });
  return Response.redirect(`${origin}/?${params.toString()}`);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expected = cookieStore.get(WEBFLOW_OAUTH_STATE_COOKIE)?.value;
  const redirectUri = getRegisteredRedirectUri();

  cookieStore.delete(WEBFLOW_OAUTH_STATE_COOKIE);

  const origin = url.origin;

  if (error) {
    const description =
      url.searchParams.get("error_description") ||
      "Webflow declined the authorization request.";
    console.error("[flowmind] webflow oauth denied", { error, description });
    return redirectWithError(origin, description);
  }

  if (!code || !state || !expected || state !== expected) {
    console.error("[flowmind] webflow oauth state mismatch", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpected: Boolean(expected),
    });
    return redirectWithError(
      origin,
      "Login session expired. Open Flowmind on the deployed app and click Log in with Webflow again.",
    );
  }

  try {
    const token = await exchangeWebflowCode(code, redirectUri);
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
    return Response.redirect(`${origin}/?webflow=connected`);
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : "Webflow login failed after authorization.";
    console.error("[flowmind] webflow oauth callback failed", cause);
    return redirectWithError(origin, message);
  }
}
