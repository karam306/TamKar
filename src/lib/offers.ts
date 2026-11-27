/**
 * Quantity offers: "3 pieces or more: 10% off each piece". All variants of a product
 * count together. The database applies them when the order is placed (update 015);
 * these helpers show the same prices before that.
 */
export type QtyOffer = { min: number; off: number };

export function cleanOffers(raw: unknown): QtyOffer[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  return raw
    .map((t) => ({ min: Math.floor(Number(t?.min)), off: Math.round(Number(t?.off) * 10) / 10 }))
    .filter((t) => t.min >= 2 && t.min <= 999 && t.off > 0 && t.off < 100 && !seen.has(t.min) && seen.add(t.min))
    .sort((a, b) => a.min - b.min)
    .slice(0, 5);
}

/** The discount (percent) for this many pieces, or null. */
export function offerFor(offers: QtyOffer[] | undefined | null, qty: number): number | null {
  let best: number | null = null;
  for (const t of offers ?? []) if (qty >= t.min && (best === null || t.off > best)) best = t.off;
  return best;
}

/** Unit price after the offer, rounded like the database (2 decimals). */
export function offerPrice(price: number, offers: QtyOffer[] | undefined | null, qty: number): number {
  const off = offerFor(offers, qty);
  return off === null ? price : Math.round(price * (100 - off)) / 100;
}

const ar = (n: number) => new Intl.NumberFormat("ar-SY").format(n);

/** "٣ قطع فأكثر: خصم ١٠٪ على كل قطعة" */
export function offerText(t: QtyOffer): string {
  return `${ar(t.min)} ${t.min <= 10 ? "قطع" : "قطعة"} فأكثر: خصم ${ar(t.off)}٪ على كل قطعة`;
}
