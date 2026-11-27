import { Card, PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { LoyaltyForm } from "./form";

export default async function LoyaltyPage() {
  const { store } = await requireOwner();
  const l = store.shipping?.loyalty ?? null;
  return (
    <div className="space-y-4">
      <PageHeader title="نقاط الولاء" back="/dashboard/settings" />
      <Card>
        <p className="mb-4 text-[13px] text-muted">
          يكسب الزبون نقاطاً عن كل طلب يستلمه، من المتجر الإلكتروني أو من المحل. من صفحة الزبون تحوّل نقاطه إلى كود خصم
          ترسله إليه عبر واتساب، يستخدمه في طلبه القادم أونلاين أو في المحل.
        </p>
        <LoyaltyForm initial={l ? { enabled: Boolean(l.enabled), per: Number(l.per), block: Number(l.block), reward: Number(l.reward) } : null} unit={store.currency === "SYP" ? "ل.س" : "$"} />
      </Card>
    </div>
  );
}
