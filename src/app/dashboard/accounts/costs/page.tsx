import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Variant } from "@/lib/types";
import { AccountsTabs, Need018 } from "../ui";
import { CostsForm, type CostRow } from "./costs-form";

export default async function CostsPage({ searchParams }: { searchParams: Promise<{ q?: string; missing?: string }> }) {
  const { store } = await requireOwner();
  const { q = "", missing } = await searchParams;
  const db = supabaseAdmin();
  let query = db.from("products").select("id, title, price, variants").eq("store_id", store.id).order("title").limit(1000);
  if (q.trim()) query = query.ilike("title", `%${q.trim().replace(/[%_,]/g, "")}%`);
  const [{ data: products }, { data: costs, error }] = await Promise.all([
    query,
    db.from("product_costs").select("product_id, cost, variant_costs").eq("store_id", store.id),
  ]);
  const header = (
    <>
      <PageHeader title="الحسابات" />
      <AccountsTabs active="/dashboard/accounts/costs" />
    </>
  );
  if (error) return (<div>{header}<Need018 /></div>);

  const byId = new Map((costs ?? []).map((c) => [c.product_id as string, c]));
  let rows: CostRow[] = (products ?? []).map((p) => {
    const c = byId.get(p.id as string);
    const vc = (c?.variant_costs as Record<string, number>) ?? {};
    return {
      id: p.id as string,
      title: p.title as string,
      price: Number(p.price),
      cost: c?.cost == null ? null : Number(c.cost),
      variants: ((p.variants as Variant[]) ?? []).map((v) => ({ title: v.title, price: Number(v.price), cost: vc[v.title] ?? null })),
    };
  });
  const without = rows.filter((r) => r.cost == null && r.variants.every((v) => v.cost == null)).length;
  if (missing) rows = rows.filter((r) => r.cost == null && r.variants.every((v) => v.cost == null));

  return (
    <div className="space-y-4">
      {header}
      <section className="card space-y-3 p-4">
        <p className="text-[13px] text-muted">
          سعر التكلفة هو ما دفعته لتشتري المنتج أو تصنعه. لا يراه الزبائن ولا الموظفون، ويُحسب منه ربحك في كل بيعة.
          {without > 0 && <> يوجد {without} منتج دون سعر تكلفة.</>}
        </p>
        <form className="flex flex-wrap gap-2" action="/dashboard/accounts/costs">
          <input name="q" defaultValue={q} placeholder="ابحث عن منتج..." className="input max-w-xs !py-1.5" />
          <label className="flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" name="missing" value="1" defaultChecked={!!missing} className="h-4 w-4 accent-black" />
            دون سعر تكلفة فقط
          </label>
          <button className="btn btn-outline">عرض</button>
        </form>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted">لا منتجات هنا.</p>
        ) : (
          <CostsForm rows={rows} unit={store.currency === "SYP" ? "ل.س" : "$"} />
        )}
      </section>
    </div>
  );
}
