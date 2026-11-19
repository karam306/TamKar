import "server-only";
import { notFound } from "next/navigation";
import { supabaseUser } from "./auth";
import { hasSupabase } from "./supabase";

/** Platform owners are listed by email in the PLATFORM_ADMIN_EMAILS setting on Vercel. */
const ADMINS = (process.env.PLATFORM_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null) => Boolean(email && ADMINS.includes(email.toLowerCase()));

export async function getPlatformAdmin(): Promise<{ email: string } | null> {
  if (!hasSupabase || ADMINS.length === 0) return null;
  const db = await supabaseUser();
  const {
    data: { user },
  } = await db.auth.getUser();
  const email = user?.email?.toLowerCase();
  return email && ADMINS.includes(email) ? { email } : null;
}

/** Anyone else gets a plain "page not found", so the panel's existence isn't revealed. */
export async function requirePlatformAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) notFound();
  return admin;
}

export const adminConfigured = () => ADMINS.length > 0;
