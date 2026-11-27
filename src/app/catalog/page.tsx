import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MadeWithKun, StoreLogo } from "@/components/doc-brand";
import { getMerchant } from "@/lib/auth";
import { liveFx, money } from "@/lib/fx";
import type { Product } from "@/lib/types";
import { storeUrl } from "@/lib/urls";
import { PrintButton } from "../invoice/[id]/print-button";

export const metadata: Metadata = { title: "كتالوج المنتجات", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Printable product catalog. The browser's print window saves it as a PDF to send on WhatsApp. */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; prices?: string }>;
}) {
  const m = await getMerchant();
  if (!m) redirect("/login");
  const { c, prices } = await searchParams;
  const showPrices = prices !== "0";
  let title = "";
  let q = m.db
    .from("products")
    .select("id, title, price, compare_at_price, images, active, collection_ids")
    .eq("store_id", m.store.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (c && /^[0-9a-f-]{36}$/.test(c)) {
    q = q.contains("collection_ids", [c]);
    const { data: col } = await m.db.from("collections").select("title").eq("id", c).eq("store_id", m.store.id).maybeSingle();
    title = col?.title ?? "";
  }
  const { data } = await q;
  const products = (data ?? []) as Product[];
  const fx = liveFx(m.store);
  const mo = money(m.store.currency, fx);
  const base = storeUrl(m.store.slug);
  const today = new Intl.DateTimeFormat("ar-SY", { dateStyle: "long", timeZone: "Asia/Damascus" }).format(new Date());

  return (
    <div data-theme="classic" className="mx-auto max-w-4xl bg-white p-8 font-sans text-[14px] print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .cat-card { break-inside: avoid; } }`}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[13px] text-muted">
          اضغط الزر، ثم اختر «حفظ بتنسيق PDF» من نافذة الطباعة. أرسل الملف في مجموعات واتساب أو إلى الزبائن مباشرة.
        </p>
        <PrintButton label="حفظ الكتالوج PDF" />
      </div>

      <header className="mb-8 flex items-end justify-between border-b border-black/10 pb-5">
        <div>
          <StoreLogo src={m.store.logo_url} />
          <div className="text-2xl font-bold">{m.store.name}</div>
          {m.store.tagline && <div className="text-muted">{m.store.tagline}</div>}
        </div>
        <div className="text-left">
          <div className="text-xl font-bold">{title || "كتالوج المنتجات"}</div>
          <div className="text-muted">{showPrices ? `الأسعار بتاريخ ${today}` : today}</div>
          {fx && showPrices && <div className="text-[12px] text-muted">بسعر صرف {fx.rate} ل.س للدولار</div>}
        </div>
      </header>

      {products.length === 0 ? (
        <p className="py-16 text-center text-muted">لا توجد منتجات منشورة في هذا الاختيار.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {products.map((p) => (
            <a key={p.id} href={`${base}/p/${p.id}`} className="cat-card block overflow-hidden rounded-lg border border-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images?.[0] || "/demo/k1.svg"} alt="" className="aspect-square w-full bg-[#f4f4f0] object-cover" />
              <div className="space-y-1 p-3">
                <div className="line-clamp-2 font-semibold leading-snug">{p.title}</div>
                {showPrices && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{mo.price(Number(p.price))}</span>
                    {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
                      <span className="text-[12px] text-muted line-through">{mo.text(mo.unit(Number(p.compare_at_price)))}</span>
                    )}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <footer className="mt-10 text-center">
        <div className="font-semibold">للطلب: اضغط على أي منتج، أو زر متجرنا</div>
        <a href={base} dir="ltr" className="text-muted">{base.replace(/^https?:\/\//, "")}</a>
        <div dir="ltr" className="text-muted">+{m.store.whatsapp}</div>
      </footer>
      <MadeWithKun />
    </div>
  );
}
