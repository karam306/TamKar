import { Card, PageHeader } from "@/components/admin-ui";
import { CopyLink } from "@/app/dashboard/copy-link";
import { requireOwner } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/brand";
import { whatsappLink } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase";

/** The merchant's invite link: each store that joins and pays gives both a free month. */
export default async function InvitePage() {
  const { store } = await requireOwner();
  const root = ROOT_DOMAIN.startsWith("localhost") ? "kunstores.com" : ROOT_DOMAIN;
  const link = `https://www.${root.replace(/^www\./, "")}/signup?invite=${store.slug}`;
  const message = [
    "أستخدم كُن ستورز لمتجري، ويصلني كل طلب مرتباً على واتساب.",
    "أنشئ متجرك من هذا الرابط، ونحصل كلانا على شهر مجاني بعد اشتراكك:",
    link,
  ].join("\n");

  const db = supabaseAdmin();
  const { data: rows, error } = await db
    .from("store_admin")
    .select("store_id, referral_rewarded_at")
    .eq("invited_by", store.id);
  const ids = (rows ?? []).map((r) => r.store_id as string);
  const { data: stores } = ids.length
    ? await db.from("stores").select("id, name, created_at").in("id", ids)
    : { data: [] };
  const rewarded = new Map((rows ?? []).map((r) => [r.store_id as string, r.referral_rewarded_at as string | null]));
  const day = (d: string) =>
    new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeZone: "Asia/Damascus" }).format(new Date(d));
  const earned = [...rewarded.values()].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <PageHeader title="ادعُ تاجراً" />
      <Card>
        <p className="mb-1 text-base font-semibold">شهر مجاني لك، وشهر مجاني لمن تدعوه.</p>
        <p className="mb-4 text-[13px] text-muted">
          شارك رابطك مع تاجر تعرفه. عندما ينشئ متجره من الرابط ويدفع أول اشتراك، يُضاف شهر مجاني إلى اشتراكك وإلى اشتراكه. لا حدّ لعدد الدعوات.
        </p>
        <CopyLink url={link} />
        <a
          href={whatsappLink("", message)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn mt-3 inline-flex"
        >
          إرسال الدعوة عبر واتساب
        </a>
      </Card>

      <Card title="دعواتك">
        {error ? (
          <p className="text-[13px] text-muted">تظهر دعواتك هنا قريباً.</p>
        ) : !stores?.length ? (
          <p className="text-[13px] text-muted">لم ينضم أحد عبر رابطك بعد.</p>
        ) : (
          <>
            <p className="mb-3 text-[13px]">
              انضم عبر رابطك {stores.length} {stores.length === 1 ? "متجر" : "متاجر"}، وحصلت على {earned} {earned === 1 ? "شهر مجاني" : "أشهر مجانية"}.
            </p>
            <ul className="divide-y divide-black/5 text-[13px]">
              {stores.map((s) => (
                <li key={s.id} className="flex justify-between gap-2 py-2">
                  <span>
                    {s.name} <span className="text-muted">· انضم {day(s.created_at as string)}</span>
                  </span>
                  <span className={rewarded.get(s.id as string) ? "text-[#29845a]" : "text-muted"}>
                    {rewarded.get(s.id as string) ? "✓ أُضيف الشهر المجاني" : "بانتظار أول اشتراك"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
