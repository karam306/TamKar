import Link from "next/link";
import { Card, PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { liveFx } from "@/lib/fx";
import { FxForm } from "./form";

export default async function CurrencyPage() {
  const { store } = await requireOwner();
  const fx = liveFx(store);
  return (
    <div className="space-y-4">
      <PageHeader title="سعر الصرف" back="/dashboard/settings" />
      {store.currency !== "USD" ? (
        <Card>
          <p className="text-sm">
            أسعار متجرك بالليرة السورية، فلا حاجة إلى سعر صرف. إذا كنت تسعّر بضاعتك بالدولار، غيّر العملة إلى الدولار من{" "}
            <Link href="/dashboard/settings" className="font-semibold text-[#005bd3] hover:underline">الإعدادات العامة</Link>
            ، ثم عُد إلى هذه الصفحة.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="mb-4 text-[13px] text-muted">
            أسعار منتجاتك محفوظة بالدولار. اكتب سعر الدولار اليوم، فيرى الزبون كل الأسعار بالليرة، ويصل الطلب إلى واتساب بالليرة.
            يحتفظ كل طلب بسعر الصرف الذي طُلب به، فلا تتغير فواتير الطلبات السابقة عند تغيير السعر.
          </p>
          {fx?.updated_at && (
            <p className="mb-4 text-[13px]">
              آخر تحديث:{" "}
              {new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Damascus" }).format(new Date(fx.updated_at))}
            </p>
          )}
          <FxForm fx={fx} sample={10} />
        </Card>
      )}
    </div>
  );
}
