export type WebflowSiteSummary = {
  id: string;
  displayName: string;
};

export function normalizeWebflowToken(raw: string): string {
  return raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function messageForStatus(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();

  if (status === 403 || lower.includes("missing the required scopes")) {
    return "This token cannot read sites. Workspace API tokens only cover workspace audit logs. Create a Site API token instead: open a site → Site settings → Apps & integrations → API access. Enable sites:read (and sites:write if you want edits).";
  }

  if (status === 401) {
    return "Webflow rejected this token. Use a Site API token from Site settings → Apps & integrations → API access, not a Workspace API token.";
  }

  return "Unable to read Webflow sites with this token.";
}

export async function fetchWebflowSites(
  token: string,
): Promise<WebflowSiteSummary[]> {
  const response = await fetch("https://api.webflow.com/v2/sites", {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  const bodyText = await response.text();

  if (!response.ok) {
    console.error("[flowmind] webflow sites request failed", {
      status: response.status,
    });
    throw new Error(messageForStatus(response.status, bodyText));
  }

  let body: {
    sites?: Array<{ id?: string; displayName?: string; shortName?: string }>;
  };
  try {
    body = JSON.parse(bodyText) as {
      sites?: Array<{ id?: string; displayName?: string; shortName?: string }>;
    };
  } catch {
    throw new Error("Webflow returned an unexpected response while listing sites.");
  }

  return (body.sites ?? [])
    .filter((site) => typeof site.id === "string")
    .map((site) => ({
      id: site.id as string,
      displayName: site.displayName || site.shortName || "Untitled site",
    }));
}
