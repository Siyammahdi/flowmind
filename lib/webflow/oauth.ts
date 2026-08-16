const WEBFLOW_SCOPES = [
  "authorized_user:read",
  "sites:read",
  "sites:write",
  "pages:read",
  "pages:write",
  "cms:read",
  "cms:write",
].join(" ");

export function isWebflowOAuthConfigured(): boolean {
  return Boolean(
    process.env.WEBFLOW_CLIENT_ID?.trim() &&
      process.env.WEBFLOW_CLIENT_SECRET?.trim(),
  );
}

export function getWebflowRedirectUri(): string {
  return (
    process.env.WEBFLOW_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/webflow/callback"
  );
}

export function getWebflowAuthorizeUrl(state: string): string {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("WEBFLOW_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getWebflowRedirectUri(),
    scope: WEBFLOW_SCOPES,
    state,
  });

  return `https://webflow.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeWebflowCode(code: string): Promise<string> {
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
      redirect_uri: getWebflowRedirectUri(),
    }),
  });

  if (!response.ok) {
    throw new Error("Webflow OAuth token exchange failed.");
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error("Webflow did not return an access token.");
  }
  return body.access_token;
}
