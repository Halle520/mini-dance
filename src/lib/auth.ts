import { cookies } from "next/headers";

import { ADMIN_NAME } from "./constants";

const COOKIE_NAME = "dance-user";

export { ADMIN_NAME };

export async function getCurrentUser(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value ?? null;
}

export const getSession = getCurrentUser;

export function isAdmin(name: string) {
  return name.trim().toLowerCase() === ADMIN_NAME.toLowerCase();
}

export async function setSession(name: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, name.trim(), { path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
