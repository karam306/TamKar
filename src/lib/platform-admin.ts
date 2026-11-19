import "server-only";
import { notFound, redirect } from "next/navigation";
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

/** Not signed in: go to login. Signed in as someone else: plain "page not found". */
export async function requirePlatformAdmin() {
  const email = await currentEmail();
  if (!email) redirect("/login");
  if (!ADMINS.includes(email)) notFound();
  return { email };
}

export const adminConfigured = () => ADMINS.length > 0;
