import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes every request to the right store based on the address:
 *   tamkar.com / www.tamkar.com / *.vercel.app  -> platform pages (stores at /s/<slug>)
 *   ahmad.tamkar.com                          -> store "ahmad"
 *   ahmadstore.com (custom domain)          -> store with that verified domain
 */
const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").toLowerCase();

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  const isPlatform =
    host === ROOT ||
    host === `www.${ROOT}` ||
    host.endsWith(".vercel.app") ||
    host.startsWith("127.0.0.1") ||
    host === "";

  if (isPlatform) return NextResponse.next();

  let key: string;
  if (host.endsWith(`.${ROOT}`)) {
    key = host.slice(0, -(ROOT.length + 1));
    if (!/^[a-z0-9-]{2,40}$/.test(key)) return new NextResponse("Not found", { status: 404 });
  } else {
    key = host.split(":")[0]; // custom domain
  }

  const url = request.nextUrl.clone();
  url.pathname = `/s/${key}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  const headers = new Headers(request.headers);
  headers.set("x-store-host", "1"); // links inside the store drop the /s/<key> prefix
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|demo/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
