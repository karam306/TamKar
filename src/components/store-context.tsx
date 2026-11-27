"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { Fx } from "@/lib/fx";
import type { CartItem, Currency } from "@/lib/types";

type StoreInfo = { slug: string; base: string; currency: Currency; whatsapp: string; name: string; fx?: Fx | null };

type Ctx = StoreInfo & {
  cart: CartItem[];
  count: number;
  add: (productId: string, qty?: number, variantId?: string) => void;
  setQty: (productId: string, qty: number, variantId?: string) => void;
  clear: () => void;
  ready: boolean;
};

const StoreCtx = createContext<Ctx | null>(null);

// A tiny cart store kept in the browser, one per shop. Storage can be missing
// or blocked (private mode), so every access is guarded and falls back to memory.
const EMPTY: CartItem[] = [];
const memory = new Map<string, CartItem[]>();
const listeners = new Set<() => void>();

function readCart(key: string): CartItem[] {
  if (!memory.has(key)) {
    let items: CartItem[] = EMPTY;
    try {
      const raw = localStorage.getItem(key);
      if (raw) items = JSON.parse(raw);
    } catch {}
    memory.set(key, Array.isArray(items) ? items : EMPTY);
  }
  return memory.get(key)!;
}

function writeCart(key: string, items: CartItem[]) {
  memory.set(key, items);
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const same = (i: CartItem, productId: string, variantId?: string) =>
  i.productId === productId && (i.variantId ?? "") === (variantId ?? "");

export function StoreProvider({ info, children }: { info: StoreInfo; children: React.ReactNode }) {
  const key = `cart:${info.slug}`;
  const stored = useSyncExternalStore(
    subscribe,
    () => readCart(key),
    () => null, // on the server there is no cart yet
  );
  const ready = stored !== null;
  const cart = stored ?? EMPTY;

  const add = useCallback(
    (productId: string, qty = 1, variantId?: string) => {
      const c = readCart(key);
      const found = c.find((i) => same(i, productId, variantId));
      writeCart(
        key,
        found
          ? c.map((i) => (same(i, productId, variantId) ? { ...i, qty: Math.min(99, i.qty + qty) } : i))
          : [...c, variantId ? { productId, variantId, qty } : { productId, qty }],
      );
    },
    [key],
  );

  const setQty = useCallback(
    (productId: string, qty: number, variantId?: string) => {
      const c = readCart(key);
      writeCart(
        key,
        qty <= 0 ? c.filter((i) => !same(i, productId, variantId)) : c.map((i) => (same(i, productId, variantId) ? { ...i, qty: Math.min(99, qty) } : i)),
      );
    },
    [key],
  );

  const clear = useCallback(() => writeCart(key, EMPTY), [key]);

  const value = useMemo(
    () => ({ ...info, cart, count: cart.reduce((s, i) => s + i.qty, 0), add, setQty, clear, ready }),
    [info, cart, add, setQty, clear, ready],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
