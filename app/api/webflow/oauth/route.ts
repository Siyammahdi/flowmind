import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { getWebflowAuthorizeUrl, isWebflowOAuthConfigured } from "@/lib/webflow/oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isWebflowOAuthConfigured()) {
    return Response.redirect(`${request.nextUrl.origin}/?webflow=setup`);
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("webflow_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return Response.redirect(getWebflowAuthorizeUrl(state));
}
