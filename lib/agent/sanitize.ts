const SECRET_PATTERNS = [
  /cursor_[A-Za-z0-9_-]{8,}/g,
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /sk-[A-Za-z0-9_-]{8,}/g,
  /Authorization:\s*\S+/gi,
  /WEBFLOW_TOKEN=\S+/gi,
  /CURSOR_API_KEY=\S+/gi,
];

export function sanitizePublicText(value: string): string {
  let next = value;
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[redacted]");
  }
  return next.slice(0, 4000);
}

export function summarizeUnknown(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    return sanitizePublicText(value);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const message =
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : undefined;
    if (message) {
      return sanitizePublicText(message);
    }

    const isError =
      record.isError === true ||
      record.success === false ||
      record.status === "error";
    if (isError) {
      return "The Webflow MCP tool reported an error.";
    }
  }

  return undefined;
}
