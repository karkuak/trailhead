import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { UserRecord } from "./types";

export const SESSION_COOKIE = "th_uid";
export const ANON_SESSION_COOKIE = "th_sid";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Reads the logged-in user id from the session cookie (App Router: async). */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionUser(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionUser() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The anonymous per-browser session id set by proxy.ts, used for analytics + experiment bucketing. */
export async function getAnalyticsSessionId(): Promise<string> {
  const store = await cookies();
  return store.get(ANON_SESSION_COOKIE)?.value ?? "unknown-session";
}

export function getUserById(userId: string): UserRecord | undefined {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as
    | UserRecord
    | undefined;
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId) ?? null;
}
