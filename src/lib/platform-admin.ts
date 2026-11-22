import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/** Platform owners are listed by email in the PLATFORM_ADMIN_EMAILS setting on Vercel. */
const ADMINS = (process.env.PLATFORM_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null) => Boolean(email && ADMINS.includes(email.toLowerCase()));

async function currentEmail(): Promise<string | null> {
  const s = await getSessionUser();
  return s?.user.email?.toLowerCase() ?? null;
}

export async function getPlatformAdmin(): Promise<{ email: string } | null> {
  if (ADMINS.length === 0) return null;
  const email = await currentEmail();
  return email && ADMINS.includes(email) ? { email } : null;
}

/** Not signed in, or signed in as a merchant: go to the platform login page. */
export async function requirePlatformAdmin() {
  const email = await currentEmail();
  if (!email || !ADMINS.includes(email)) redirect("/admin/login");
  return { email };
}

/** Who is signed in right now, and whether that person is a platform owner. */
export async function adminSessionInfo(): Promise<{ email: string | null; isAdmin: boolean }> {
  const email = await currentEmail();
  return { email, isAdmin: Boolean(email && ADMINS.includes(email)) };
}

export const adminConfigured = () => ADMINS.length > 0;
