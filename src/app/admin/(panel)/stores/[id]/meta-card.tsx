"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import { metaActivate, metaSavePage, metaStop, metaSync, metaUseManual } from "@/app/admin/meta-actions";
import type { StoreMeta } from "@/lib/meta-managed";

const STATUS: Record<string, { label: string; cls: string }> = {
  off: { label: "غير مفعّل", cls: "bg-[#f1f1f1] text-[#616161]" },
  requested: { label: "طلب التاجر الربط", cls: "bg-[#fff1d6] text-[#7a4b00]" },
  active: { label: "مفعّل عبر حساب كُن", cls: "bg-[#dff5e7] text-[#0c5132]" },
  stopped: { label: "متوقف", cls: "bg-[#fde8e8] text-[#8e1f0b]" },
};

const date = (v: string | null) => (v ? new Date(v).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "");

export function MetaCard({
  id,
  storeName,
  merchantPhone,
  meta,
  configured,
  missing,
  ownPixel,
  pro,
}: {
  id: string;
  storeName: string;
  merchantPhone: string | null;
  meta: StoreMeta | null;
  configured: boolean;
  missing: boolean;
  ownPixel: string | null;
  pro: boolean;
}) {
  const [aState, activate] = useActionState(metaActivate, undefined);
  const [sState, stop] = useActionState(metaStop, undefined);
  const [yState, sync] = useActionState(metaSync, undefined);
  const [mState, manual] = useActionState(metaUseManual, undefined);
  const [pState, savePage] = useActionState(metaSavePage, undefined);
  const [confirmStop, setConfirmStop] = useState(false);

  if (missing)
    return (
      <p className="text-[13px] text-muted">
        نفّذ ملف التحديث <b dir="ltr">supabase/012_meta_managed.sql</b> في Supabase لتفعيل هذا القسم.
      </p>
    );

  const status = meta?.status ?? "off";
  const active = status === "active" && meta?.mode === "managed";
  const st = STATUS[status];
  const message = `مرحباً، لتفعيل إعلانات متجرك "${storeName}" على فيسبوك وإنستغرام، سيصلك طلب من «كُن ستورز» للوصول إلى صفحتك بصفة شريك.
للموافقة:
1. افتح فيسبوك من الحساب المسؤول عن صفحة المتجر.
2. ادخل إلى الإشعارات، وافتح طلب «كُن ستورز».
3. اضغط «موافقة».
إذا لم يظهر الإشعار: افتح صفحتك، ثم الإعدادات، ثم «الوصول إلى الصفحة»، وستجد الطلب هناك.
الصفحة تبقى ملكك بالكامل، ويمكنك إلغاء الوصول في أي وقت.`;

  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <span className="text-muted">
          الطريقة الحالية: {meta?.mode === "managed" ? "تلقائية (حساب كُن)" : ownPixel ? "يدوية (بيكسل التاجر)" : "لا يوجد ربط"}
        </span>
      </div>

      {status === "requested" && meta?.requested_at && (
        <div className="rounded-lg bg-[#fff8e6] p-3">طلب التاجر أن يتولى فريق كُن ربط Meta بتاريخ {date(meta.requested_at)}.</div>
      )}

      {!pro && (
        <div className="rounded-lg bg-[#f4f0ff] p-3">ربط Meta متاح في الباقة الاحترافية فقط. حوّل المتجر إلى الاحترافية أو التجريبية لتفعيله.</div>
      )}

      {!configured && (
        <div className="rounded-lg bg-[#f4f0ff] p-3">
          الربط التلقائي يحتاج إعداداً لمرة واحدة.{" "}
          <Link href="/admin/meta" className="font-semibold underline">
            افتح دليل الإعداد
          </Link>
        </div>
      )}

      {meta?.pixel_id && (
        <div className="grid gap-1 rounded-lg bg-[#f7f7f7] p-3">
          <div>
            <span className="text-muted">البيكسل: </span>
            <a dir="ltr" className="underline" target="_blank" rel="noopener noreferrer" href={`https://business.facebook.com/events_manager2/list/pixel/${meta.pixel_id}/overview`}>
              {meta.pixel_id} ↗
            </a>
          </div>
          {meta.catalog_id && (
            <div>
              <span className="text-muted">الكتالوج: </span>
              <a dir="ltr" className="underline" target="_blank" rel="noopener noreferrer" href={`https://business.facebook.com/commerce/catalogs/${meta.catalog_id}/products`}>
                {meta.catalog_id} ↗
              </a>
            </div>
          )}
          {Object.keys(meta.product_sets ?? {}).length > 0 && (
            <div>
              <span className="text-muted">مجموعات المنتجات: </span>
              {Object.keys(meta.product_sets).join("، ")}
            </div>
          )}
          {meta.last_sync_at && (
            <div>
              <span className="text-muted">آخر إرسال للمنتجات: </span>
              {date(meta.last_sync_at)}
            </div>
          )}
          {meta.last_error && <div className="text-[#8e1f0b]">آخر خطأ: {meta.last_error}</div>}
        </div>
      )}

      {configured && pro && !active && (
        <form action={activate} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <p className="text-muted">
            ينشئ بيكسل وكتالوجاً لهذا المتجر داخل حساب كُن، ويربطهما، ويضيف المنتجات، ويصنع مجموعة منتجات لكل مجموعة في المتجر.
            {status === "stopped" && meta?.pixel_id ? " سيُستخدم البيكسل القديم نفسه، فتعود بياناته السابقة." : ""}
            {ownPixel ? " بعد التفعيل يتوقف استخدام بيكسل التاجر الخاص، ويعود إليه عند الإيقاف." : ""}
          </p>
          <SubmitButton pendingText="جارٍ التفعيل...">تفعيل الربط التلقائي</SubmitButton>
          <FormMessage state={aState} />
        </form>
      )}

      {active && (
        <div className="space-y-3">
          <form action={sync} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <SubmitButton pendingText="جارٍ الإرسال..." className="btn-outline">
              أرسل المنتجات الآن
            </SubmitButton>
            <span className="text-muted">يحدث تلقائياً عند كل تعديل، وكل ساعة.</span>
          </form>
          <FormMessage state={yState} />

          {!confirmStop ? (
            <button type="button" className="btn btn-outline !border-[#c70a24] !text-[#c70a24]" onClick={() => setConfirmStop(true)}>
              إيقاف ربط Meta
            </button>
          ) : (
            <form action={stop} className="space-y-2 rounded-lg border border-[#c70a24]/30 bg-[#fff5f5] p-3">
              <input type="hidden" name="id" value={id} />
              <p>
                سيتوقف المتجر عن إرسال الأحداث، ويُفصل البيكسل عن حساب الإعلانات ويُعلَّم «متوقف»، ويُحذف الكتالوج. صفحة التاجر لا تتأثر.
              </p>
              <div className="flex gap-2">
                <SubmitButton pendingText="جارٍ الإيقاف..." className="!bg-[#c70a24]">
                  تأكيد الإيقاف
                </SubmitButton>
                <button type="button" className="btn btn-outline" onClick={() => setConfirmStop(false)}>
                  تراجع
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      <FormMessage state={sState} />

      {(status === "stopped" || sState?.ok) && (
        <div className="rounded-lg bg-[#f7f7f7] p-3">
          <div className="mb-1 font-semibold">بعد الإيقاف، خطوتان يدويتان:</div>
          <ol className="list-inside list-decimal space-y-1">
            <li>أوقف حملات هذا المتجر في مدير الإعلانات، حتى لا تُصرف من بطاقتك.</li>
            <li>
              أزل وصولك إلى صفحة التاجر من{" "}
              <a className="underline" href="https://business.facebook.com/settings/pages" target="_blank" rel="noopener noreferrer">
                إعدادات النشاط التجاري، قسم الصفحات ↗
              </a>
              ، أو يزيله التاجر من صفحته.
            </li>
          </ol>
        </div>
      )}

      {meta?.mode === "managed" && !active && ownPixel && (
        <form action={manual} className="space-y-1">
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="btn-outline">العودة إلى بيكسل التاجر الخاص</SubmitButton>
          <FormMessage state={mState} />
        </form>
      )}

      <div className="space-y-2 border-t border-black/5 pt-3">
        <div className="font-semibold">صفحة التاجر على فيسبوك</div>
        <form action={savePage} className="flex gap-2">
          <input type="hidden" name="id" value={id} />
          <input name="page_url" defaultValue={meta?.page_url ?? ""} dir="ltr" placeholder="https://facebook.com/..." className="input" />
          <SubmitButton className="btn-outline">حفظ</SubmitButton>
        </form>
        <FormMessage state={pState} />
        <p className="text-muted">
          اطلب الوصول إلى الصفحة من{" "}
          <a className="underline" href="https://business.facebook.com/settings/pages" target="_blank" rel="noopener noreferrer">
            إعدادات النشاط التجاري ↗
          </a>{" "}
          (إضافة، ثم طلب الوصول إلى صفحة)، ثم أرسل للتاجر خطوات الموافقة:
        </p>
        {merchantPhone && (
          <a
            href={`https://wa.me/${merchantPhone}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-full !bg-[#25D366]"
          >
            أرسل خطوات الموافقة عبر واتساب
          </a>
        )}
      </div>
    </div>
  );
}
