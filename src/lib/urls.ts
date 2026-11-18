/** Public address of a store. Uses subdomains once the main domain is set up. */
export function storeUrl(slug: string): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  return root && !root.startsWith("localhost") ? `https://${slug}.${root}` : `/s/${slug}`;
}
