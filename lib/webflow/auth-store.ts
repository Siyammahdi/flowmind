import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const AUTH_DIR = path.join(process.cwd(), ".data");
const AUTH_FILE = path.join(AUTH_DIR, "webflow-auth.json");

export type WebflowAuthRecord = {
  token: string;
  connectedAt: string;
  siteCount?: number;
};

export async function readWebflowAuth(): Promise<WebflowAuthRecord | null> {
  const envToken = process.env.WEBFLOW_TOKEN?.trim();
  if (envToken) {
    return {
      token: envToken,
      connectedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = await readFile(AUTH_FILE, "utf8");
    const parsed = JSON.parse(raw) as WebflowAuthRecord;
    if (!parsed.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getWebflowToken(): Promise<string | null> {
  const auth = await readWebflowAuth();
  return auth?.token ?? null;
}

export async function saveWebflowAuth(record: WebflowAuthRecord): Promise<void> {
  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(AUTH_FILE, JSON.stringify(record, null, 2), "utf8");
}

export async function clearWebflowAuth(): Promise<void> {
  await rm(AUTH_FILE, { force: true });
}
