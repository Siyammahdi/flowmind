import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";

const AUTH_DIR = path.join(process.cwd(), ".data");
const AUTH_FILE = path.join(AUTH_DIR, "webflow-auth.json");
const SESSION_COOKIE = "flowmind_webflow_session";

export type WebflowAuthRecord = {
  token: string;
  connectedAt: string;
  siteCount?: number;
  user?: {
    name: string;
    email?: string;
  };
};

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  };
}

async function readSessionCookie(): Promise<WebflowAuthRecord | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value?.trim();
    if (!token) {
      return null;
    }
    return {
      token,
      connectedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function readWebflowAuth(): Promise<WebflowAuthRecord | null> {
  const envToken = process.env.WEBFLOW_TOKEN?.trim();
  if (envToken) {
    return {
      token: envToken,
      connectedAt: new Date().toISOString(),
    };
  }

  const session = await readSessionCookie();
  if (session) {
    return session;
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
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, record.token, sessionCookieOptions());
  } catch (error) {
    console.warn("[flowmind] unable to persist webflow session cookie", error);
  }

  try {
    await mkdir(AUTH_DIR, { recursive: true });
    await writeFile(AUTH_FILE, JSON.stringify(record, null, 2), "utf8");
  } catch (error) {
    console.warn("[flowmind] unable to persist webflow auth file", error);
  }
}

export async function clearWebflowAuth(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
  } catch {
    // ignore
  }

  await rm(AUTH_FILE, { force: true });
}
