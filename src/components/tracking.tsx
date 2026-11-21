"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

// Store visit tracking (our own reports) + Meta Pixel (ads). Both are optional and
// fail silently, so tracking can never break shopping.

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
declare global {
  interface Window {
    fbq?: Fbq;
    __tk?: { slug: string };
  }
}

type Kind = "page" | "product" | "cart" | "checkout";

/** True the first time this visitor does `what` in this visit. */
function firstTime(slug: string, what: string) {
  try {
    const key = `tk_${what}_${slug}`;
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {}
  return true;
}

// Funnel steps (product, cart, checkout) count once per visit, so each step is
// "visits that got this far" and can never be bigger than the visits.
function beacon(want: Kind) {
  const slug = window.__tk?.slug;
  if (!slug) return;
  const fresh = firstTime(slug, "s");
  let kind = want;
  if (want !== "page" && !firstTime(slug, want)) {
    if (want !== "product") return; // second add-to-cart in the same visit: nothing new
    kind = "page"; // another product page: still a page view
  }
  try {
    const body = JSON.stringify({ slug, kind, s: fresh });
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {}
}

function pixel(event: string, data?: Record<string, unknown>, eventId?: string) {
  try {
    window.fbq?.("track", event, data ?? {}, eventId ? { eventID: eventId } : undefined);
  } catch {}
}

export const track = {
  viewContent(id: string, title: string, value: number, currency: string) {
    beacon("product");
    pixel("ViewContent", { content_ids: [id], content_name: title, content_type: "product", value, currency });
  },
  addToCart(id: string, value: number, currency: string, qty: number) {
    beacon("cart");
    pixel("AddToCart", { content_ids: [id], content_type: "product", value: value * qty, currency, contents: [{ id, quantity: qty }] });
  },
  initiateCheckout(value: number, currency: string, items: number) {
    beacon("checkout");
    pixel("InitiateCheckout", { value, currency, num_items: items });
  },
  purchase(orderId: string, value: number, currency: string, items: { id: string; quantity: number }[]) {
    pixel("Purchase", { value, currency, content_type: "product", content_ids: items.map((i) => i.id), contents: items }, orderId);
  },
};

/** Loads the Pixel (if the store has one) and counts page views. */
export function StoreTracking({ slug, pixelId }: { slug: string; pixelId?: string | null }) {
  const path = usePathname();
  const first = useRef(true);

  useEffect(() => {
    window.__tk = { slug };
  }, [slug]);

  useEffect(() => {
    // Product pages are counted by track.viewContent instead.
    if (!/\/p\//.test(path)) beacon("page");
    if (!first.current) pixel("PageView");
    first.current = false;
  }, [path]);

  if (!pixelId || !/^\d{5,20}$/.test(pixelId)) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
    </Script>
  );
}

/** Drop into a product page to report a product view once. */
export function TrackProductView({ id, title, value, currency }: { id: string; title: string; value: number; currency: string }) {
  useEffect(() => {
    track.viewContent(id, title, value, currency);
  }, [id, title, value, currency]);
  return null;
}
