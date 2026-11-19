import type { Product, Variant } from "./types";

export const hasVariants = (p: Product) => (p.variants?.length ?? 0) > 0;

/** Lowest price shown on product cards ("from $10" when variants differ). */
export function priceRange(p: Product): { min: number; max: number; compare?: number | null } {
  if (!hasVariants(p)) return { min: Number(p.price), max: Number(p.price), compare: p.compare_at_price };
  const prices = p.variants!.map((v) => Number(v.price));
  const cheapest = p.variants!.reduce((a, b) => (Number(b.price) < Number(a.price) ? b : a));
  return { min: Math.min(...prices), max: Math.max(...prices), compare: cheapest.compare_at_price };
}

export function isSoldOut(p: Product): boolean {
  if (hasVariants(p)) return p.variants!.every((v) => v.stock === 0);
  return p.stock === 0;
}

export function totalStock(p: Product): number | null {
  if (!hasVariants(p)) return p.stock ?? null;
  if (p.variants!.some((v) => v.stock == null)) return null;
  return p.variants!.reduce((s, v) => s + (v.stock ?? 0), 0);
}

export function findVariant(p: Product, variantId?: string): Variant | undefined {
  return p.variants?.find((v) => v.id === variantId);
}

/** Every combination of option values, e.g. S/أحمر, S/أزرق, M/أحمر... */
export function combinations(options: { values: string[] }[]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((c) => o.values.map((v) => [...c, v])), [[]]).filter((c) => c.length > 0);
}

export function slugify(input: string): string {
  const s = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || `c-${Math.random().toString(36).slice(2, 8)}`;
}
