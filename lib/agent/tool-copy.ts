function humanize(name: string): string {
  return name
    .replace(/^webflow[_-]?/i, "")
    .replace(/_tool$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveToolName(name: string, args?: unknown): string {
  if (args && typeof args === "object") {
    const record = args as Record<string, unknown>;
    const nested =
      record.args && typeof record.args === "object"
        ? (record.args as Record<string, unknown>)
        : undefined;
    const candidate = [record.toolName, record.name, record.tool, nested?.toolName]
      .find((value) => typeof value === "string" && value.trim().length > 0);
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return name;
}

function friendlyToolName(name: string): string {
  const readable = humanize(name);
  const lower = readable.toLowerCase();
  if (!readable || lower === "mcp") return "Using Webflow";
  if (lower.includes("site")) return "Reading sites";
  if (lower.includes("page")) return "Inspecting pages";
  if (lower.includes("element")) return "Working with elements";
  if (lower.includes("style") || lower.includes("variable")) return "Updating styles";
  if (lower.includes("cms") || lower.includes("collection")) return "Working with CMS";
  if (lower.includes("asset")) return "Working with assets";
  if (lower.includes("snapshot")) return "Capturing snapshot";
  return `Using ${readable}`;
}

export function toolLabel(
  name: string,
  status: "running" | "completed" | "error",
  args?: unknown,
): string {
  const action = friendlyToolName(resolveToolName(name, args));
  if (status === "running") {
    return action;
  }
  if (status === "error") {
    return `${action} failed`;
  }
  return action
    .replace(/^Using /, "Used ")
    .replace(/^Reading /, "Read ")
    .replace(/^Inspecting /, "Inspected ")
    .replace(/^Updating /, "Updated ")
    .replace(/^Working /, "Worked ")
    .replace(/^Capturing /, "Captured ");
}
