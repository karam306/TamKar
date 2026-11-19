"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { AddToCart, Price } from "./store-ui";

/** Option buttons (size, colour...) on the product page. */
export function VariantPicker({ product }: { product: Product }) {
  const options = product.options ?? [];
  const variants = product.variants ?? [];
  const firstAvailable = variants.find((v) => v.stock !== 0) ?? variants[0];
  const [chosen, setChosen] = useState<string[]>(firstAvailable?.options ?? options.map((o) => o.values[0]));
  const [qty, setQty] = useState(1);

  const variant = variants.find((v) => v.options.every((val, i) => val === chosen[i]));
  const soldOut = !variant || variant.stock === 0;

  // Is this value available given the other choices?
  const available = (optIndex: number, value: string) =>
    variants.some((v) => v.options[optIndex] === value && v.stock !== 0 && v.options.every((val, i) => i === optIndex || val === chosen[i]));

  return (
    <div className="flex flex-col gap-5">
      <Price amount={variant?.price ?? product.price} compare={variant?.compare_at_price} className="text-2xl" />
      {options.map((o, oi) => (
        <div key={o.name}>
          <div className="mb-2 text-sm">
            {o.name}: <span className="font-semibold">{chosen[oi]}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.values.map((val) => {
              const active = chosen[oi] === val;
              const ok = available(oi, val);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setChosen((c) => c.map((x, i) => (i === oi ? val : x)))}
                  className={`min-w-12 rounded-theme border px-4 py-2 text-sm ${active ? "border-primary bg-primary text-white" : "border-black/15 bg-white"} ${ok ? "" : "line-through opacity-50"}`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <Quantity qty={qty} setQty={setQty} />
      <div className="max-w-sm">
        <AddToCart productId={product.id} variantId={variant?.id} price={variant?.price} qty={qty} disabled={soldOut} full label={soldOut ? "هالخيار مش متوفر" : undefined} />
      </div>
    </div>
  );
}

/** Price + quantity + add button for products without options. */
export function SimpleBuy({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const soldOut = product.stock === 0;
  return (
    <div className="flex flex-col gap-5">
      <Price amount={product.price} compare={product.compare_at_price} className="text-2xl" />
      {product.stock != null && product.stock > 0 && product.stock <= 5 && <p className="text-sm text-amber-700">باقي {product.stock} قطع بس</p>}
      <Quantity qty={qty} setQty={setQty} />
      <div className="max-w-sm">
        <AddToCart productId={product.id} price={product.price} qty={qty} disabled={soldOut} full />
      </div>
    </div>
  );
}

function Quantity({ qty, setQty }: { qty: number; setQty: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span>الكمية</span>
      <div className="flex items-center rounded-theme border border-black/15">
        <button type="button" className="px-3 py-1.5 text-lg" onClick={() => setQty(Math.min(99, qty + 1))} aria-label="زيادة">
          +
        </button>
        <span className="w-8 text-center">{qty}</span>
        <button type="button" className="px-3 py-1.5 text-lg" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="إنقاص">
          −
        </button>
      </div>
    </div>
  );
}
