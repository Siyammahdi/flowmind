import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import {
  getRegisteredRedirectUri,
  getWebflowAuthorizeUrl,
  isWebflowOAuthConfigured,
  oauthCookieOptions,
  WEBFLOW_OAUTH_STATE_COOKIE,
} from "@/lib/webflow/oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isWebflowOAuthConfigured()) {
    return Response.redirect(`${request.nextUrl.origin}/?webflow=setup`);
  }

  const redirectUri = getRegisteredRedirectUri();
  const registeredOrigin = new URL(redirectUri).origin;

  // Webflow apps only allow one redirect URI. Start OAuth on that host so the
  // state cookie and callback stay together.
  if (request.nextUrl.origin !== registeredOrigin) {
    return Response.redirect(`${registeredOrigin}/api/webflow/oauth`);
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(
    WEBFLOW_OAUTH_STATE_COOKIE,
    state,
    oauthCookieOptions(request.nextUrl.protocol === "https:"),
  );

  return Response.redirect(getWebflowAuthorizeUrl(state, redirectUri));
}
