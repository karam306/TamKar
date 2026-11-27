import type { Currency } from "./types";

/**
 * Exchange-rate pricing. A store that prices in US dollars can set today's rate,
 * and customers then see (and pay) Syrian pounds. Prices stay in dollars in the
 * database; only what is shown changes. Each order keeps the rate it was placed at.
 */
export type Fx = {
  /** Syrian pounds for one US dollar (new pound). */
  rate: number;
  /** Round customer prices up to this step: 1, 5, 10, 50, 100... */
  round: number;
  /** "syp": pounds only. "both": pounds, with the dollar price beside it. */
  show: "syp" | "both";
  updated_at?: string | null;
};

export const FX_ROUND_STEPS = [1, 5, 10, 50, 100, 500];

/** The rate in force for a store, or null when prices show as they are. */
export function liveFx(store: {
  currency: Currency;
  shipping?: { fx?: Fx | null } | null;
}): Fx | null {
  const fx = store.shipping?.fx;
  if (store.currency !== "USD" || !fx || !(Number(fx.rate) > 0)) return null;
  return {
    rate: Number(fx.rate),
    round: Number(fx.round) > 0 ? Number(fx.round) : 1,
    show: fx.show === "both" ? "both" : "syp",
    updated_at: fx.updated_at ?? null,
  };
}

/** One dollar amount in pounds, rounded up to the store's step (the store never loses). */
export function toSyp(usd: number, fx: Fx): number {
  const step = fx.round > 0 ? fx.round : 1;
  return Math.ceil((usd * fx.rate) / step - 1e-9) * step;
}

const num = (n: number, max: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: max }).format(n);

function plain(amount: number, currency: Currency): string {
  return currency === "SYP" ? `${num(amount, 0)} ل.س` : `$${num(amount, 2)}`;
}

/**
 * Everything needed to show money for a store (or an order, with the rate it kept).
 * `price` for one unit price, `totals` for a set of lines so that the total is
 * always the sum of the lines the customer sees.
 */
export function money(currency: Currency, fx: Fx | null) {
  const cur: Currency = fx ? "SYP" : currency;
  const unit = (usd: number) => (fx ? toSyp(usd, fx) : usd);
  /** Already converted amount, with the dollar hint when the store shows both. */
  const text = (amount: number, usd?: number) =>
    fx?.show === "both" && usd != null
      ? `${plain(amount, cur)} ($${num(usd, 2)})`
      : plain(amount, cur);
  const price = (usd: number) => text(unit(usd), usd);
  const totals = (
    items: { price: number; qty: number }[],
    discount = 0,
    shipping = 0,
  ) => {
    const subtotal = items.reduce((s, i) => s + unit(i.price) * i.qty, 0);
    const d = discount > 0 ? unit(discount) : 0;
    const sh = shipping > 0 ? unit(shipping) : 0;
    return { subtotal, discount: d, shipping: sh, total: Math.max(0, subtotal - d + sh) };
  };
  return { cur, fx, unit, text, price, totals };
}
