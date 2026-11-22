import { isPro } from "@/lib/plans";
import { getMerchant } from "@/lib/auth";
import { buildSheet, PRODUCT_COLUMNS } from "@/lib/sheets";
import type { Product } from "@/lib/types";

// Downloads all products as an Excel file. ?template=1 gives an empty sheet with example rows.
export async function GET(req: Request) {
  const m = await getMerchant();
  if (!m || m.role !== "owner") return new Response("Unauthorized", { status: 401 });
  if (!isPro(m.store)) return new Response("التصدير إلى Excel متاح في الباقة الاحترافية", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const template = new URL(req.url).searchParams.get("template") === "1";
  const headers = PRODUCT_COLUMNS.map((c) => c.header);

  let rows: (string | number | null)[][] = [];
  if (template) {
    rows = [
      ["طقم صحون سيراميك 18 قطعة", "صحون سيراميك أبيض مع حواف ذهبية", 34, 42, 10, "PL-018", "صحون", "نشط"],
      ["كاسات زجاج 6 قطع", "", 9.5, "", "", "GL-006", "كاسات", "نشط"],
    ] as (string | number)[][];
  } else {
    const all: Product[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await m.db.from("products").select("*").eq("store_id", m.store.id).order("created_at").range(from, from + 999);
      all.push(...((data ?? []) as Product[]));
      if (!data || data.length < 1000) break;
    }
    rows = all.flatMap((p) =>
      (p.variants?.length ?? 0) > 0
        ? p.variants!.map((v) => [`${p.title} - ${v.title}`, p.description ?? "", Number(v.price), v.compare_at_price ?? null, v.stock ?? null, v.sku ?? "", p.category ?? "", p.active ? "نشط" : "مسودة"])
        : [[p.title, p.description ?? "", Number(p.price), p.compare_at_price == null ? null : Number(p.compare_at_price), p.stock ?? null, p.sku ?? "", p.category ?? "", p.active ? "نشط" : "مسودة"]],
    );
  }
  const file = await buildSheet("المنتجات", headers, rows);
  const name = template ? "products-template.xlsx" : `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
