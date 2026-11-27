import { notFound } from "next/navigation";
import { isPro, PLAN_LABELS } from "@/lib/plans";
import { Card, PageHeader } from "@/components/admin-ui";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { formatPrice, whatsappLink } from "@/lib/format";
import { daysLeft, SUB_LABELS, subState } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeWhatsapp } from "@/lib/templates";
import { storeUrl } from "@/lib/urls";
import { saveMerchantInfo, setPaidUntil, setStoreStatus } from "@/app/admin/actions";
import { loadSalesmen, loadStores } from "@/app/admin/data";
import { setStoreSalesman } from "@/app/admin/platform-actions";
import { PaymentForm, PlanSwitcher, ResetPassword } from "./forms";
import { MetaCard } from "./meta-card";
import { getStoreMeta, metaConfig } from "@/lib/meta-managed";

const PLANS = PLAN_LABELS;

export default async function AdminStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [all, salesmen] = await Promise.all([loadStores(), loadSalesmen()]);
  const s = all.find((x) => x.id === id);
  if (!s) notFound();
  const { data: payments } = await supabaseAdmin().from("subscription_payments").select("*").eq("store_id", id).order("created_at", { ascending: false });
  const [{ row: meta, missing: metaMissing }, { data: own }] = await Promise.all([
    getStoreMeta(id),
    supabaseAdmin().from("stores").select("meta_pixel_id").eq("id", id).maybeSingle(),
  ]);
  const st = subState(s);
  const left = daysLeft(s.paid_until);
  const link = storeUrl(s.slug);

  return (
    <div>
      <PageHeader
        title={s.name}
        back="/admin/stores"
        badges={<span className={`badge ${SUB_LABELS[st].className}`}>{SUB_LABELS[st].label}</span>}
        actions={
          <>
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              عرض المتجر ↗
            </a>
            <form action={setStoreStatus}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="status" value={s.status === "suspended" ? "active" : "suspended"} />
              <button className={s.status === "suspended" ? "btn" : "btn !bg-[#c70a24]"}>{s.status === "suspended" ? "تفعيل المتجر" : "إيقاف المتجر"}</button>
            </form>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card grid grid-cols-3 divide-x divide-x-reverse divide-black/5 text-center">
            <Stat label="طلبات 30 يوم" value={String(s.orders30)} />
            <Stat label="مبيعات 30 يوم" value={formatPrice(s.sales30, s.currency)} />
            <Stat label="المنتجات" value={String(s.products)} />
          </div>

          <Card title="الاشتراك">
            <div className="mb-2 text-[13px] font-semibold">الباقة</div>
            <div className="mb-4">
              <PlanSwitcher id={s.id} plan={s.plan} />
            </div>
            <div className="mb-4 grid gap-1 text-[13px] sm:grid-cols-2">
              <div>
                <span className="text-muted">حتى: </span>
                {s.paid_until ?? "دون تاريخ"}
              </div>
              <div className="text-muted">{left == null ? "" : left >= 0 ? `متبقٍّ ${left} يوم` : `انتهى منذ ${-left} يوم`}</div>
            </div>
            <PaymentForm id={s.id} currency={s.currency} />
            <details className="mt-4 text-[13px]">
              <summary className="cursor-pointer text-muted">تعديل تاريخ الاشتراك يدوياً</summary>
              <form action={setPaidUntil} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input type="date" name="paid_until" defaultValue={s.paid_until ?? ""} className="input !w-44" />
                <select name="plan" defaultValue={s.plan} className="input !w-52">
                  {Object.entries(PLANS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button className="btn btn-outline">احفظ</button>
              </form>
            </details>
          </Card>

          <Card title="إعلانات Meta (فيسبوك وإنستغرام)">
            <MetaCard
              id={s.id}
              storeName={s.name}
              merchantPhone={s.owner_phone || s.whatsapp ? normalizeWhatsapp(s.owner_phone || s.whatsapp) : null}
              meta={meta}
              configured={Boolean(metaConfig())}
              missing={metaMissing}
              ownPixel={(own?.meta_pixel_id as string | null) ?? null}
              pro={isPro(s)}
            />
          </Card>

          <Card title="الدفعات">
            {(payments ?? []).length === 0 ? (
              <p className="text-[13px] text-muted">لا توجد دفعات مسجلة</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="text-right text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-medium">التاريخ</th>
                    <th className="pb-2 font-medium">المبلغ</th>
                    <th className="pb-2 font-medium">الأشهر</th>
                    <th className="pb-2 font-medium">الطريقة</th>
                    <th className="pb-2 font-medium">حتى</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {(payments ?? []).map((p) => (
                    <tr key={p.id as string}>
                      <td className="py-2">{new Date(p.created_at as string).toLocaleDateString("en-GB")}</td>
                      <td className="py-2">{formatPrice(Number(p.amount), p.currency as "USD" | "SYP")}</td>
                      <td className="py-2">{p.months as number}</td>
                      <td className="py-2 text-muted">{(p.method as string) ?? ""}</td>
                      <td className="py-2">{p.paid_until as string}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="صاحب المتجر">
            <form action={saveMerchantInfo} className="space-y-2 text-[13px]">
              <input type="hidden" name="id" value={s.id} />
              <div dir="ltr" className="text-right font-semibold">
                {s.email}
              </div>
              <input name="owner_name" defaultValue={s.owner_name ?? ""} placeholder="الاسم" className="input" />
              <input name="owner_phone" defaultValue={s.owner_phone ?? ""} placeholder="الهاتف" dir="ltr" className="input" />
              <select name="business_type" defaultValue={s.business_type} className="input">
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <textarea name="note" rows={3} defaultValue={s.note ?? ""} placeholder="ملاحظات خاصة بك" className="input" />
              <button className="btn btn-outline">احفظ</button>
            </form>
            {(s.owner_phone || s.whatsapp) && (
              <a
                href={whatsappLink(normalizeWhatsapp(s.owner_phone || s.whatsapp))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn mt-3 w-full !bg-[#25D366]"
              >
                راسل التاجر عبر واتساب
              </a>
            )}
          </Card>
          <Card title="المندوب والمصدر">
            <div className="space-y-2 text-[13px]">
              <form action={setStoreSalesman} className="flex gap-2">
                <input type="hidden" name="store_id" value={s.id} />
                <select name="salesman_id" defaultValue={s.salesman_id ?? ""} className="input">
                  <option value="">دون مندوب</option>
                  {salesmen.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
                <button className="btn btn-outline">احفظ</button>
              </form>
              {s.heard_from && (
                <div>
                  <span className="text-muted">مصدر المعرفة بنا: </span>
                  {s.heard_from}
                </div>
              )}
              <div>
                <span className="text-muted">إشعارات تيليغرام: </span>
                {s.telegram ? "✓ مرتبط" : "غير مرتبط"}
              </div>
            </div>
          </Card>

          <Card title="معلومات المتجر">
            <div className="space-y-1 text-[13px]">
              <div>
                <span className="text-muted">الرابط: </span>
                <span dir="ltr">{s.slug}</span>
              </div>
              <div>
                <span className="text-muted">واتساب الطلبات: </span>
                <span dir="ltr">+{s.whatsapp}</span>
              </div>
              {s.city && (
                <div>
                  <span className="text-muted">المدينة: </span>
                  {s.city}
                </div>
              )}
              {s.custom_domain && (
                <div>
                  <span className="text-muted">الدومين: </span>
                  <span dir="ltr">{s.custom_domain}</span>
                </div>
              )}
              <div>
                <span className="text-muted">أُنشئ بتاريخ: </span>
                {new Date(s.created_at).toLocaleDateString("en-GB")}
              </div>
            </div>
          </Card>
          <Card title="كلمة المرور">
            <ResetPassword id={s.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
