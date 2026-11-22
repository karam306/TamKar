"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/format";
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
            className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-theme bg-text p-3 text-sm text-white shadow-lg"
            style={{ animation: "tkup .2s ease-out" }}
            role="status"
          >
            <style>{`@keyframes tkup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
            <span className="flex-1">
              ✓ انضاف للسلة.{" "}
              <span className="opacity-75">
                بالسلة هلق {count} {count === 1 ? "قطعة" : "قطع"}
              </span>
            </span>
            <Link
              href={`${base}/cart`}
              className="shrink-0 rounded-theme bg-white px-3 py-1.5 font-semibold text-text"
            >
              روح للسلة
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
          aria-label="الكمية بالسلة"
        >
          <button
            type="button"
            onClick={() => setQty(productId, inCart - 1, variantId)}
            className="px-3 py-1.5 text-lg leading-none text-primary"
            aria-label="نقّص"
          >
            −
          </button>
          <span className="font-semibold text-primary">✓ {inCart} بالسلة</span>
          <button
            type="button"
            onClick={doAdd}
            className="px-3 py-1.5 text-lg leading-none text-primary"
            aria-label="زيد"
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
            ✓ عندك <b>{inCart}</b> من هالمنتج بالسلة
          </span>
          <Link href={`${base}/cart`} className="font-semibold underline">
            شوف السلة
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
                ? `ضيف كمان ${qty}`
                : "ضيف كمان وحدة"
              : "أضف للسلة")}
      </button>
      {full && inCart > 0 && (
        <Link href={`${base}/cart`} className="btn w-full">
          كمّل الطلب
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
  const { currency } = useStore();
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="font-semibold text-primary">
        {from && <span className="text-sm font-normal text-muted">من </span>}
        {formatPrice(amount, currency)}
      </span>
      {compare && compare > amount ? (
        <span className="text-sm text-muted line-through">
          {formatPrice(compare, currency)}
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
  return (
    <div className="flex flex-col overflow-hidden rounded-theme bg-surface">
      <Link
        href={href}
        className="relative block aspect-square overflow-hidden bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0] || "/demo/k1.svg"}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {soldOut && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
            نفدت الكمية
          </span>
        )}
        {!soldOut && range.compare && range.compare > range.min && (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
            خصم
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={href} className="line-clamp-2 text-sm leading-6">
          {product.title}
        </Link>
        <Price
          amount={range.min}
          compare={range.compare}
          from={range.max > range.min}
          className="mt-auto"
        />
        {hasVariants(product) ? (
          <Link
            href={href}
            className={`btn w-full text-sm !py-2 ${soldOut ? "pointer-events-none opacity-50" : ""}`}
          >
            {soldOut ? "نفدت الكمية" : "اختار"}
          </Link>
        ) : (
          <AddToCart
            productId={product.id}
            disabled={soldOut}
            price={product.price}
          />
        )}
      </div>
    </div>
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
