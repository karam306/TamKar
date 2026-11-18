"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
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

export function AddToCart({ productId, disabled, full }: { productId: string; disabled?: boolean; full?: boolean }) {
  const { add } = useStore();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        add(productId);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className={`btn ${full ? "w-full" : "w-full text-sm !py-2"}`}
    >
      {disabled ? "نفدت الكمية" : added ? "✓ انضاف للسلة" : "أضف للسلة"}
    </button>
  );
}

export function Price({ amount, compare, className = "" }: { amount: number; compare?: number | null; className?: string }) {
  const { currency } = useStore();
  return (
    <span className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="font-semibold text-primary">{formatPrice(amount, currency)}</span>
      {compare && compare > amount ? (
        <span className="text-sm text-muted line-through">{formatPrice(compare, currency)}</span>
      ) : null}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { base } = useStore();
  const soldOut = product.stock === 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-theme bg-surface">
      <Link href={`${base}/p/${product.id}`} className="block aspect-square overflow-hidden bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.images[0] || "/demo/k1.svg"} alt={product.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`${base}/p/${product.id}`} className="line-clamp-2 text-sm leading-6">
          {product.title}
        </Link>
        <Price amount={product.price} compare={product.compare_at_price} className="mt-auto" />
        <AddToCart productId={product.id} disabled={soldOut} />
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
