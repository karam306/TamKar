import { ROOT_DOMAIN } from "@/lib/brand";

/** Public address of a store. Uses subdomains once the main domain is set up. */
export function storeUrl(slug: string): string {
  const root = ROOT_DOMAIN;
  return !root.startsWith("localhost") ? `https://${slug}.${root}` : `/s/${slug}`;
}
