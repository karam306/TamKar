import "server-only";
import { headers } from "next/headers";

/** Full address of the store as the visitor sees it, e.g. https://ahmad.tamkar.com or https://x.vercel.app/s/ahmad */
export async function storeOrigin(slug: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return h.get("x-store-host") === "1" ? `${proto}://${host}` : `${proto}://${host}/s/${slug}`;
}
