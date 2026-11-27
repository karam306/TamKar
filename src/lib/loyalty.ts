import type { Currency } from "./types";

/**
 * Loyalty points (update 015). Settings live in stores.shipping->'loyalty':
 * "every `per` of the store currency = 1 point" and "every `block` points = `reward` off".
 * Points are earned when an order is delivered (online or in the shop), and become a
 * one-time discount code when the merchant redeems them.
 */
export type LoyaltySettings = { enabled: boolean; per: number; block: number; reward: number };

export const WALK_IN_PHONE = "0000000000";

export function liveLoyalty(store: { shipping?: { loyalty?: Partial<LoyaltySettings> | null } | null }): LoyaltySettings | null {
  const l = store.shipping?.loyalty;
  if (!l?.enabled) return null;
  const per = Number(l.per);
  const block = Math.floor(Number(l.block));
  const reward = Number(l.reward);
  if (!(per > 0) || !(block > 0) || !(reward > 0)) return null;
  return { enabled: true, per, block, reward };
}

/** Points for an order total (after refunds). */
export function pointsFor(total: number, l: LoyaltySettings): number {
  return Math.max(0, Math.floor(total / l.per + 1e-9));
}

const ar = (n: number) => new Intl.NumberFormat("ar-SY").format(n);

/** "كل ١٠ نقاط = خصم $1" style explanation. */
export function loyaltyText(l: LoyaltySettings, currency: Currency): string {
  const cur = (n: number) => (currency === "SYP" ? `${ar(n)} ل.س` : `$${n}`);
  return `نقطة واحدة عن كل ${cur(l.per)}، وكل ${ar(l.block)} نقطة = خصم ${cur(l.reward)}`;
}
