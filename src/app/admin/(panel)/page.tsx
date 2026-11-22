import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { formatPrice } from "@/lib/format";
import { daysLeft, SUB_LABELS, subState } from "@/lib/subscription";
import { loadStores } from "@/app/admin/data";
import { botUsername, telegramReady } from "@/lib/telegram";
import { TelegramCard } from "./telegram-card";

export default async function AdminHome() {
  const stores = await loadStores();
  const states = stores.map((s) => ({ s, st: subState(s) }));
  const count = (k: string[]) => states.filter((x) => k.includes(x.st)).length;
  const usd = stores.filter((s) => s.currency === "USD").reduce((a, s) => a + s.sales30, 0);
  const syp = stores.filter((s) => s.currency === "SYP").reduce((a, s) => a + s.sales30, 0);
  const orders = stores.reduce((a, s) => a + s.orders30, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  const newThisMonth = stores.filter((s) => new Date(s.created_at) >= monthStart).length;
  const attention = states
    .filter((x) => ["expiring", "grace", "expired"].includes(x.st) || (x.st === "trial" && (daysLeft(x.s.paid_until) ?? 99) <= 3))
    .sort((a, b) => (daysLeft(a.s.paid_until) ?? 0) - (daysLeft(b.s.paid_until) ?? 0));

  const helpWanted = stores.filter((s) => s.note?.startsWith("🙋"));

  return (
    <div className="space-y-4">
      <PageHeader
        title="نظرة عامة"
        actions={
          <Link href="/admin/stores/new" className="btn">
            إنشاء متجر لتاجر
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="كل المتاجر" value={stores.length} sub={`${newThisMonth} جديد هذا الشهر`} />
        <Tile label="مدفوعة وفعّالة" value={count(["active", "expiring"])} />
        <Tile label="تجريبية" value={count(["trial"])} />
        <Tile label="منتهية أو موقوفة" value={count(["expired", "grace", "suspended"])} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="طلبات كل المتاجر (30 يوم)" value={orders} />
        <Tile label="مبيعات بالدولار (30 يوم)" value={formatPrice(usd, "USD")} />
        <Tile label="مبيعات بالليرة (30 يوم)" value={formatPrice(syp, "SYP")} />
      </div>

      <TelegramCard ready={telegramReady()} bot={telegramReady() ? await botUsername() : null} connected={stores.filter((s) => s.telegram).length} total={stores.length} />

      {helpWanted.length > 0 && (
        <Card title={`🙋 طلبوا المساعدة في التجهيز والإعلانات (${helpWanted.length})`}>
          <ul className="divide-y divide-black/5 text-[13px]">
            {helpWanted.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/admin/stores/${s.id}`} className="font-semibold hover:underline">
                  {s.name}
                </Link>
                <span className="text-muted">{s.owner_name ?? ""}</span>
                <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn !bg-[#25D366] !px-3 !py-1 text-xs">
                  واتساب
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="بحاجة إلى متابعة (اشتراكات قاربت على الانتهاء أو انتهت)">
        {attention.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-muted">جميع الاشتراكات سليمة ✓</p>
        ) : (
          <ul className="divide-y divide-black/5 text-[13px]">
            {attention.map(({ s, st }) => {
              const left = daysLeft(s.paid_until);
              return (
                <li key={s.id}>
                  <Link href={`/admin/stores/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#f7f7f7]">
                    <span className="font-semibold">{s.name}</span>
                    <span className={`badge ${SUB_LABELS[st].className}`}>{SUB_LABELS[st].label}</span>
                    <span className="text-muted">{left == null ? "" : left >= 0 ? `متبقٍّ ${left} يوم` : `منذ ${-left} يوم`}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="آخر المتاجر">
        <ul className="divide-y divide-black/5 text-[13px]">
          {stores.slice(0, 6).map((s) => (
            <li key={s.id}>
              <Link href={`/admin/stores/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#f7f7f7]">
                <span className="font-semibold">{s.name}</span>
                <span className="text-muted" dir="ltr">
                  {s.email}
                </span>
                <span className="text-muted">{new Date(s.created_at).toLocaleDateString("en-GB")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
