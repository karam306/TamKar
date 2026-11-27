"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { money } from "@/lib/fx";
import {
  contentId,
  hasVariants,
  isSoldOut,
  priceRange,
} from "@/lib/product-utils";
import type { Product } from "@/lib/types";
import { useStore } from "./store-context";
import { track } from "./tracking";

export function CartButton() {
  const { base, count, ready } = useStore();
  return (
    <Link
      href={`${base}/cart`}
      className="relative flex items-center gap-2 rounded-theme px-3 py-2 hover:bg-surface"
      aria-label="السلة"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 7h12l-1 13H7L6 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute -top-1 -left-1 min-w-5 h-5 rounded-full bg-primary px-1 text-center text-xs leading-5 text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function AddToCart({
  productId,
  variantId,
  disabled,
  full,
  qty = 1,
  label,
  price,
}: {
  productId: string;
  variantId?: string;
  price?: number;
  disabled?: boolean;
  full?: boolean;
  qty?: number;
  label?: string;
}) {
  const { add, setQty, cart, base, currency, count } = useStore();
  const [toast, setToast] = useState<number | null>(null);
  const inCart =
    cart.find(
      (i) =>
        i.productId === productId && (i.variantId ?? "") === (variantId ?? ""),
    )?.qty ?? 0;

  function doAdd() {
    add(productId, qty, variantId);
    track.addToCart(contentId(productId, variantId), price ?? 0, currency, qty);
    const id = Date.now();
    setToast(id);
    setTimeout(() => setToast((t) => (t === id ? null : t)), 3500);
  }

  const toastBar =
    toast && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md md:bottom-4 items-center gap-3 rounded-theme bg-text p-3 text-sm text-white shadow-lg"
            style={{ animation: "tkup .2s ease-out" }}
            role="status"
          >
            <style>{`@keyframes tkup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
            <span className="flex-1">
              ✓ أُضيف إلى السلة.{" "}
              <span className="opacity-75">
                في السلة الآن: {count} {count === 1 ? "قطعة" : "قطع"}
              </span>
            </span>
            <Link
              href={`${base}/cart`}
              className="shrink-0 rounded-theme bg-white px-3 py-1.5 font-semibold text-text"
            >
              الذهاب إلى السلة
            </Link>
          </div>,
          document.body,
        )
      : null;

  // Small buttons (product cards): once in the cart, show - qty + so it is not added again by mistake.
  if (!full && inCart > 0 && !disabled) {
    return (
      <>
        <div
          className="flex w-full items-center justify-between rounded-theme border-2 border-primary text-sm"
          aria-label="الكمية في السلة"
        >
          <button
            type="button"
            onClick={() => setQty(productId, inCart - 1, variantId)}
            className="px-3 py-1.5 text-lg leading-none text-primary"
            aria-label="إنقاص"
          >
            −
          </button>
          <span className="font-semibold text-primary">✓ {inCart} في السلة</span>
          <button
            type="button"
            onClick={doAdd}
            className="px-3 py-1.5 text-lg leading-none text-primary"
            aria-label="زيادة"
          >
            +
          </button>
        </div>
        {toastBar}
      </>
    );
  }

  return (
    <div className="w-full space-y-2">
      {full && inCart > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-theme bg-green-50 px-3 py-2 text-sm text-green-800">
          <span>
            ✓ لديك <b>{inCart}</b> من هذا المنتج في السلة
          </span>
          <Link href={`${base}/cart`} className="font-semibold underline">
            عرض السلة
          </Link>
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={doAdd}
        className={`btn ${full ? "w-full" : "w-full text-sm !py-2"} ${full && inCart > 0 ? "btn-outline" : ""}`}
      >
        {label ||
          (disabled
            ? "نفدت الكمية"
            : inCart > 0
              ? qty > 1
                ? `أضف ${qty} أخرى`
                : "أضف قطعة أخرى"
              : "أضف إلى السلة")}
      </button>
      {full && inCart > 0 && (
        <Link href={`${base}/cart`} className="btn w-full">
          إتمام الطلب
        </Link>
      )}
      {toastBar}
    </div>
  );
}

export function Price({
  amount,
  compare,
  from,
  className = "",
}: {
  amount: number;
  compare?: number | null;
  from?: boolean;
  className?: string;
}) {
  const { currency, fx } = useStore();
  const m = money(currency, fx ?? null);
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="font-semibold text-primary">
        {from && <span className="text-sm font-normal text-muted">من </span>}
        {m.price(amount)}
      </span>
      {compare && compare > amount ? (
        <span className="text-sm text-muted line-through">
          {m.text(m.unit(compare))}
        </span>
      ) : null}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { base } = useStore();
  const soldOut = isSoldOut(product);
  const range = priceRange(product);
  const href = `${base}/p/${product.id}`;
  const pct =
    !soldOut && range.compare && range.compare > range.min
      ? Math.round((1 - range.min / range.compare) * 100)
      : 0;
  return (
    <div className="group flex flex-col">
      <div className="relative">
        <Link href={href} className="st-card-img block aspect-square overflow-hidden rounded-theme bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0] || "/demo/k1.svg"}
            alt={product.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${soldOut ? "opacity-60 grayscale" : ""}`}
          />
        </Link>
        {soldOut ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-semibold text-white">نفدت الكمية</span>
        ) : pct > 0 ? (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white" dir="ltr">
            -{pct}%
          </span>
        ) : null}
        {!soldOut && (
          <div className="absolute bottom-2 left-2">
            {hasVariants(product) ? (
              <Link
                href={href}
                aria-label={`اختر خيارات ${product.title}`}
                className="flex h-10 items-center rounded-full bg-white/95 px-4 text-sm font-semibold text-text shadow-md hover:bg-white"
              >
                اختر
              </Link>
            ) : (
              <QuickAdd productId={product.id} price={product.price} title={product.title} />
            )}
          </div>
        )}
      </div>
      <Link href={href} className="mt-3 line-clamp-2 text-[15px] font-medium leading-6 hover:text-primary">
        {product.title}
      </Link>
      <Price amount={range.min} compare={range.compare} from={range.max > range.min} className="mt-1" />
    </div>
  );
}

/** Round "+" on the product photo; becomes "− 2 +" once in the cart. */
function QuickAdd({ productId, price, title }: { productId: string; price: number; title: string }) {
  const { add, setQty, cart, currency } = useStore();
  const inCart = cart.find((i) => i.productId === productId && !i.variantId)?.qty ?? 0;
  const plus = () => {
    add(productId, 1);
    track.addToCart(contentId(productId), price, currency, 1);
  };
  if (inCart > 0)
    return (
      <div className="flex h-10 items-center gap-1 rounded-full bg-primary px-1 text-white shadow-md" aria-label="الكمية في السلة">
        <button type="button" onClick={() => setQty(productId, inCart - 1)} className="h-8 w-8 rounded-full text-lg leading-none hover:bg-white/15" aria-label="إنقاص">
          −
        </button>
        <span className="min-w-5 text-center text-sm font-bold">{inCart}</span>
        <button type="button" onClick={plus} className="h-8 w-8 rounded-full text-lg leading-none hover:bg-white/15" aria-label="زيادة">
          +
        </button>
      </div>
    );
  return (
    <button
      type="button"
      onClick={plus}
      aria-label={`أضف ${title} إلى السلة`}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-text shadow-md transition hover:bg-primary hover:text-white"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

export function StoreLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { base } = useStore();
  return (
    <Link href={`${base}${href}`} className={className}>
      {children}
    </Link>
  );
}

/** Phones: cart and WhatsApp always under the thumb. Hidden on the cart page itself. */
export function MobileBar() {
  const { base, count, ready, whatsapp } = useStore();
  const path = usePathname();
  if (path === `${base}/cart` || path.endsWith("/cart")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-bg/95 px-3 py-2 backdrop-blur md:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="واتساب"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme border border-black/10 text-[#128C4B]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2s-1 .2-3.3-.7c-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.7-.1 1.3z" />
          </svg>
        </a>
        <Link href={`${base}/cart`} className="btn flex h-11 flex-1 items-center justify-center gap-2 !py-0">
          السلة
          {ready && count > 0 && (
            <span className="rounded-full bg-white/25 px-2 text-sm">{count}</span>
          )}
        </Link>
      </div>
    </div>
  );
}
