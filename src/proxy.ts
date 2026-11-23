import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_DOMAIN, ROOT_DOMAIN } from "@/lib/brand";

/**
 * Routes every request to the right store based on the address:
 *   kunstores.com / www.kunstores.com / *.vercel.app  -> platform pages and dashboard (stores at /s/<slug>)
 *   ahmad.kunstores.com                         -> store "ahmad"
 *   ahmadstore.com (custom domain)              -> store with that verified domain
 */
const ROOT = ROOT_DOMAIN;
const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/(rest|auth|storage)\/v1$/, "");
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  const isPlatform =
    host === ROOT ||
    host === `www.${ROOT}` ||
    host === PLATFORM_DOMAIN ||
    host === `www.${PLATFORM_DOMAIN}` ||
    host.endsWith(".vercel.app") ||
    host.startsWith("127.0.0.1") ||
    host === "";

  if (isPlatform) {
    // Old store links (kunstores.com/s/ahmad) move to the store's own address (ahmad.kunstores.com).
    // The design preview inside the dashboard keeps using /s/<slug> in an iframe.
    const old = pathname.match(/^\/s\/([a-z0-9-]{2,40})(\/.*)?$/);
    if (old && (host === ROOT || host === `www.${ROOT}`) && !ROOT.startsWith("localhost") && request.headers.get("sec-fetch-dest") !== "iframe") {
      return NextResponse.redirect(`https://${old[1]}.${ROOT}${old[2] || "/"}${search}`, 308);
    }
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname === "/login" || pathname === "/signup") {
      return refreshSession(request);
    }
    return NextResponse.next();
  }

  let key: string;
  if (host.endsWith(`.${ROOT}`)) {
    key = host.slice(0, -(ROOT.length + 1));
    if (!/^[a-z0-9-]{2,40}$/.test(key)) return new NextResponse("Not found", { status: 404 });
  } else {
    key = host.split(":")[0]; // custom domain
  }

  const url = request.nextUrl.clone();
  const path = pathname === "/sitemap.xml" ? "/store-sitemap" : pathname === "/robots.txt" ? "/store-robots" : pathname;
  url.pathname = `/s/${key}${path === "/" ? "" : path}`;
  url.search = search;
  const headers = new Headers(request.headers);
  headers.set("x-store-host", "1"); // links inside the store drop the /s/<key> prefix
  return NextResponse.rewrite(url, { request: { headers } });
}

/** Keeps the merchant's login fresh (Supabase sessions expire and must be renewed). */
async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!SB_URL || !SB_KEY) return response;
  const supabase = createServerClient(SB_URL, SB_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refreshes the login token when it is about to expire; otherwise checks it locally.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/|demo/|favicon.ico).*)"],
};
