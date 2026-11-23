/** The platform's name, in one place. */
export const BRAND = "Kun";
export const BRAND_AR = "كُن";
/** The platform's own web address. Each store lives at https://<slug>.kunstores.com */
export const PLATFORM_DOMAIN = "kunstores.com";

/**
 * Domain that store subdomains hang off. NEXT_PUBLIC_ROOT_DOMAIN can override it
 * (e.g. "localhost:3000" when working locally); in production it is kunstores.com.
 */
export const ROOT_DOMAIN = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === "production" ? PLATFORM_DOMAIN : "localhost:3000")
).toLowerCase();
