import { cookies } from "next/headers";

import { getWebflowAuthorizeUrl, isWebflowOAuthConfigured } from "@/lib/webflow/oauth";

export const runtime = "nodejs";

export async function GET() {
  if (!isWebflowOAuthConfigured()) {
    return Response.json(
      {
        message:
          "Webflow OAuth is not configured. Add WEBFLOW_CLIENT_ID and WEBFLOW_CLIENT_SECRET, or connect with an API token.",
      },
      { status: 400 },
    );
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
