import type { ActivityEvent } from "@/lib/agent/types";

export type HistoryEntry = {
  id: string;
  prompt: string;
  createdAt: number;
  events: ActivityEvent[];
  siteName?: string;
};

const STORAGE_KEY = "flowmind_history";
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveEntry(entry: HistoryEntry): void {
  const history = loadHistory();
  const existing = history.findIndex((item) => item.id === entry.id);
  if (existing !== -1) {
    history[existing] = entry;
  } else {
    history.unshift(entry);
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(history.slice(0, MAX_ENTRIES)),
  );
}

export function deleteEntry(id: string): void {
  const history = loadHistory().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
