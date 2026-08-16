const CHANGE_PATTERN =
  /\b(change|update|make|set|edit|increase|decrease|taller|shorter|color|background|radius|padding|margin|font|replace|rename|add|remove|delete|move)\b/i;

export function isChangeRequest(prompt: string): boolean {
  return CHANGE_PATTERN.test(prompt);
}

export function summarizeToPoints(value: string, limit = 6): string[] {
  const cleaned = value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!cleaned) {
    return [];
  }

  const fromLists = cleaned
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "").trim())
    .filter((line) => line.length > 0);

  const uniqueLists = [...new Set(fromLists.filter((line) => line.length <= 220))];
  if (uniqueLists.length >= 2) {
    return uniqueLists.slice(0, limit);
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (sentences.length > 0) {
    return sentences.slice(0, limit);
  }

  return [cleaned.slice(0, 220)];
}

export function pointsToText(points: string[]): string {
  return points.map((point) => `- ${point.replace(/^[-*]\s+/, "")}`).join("\n");
}
