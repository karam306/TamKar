"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { hasVariants, isSoldOut, priceRange } from "@/lib/product-utils";
import type { Product } from "@/lib/types";
import { useStore } from "./store-context";

export function CartButton() {
  const { base, count, ready } = useStore();
  return (
    <Link href={`${base}/cart`} className="relative flex items-center gap-2 rounded-theme px-3 py-2 hover:bg-surface" aria-label="السلة">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 7h12l-1 13H7L6 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute -top-1 -left-1 min-w-5 h-5 rounded-full bg-primary px-1 text-center text-xs leading-5 text-white">{count}</span>
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
}: {
  productId: string;
  variantId?: string;
  disabled?: boolean;
  full?: boolean;
  qty?: number;
  label?: string;
}) {
  const { add } = useStore();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        add(productId, qty, variantId);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className={`btn ${full ? "w-full" : "w-full text-sm !py-2"}`}
    >
      {added ? "✓ انضاف للسلة" : label || (disabled ? "نفدت الكمية" : "أضف للسلة")}
    </button>
  );
}

export function Price({ amount, compare, from, className = "" }: { amount: number; compare?: number | null; from?: boolean; className?: string }) {
  const { currency } = useStore();
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="font-semibold text-primary">
        {from && <span className="text-sm font-normal text-muted">من </span>}
        {formatPrice(amount, currency)}
      </span>
      {compare && compare > amount ? <span className="text-sm text-muted line-through">{formatPrice(compare, currency)}</span> : null}
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
      <Link href={href} className="relative block aspect-square overflow-hidden bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.images[0] || "/demo/k1.svg"} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
        {soldOut && <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">نفدت الكمية</span>}
        {!soldOut && range.compare && range.compare > range.min && (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">خصم</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={href} className="line-clamp-2 text-sm leading-6">
          {product.title}
        </Link>
        <Price amount={range.min} compare={range.compare} from={range.max > range.min} className="mt-auto" />
        {hasVariants(product) ? (
          <Link href={href} className={`btn w-full text-sm !py-2 ${soldOut ? "pointer-events-none opacity-50" : ""}`}>
            {soldOut ? "نفدت الكمية" : "اختار"}
          </Link>
        ) : (
          <AddToCart productId={product.id} disabled={soldOut} />
        )}
      </div>
    </div>
  );
}

export function StoreLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const { base } = useStore();
  return (
    <Link href={`${base}${href}`} className={className}>
      {children}
    </Link>
  );
}
