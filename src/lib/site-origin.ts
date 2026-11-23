import "server-only";
import { headers } from "next/headers";
import { ROOT_DOMAIN } from "@/lib/brand";

/** Full address of the store as the visitor sees it, e.g. https://ahmad.kunstores.com or https://x.vercel.app/s/ahmad */
export async function storeOrigin(slug: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return h.get("x-store-host") === "1" ? `${proto}://${host}` : `${proto}://${host}/s/${slug}`;
}

/** Address of the platform itself (dashboard, admin), even when called from a store's own address. */
export async function platformOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const root = ROOT_DOMAIN;
  if (h.get("x-store-host") === "1") return root.startsWith("localhost") ? `http://${root}` : `https://www.${root}`;
  return `${proto}://${host}`;
}
