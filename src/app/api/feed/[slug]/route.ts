import { ROOT_DOMAIN } from "@/lib/brand";
import { getCollections, getStore, isDemoStore } from "@/lib/data";
import { demoProducts } from "@/lib/demo-data";
import { hasSupabase, supabasePublic } from "@/lib/supabase";
import { contentId } from "@/lib/product-utils";
import type { Product } from "@/lib/types";
import { isPro } from "@/lib/plans";

// Product catalog for Meta Commerce Manager (Data feed, scheduled every hour).
// One row per product, or per option combination (grouped with item_group_id).
// custom_label_0 holds the collection names, so product sets can be made with a filter once.

const COLUMNS = [
  "id", "item_group_id", "title", "description", "availability", "condition", "price", "sale_price",
  "link", "image_link", "additional_image_link", "brand", "product_type", "size", "color",
  "custom_label_0", "custom_label_1", "quantity_to_sell_on_facebook",
];

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v).replace(/\r?\n/g, " ");
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (n: number, cur: string) => `${n.toFixed(2)} ${cur}`;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug.replace(/\.csv$/, ""));
  if (!store || !isPro(store)) return new Response("Not found", { status: 404 });

  const origin = new URL(req.url).origin;
  const root = ROOT_DOMAIN;
  const storeBase = !root.startsWith("localhost") ? `https://${store.slug}.${root}` : `${origin}/s/${store.slug}`;
  const img = (u?: string) => (!u ? "" : u.startsWith("http") ? u : `${origin}${u}${u.startsWith("/api/media/") ? "?f=jpg" : ""}`);

  let products: Product[] = [];
  if (isDemoStore(store.id) || !hasSupabase) {
    products = demoProducts.filter((p) => p.store_id === store.id && p.active);
  } else {
    for (let from = 0; from < 50000; from += 1000) {
      const { data } = await supabasePublic()
        .from("products")
        .select("id, title, description, price, compare_at_price, images, category, stock, sku, options, variants, collection_ids")
        .eq("store_id", store.id)
        .eq("active", true)
        .order("created_at")
        .range(from, from + 999);
      products.push(...((data ?? []) as Product[]));
      if (!data || data.length < 1000) break;
    }
  }
  const collections = await getCollections(store.id);
  const colName = (ids?: string[]) => (ids ?? []).map((id) => collections.find((c) => c.id === id)?.title).filter(Boolean).join(" | ");

  const rows: string[] = [COLUMNS.join(",")];
  for (const p of products.filter((x) => x.images?.length)) {
    const base = {
      title: p.title,
      description: p.description || p.title,
      condition: "new",
      link: `${storeBase}/p/${p.id}`,
      image_link: img(p.images[0]),
      additional_image_link: p.images.slice(1, 10).map(img).join(","),
      brand: store.name,
      product_type: p.category ?? "",
      custom_label_0: colName(p.collection_ids),
      custom_label_1: p.category ?? "",
    };
    const sizeIdx = (p.options ?? []).findIndex((o) => /مقاس|قياس|size/i.test(o.name));
    const colorIdx = (p.options ?? []).findIndex((o) => /لون|color|colour/i.test(o.name));
    const out = (id: string, group: string, price: number, compare: number | null | undefined, stock: number | null | undefined, extra: { size?: string; color?: string; title?: string }) => {
      const onSale = compare != null && compare > price;
      const row: Record<string, unknown> = {
        ...base,
        id,
        item_group_id: group,
        title: extra.title ?? base.title,
        availability: stock === 0 ? "out of stock" : "in stock",
        price: money(onSale ? compare! : price, store.currency),
        sale_price: onSale ? money(price, store.currency) : "",
        size: extra.size ?? "",
        color: extra.color ?? "",
        quantity_to_sell_on_facebook: stock ?? "",
      };
      rows.push(COLUMNS.map((c) => csv(row[c])).join(","));
    };
    if ((p.variants?.length ?? 0) > 0) {
      for (const v of p.variants!) {
        out(contentId(p.id, v.id), p.id, Number(v.price), v.compare_at_price, v.stock, {
          title: `${p.title} - ${v.title}`,
          size: sizeIdx >= 0 ? v.options[sizeIdx] : undefined,
          color: colorIdx >= 0 ? v.options[colorIdx] : undefined,
        });
      }
    } else {
      out(p.id, "", Number(p.price), p.compare_at_price == null ? null : Number(p.compare_at_price), p.stock, {});
    }
  }

  return new Response("﻿" + rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
