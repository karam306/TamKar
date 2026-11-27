import { randomUUID } from "node:crypto";
import { combinations } from "./product-utils";
import type { ProductOption, Variant } from "./types";

export const toNum = (v: unknown): number | null => {
  const s = String(v ?? "")
    .replace(/,/g, "")
    .trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
export const txt = (v: unknown, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

export function parseJSON<T>(v: FormDataEntryValue | null, fallback: T): T {
  try {
    return JSON.parse(String(v ?? "")) as T;
  } catch {
    return fallback;
  }
}

/** Checks options and variants sent by the editor and rebuilds them cleanly. */
export function cleanVariants(
  rawOptions: unknown,
  rawVariants: unknown,
): { options: ProductOption[]; variants: Variant[] } | { error: string } {
  const options: ProductOption[] = (Array.isArray(rawOptions) ? rawOptions : [])
    .slice(0, 3)
    .map((o: { name?: unknown; values?: unknown }) => ({
      name: txt(o?.name, 30),
      values: [
        ...new Set(
          (Array.isArray(o?.values) ? o.values : [])
            .map((v: unknown) => txt(v, 40))
            .filter(Boolean),
        ),
      ].slice(0, 30),
    }))
    .filter((o) => o.name && o.values.length);
  if (options.length === 0) return { options: [], variants: [] };

  const combos = combinations(options);
  if (combos.length > 100)
    return { error: "عدد الخيارات كبير جداً (الحد الأقصى 100)" };
  const sent = Array.isArray(rawVariants)
    ? (rawVariants as Partial<Variant>[])
    : [];

  const variants: Variant[] = [];
  for (const combo of combos) {
    const match = sent.find(
      (v) =>
        Array.isArray(v.options) && v.options.join("|") === combo.join("|"),
    );
    const price = toNum(match?.price);
    const compare = toNum(match?.compare_at_price);
    const stock = toNum(match?.stock);
    const title = combo.join(" / ");
    if (price === null || Number.isNaN(price))
      return { error: `أدخل سعراً للخيار "${title}"` };
    if (Number.isNaN(stock) || Number.isNaN(compare))
      return { error: `يوجد رقم غير صحيح في الخيار "${title}"` };
    variants.push({
      id:
        typeof match?.id === "string" && /^[\w-]{1,40}$/.test(match.id)
          ? match.id
          : randomUUID().slice(0, 8),
      title,
      options: combo,
      price,
      compare_at_price: compare && compare > price ? compare : null,
      stock: stock === null ? null : Math.floor(stock),
      sku: txt(match?.sku, 60) || null,
    });
  }
  return { options, variants };
}

