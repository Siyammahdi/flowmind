const DEFAULT_WEBFLOW_SCOPES = [
  "authorized_user:read",
  "sites:read",
  "sites:write",
  "pages:read",
  "pages:write",
  "cms:read",
  "cms:write",
  "assets:read",
  "assets:write",
  "custom_code:read",
  "custom_code:write",
];

export const WEBFLOW_OAUTH_STATE_COOKIE = "webflow_oauth_state";

export function isWebflowOAuthConfigured(): boolean {
  return Boolean(
    process.env.WEBFLOW_CLIENT_ID?.trim() &&
      process.env.WEBFLOW_CLIENT_SECRET?.trim(),
  );
}

export function getWebflowScopes(): string {
  const custom = process.env.WEBFLOW_OAUTH_SCOPES?.trim();
  if (custom) {
    return custom;
  }
  return DEFAULT_WEBFLOW_SCOPES.join(" ");
}

export function getRegisteredRedirectUri(): string {
  const configured = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:3000/api/webflow/callback";
}

export function getWebflowAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("WEBFLOW_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: getWebflowScopes(),
    state,
  });

  return `https://webflow.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeWebflowCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Webflow OAuth is not configured.");
  }

  const response = await fetch("https://api.webflow.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    console.error("[flowmind] webflow token exchange failed", {
      status: response.status,
      body: bodyText.slice(0, 400),
    });
    throw new Error(
      "Webflow rejected the login. The redirect URI must match the one saved on your Webflow app exactly.",
    );
  }

  let body: { access_token?: string };
  try {
    body = JSON.parse(bodyText) as { access_token?: string };
  } catch {
    throw new Error("Webflow returned an unexpected response during login.");
  }

  if (!body.access_token) {
    throw new Error("Webflow did not return an access token.");
  }
  return body.access_token;
}

export function oauthCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
    secure,
  };
}
