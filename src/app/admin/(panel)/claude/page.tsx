import { requirePlatformAdmin } from "@/lib/platform-admin";
import { TOOLS } from "@/lib/mcp/tools";
import { supabaseAdmin } from "@/lib/supabase";
import { revokeKey } from "./actions";
import { NewKey } from "./new-key";

export const dynamic = "force-dynamic";

export default async function ClaudePage() {
  await requirePlatformAdmin();
  const db = supabaseAdmin();
  const { data: keys, error } = await db.from("mcp_keys").select("*").order("created_at", { ascending: false });
  const { data: log } = await db.from("mcp_log").select("id, tool, store_id, ok, error, created_at").order("created_at", { ascending: false }).limit(50);
  const ids = [...new Set((log ?? []).map((l) => l.store_id).filter(Boolean))] as string[];
  const { data: stores } = ids.length ? await db.from("stores").select("id, slug").in("id", ids) : { data: [] };
  const slug = new Map((stores ?? []).map((s) => [s.id as string, s.slug as string]));
  const when = (d: string) => new Intl.DateTimeFormat("ar", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(d));
  const card = "rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">ربط Claude</h1>
      <p className="max-w-2xl text-[13px] text-muted">
        موصّل يتيح لـ Claude إدارة كل المتاجر بالمحادثة: المنتجات والأسعار والصور والأقسام والطلبات والخصومات والإعدادات. يعمل بصلاحيات الأدمن، فاحفظ المفتاح كما تحفظ كلمة المرور.
      </p>

      {error ? (
        <div className={card}>
          <p className="text-sm">شغّل التحديث 016_claude_connector.sql في Supabase، ثم أعد فتح هذه الصفحة.</p>
        </div>
      ) : (
        <>
          <section className={card}>
            <h2 className="mb-3 font-semibold">١. أنشئ مفتاحاً</h2>
            <NewKey />
          </section>

          <section className={`${card} space-y-2 text-[13px]`}>
            <h2 className="mb-1 font-semibold">٢. أضف الموصّل في Claude</h2>
            <ol className="list-decimal space-y-1.5 pr-5">
              <li>
                افتح{" "}
                <a href="https://claude.ai/customize/connectors" target="_blank" rel="noopener noreferrer" className="text-[#005bd3] underline">
                  claude.ai/customize/connectors
                </a>
                ، واضغط <b>Add custom connector</b>.
              </li>
              <li>
                الاسم: <b>Kun Stores</b>. الرابط: <code dir="ltr" className="rounded bg-black/5 px-1">https://www.kunstores.com/api/mcp</code>
              </li>
              <li>
                في <b>Request headers</b> أضف: الاسم <code dir="ltr" className="rounded bg-black/5 px-1">Authorization</code>، والقيمة ما نسخته (يبدأ بـ <code dir="ltr">Bearer kun_</code>).
              </li>
              <li>اضغط Add، ثم فعّل الموصّل في المحادثة من زر الأدوات.</li>
            </ol>
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">المفاتيح</h2>
            {!keys?.length ? (
              <p className="text-[13px] text-muted">لا مفاتيح بعد.</p>
            ) : (
              <ul className="divide-y divide-black/5 text-[13px]">
                {keys.map((k) => (
                  <li key={k.id as string} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <b>{k.label as string}</b> <span dir="ltr" className="text-muted">…{k.key_hint as string}</span>
                      <span className="text-muted"> · أُنشئ {when(k.created_at as string)}</span>
                      {k.last_used_at && <span className="text-muted"> · آخر استخدام {when(k.last_used_at as string)}</span>}
                    </span>
                    {k.revoked_at ? (
                      <span className="text-muted">ملغى</span>
                    ) : (
                      <form action={revokeKey}>
                        <input type="hidden" name="id" value={k.id as string} />
                        <button className="text-red-700 underline">إلغاء المفتاح</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">آخر ما فعله Claude</h2>
            {!log?.length ? (
              <p className="text-[13px] text-muted">لا شيء بعد.</p>
            ) : (
              <ul className="divide-y divide-black/5 text-[13px]">
                {log.map((l) => (
                  <li key={l.id as number} className="flex flex-wrap justify-between gap-2 py-1.5">
                    <span>
                      <span className={l.ok ? "text-[#29845a]" : "text-red-700"}>{l.ok ? "✓" : "✕"}</span>{" "}
                      <code dir="ltr">{l.tool as string}</code>
                      {l.store_id && <span className="text-muted"> · {slug.get(l.store_id as string) ?? "متجر محذوف"}</span>}
                      {l.error && <span className="text-red-700"> · {String(l.error).slice(0, 120)}</span>}
                    </span>
                    <span className="text-muted">{when(l.created_at as string)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">ما يستطيع Claude فعله ({TOOLS.length} أداة)</h2>
            <ul className="grid gap-1 text-[13px] sm:grid-cols-2">
              {TOOLS.map((t) => (
                <li key={t.name}>
                  <code dir="ltr">{t.name}</code> {t.write ? <span className="text-[#8a4b00]">· يعدّل</span> : <span className="text-muted">· قراءة</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
