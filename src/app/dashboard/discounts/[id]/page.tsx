import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import type { Discount } from "@/lib/types";
import { deleteDiscount } from "../actions";
import { DiscountForm } from "../discount-form";

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { store, db } = await requireMerchant();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await db.from("discounts").select("*").eq("id", id).eq("store_id", store.id).maybeSingle();
  if (!data) notFound();
  const d = data as Discount;
  return (
    <div>
      <PageHeader title={d.code ?? d.title} back="/dashboard/discounts" />
      <DiscountForm discount={d} currency={store.currency} />
      <details className="card mt-6 p-4 text-[13px]">
        <summary className="cursor-pointer font-semibold text-red-700">حذف الخصم</summary>
        <form action={deleteDiscount} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="id" value={d.id} />
          <button className="btn !bg-[#c70a24]">احذف</button>
        </form>
      </details>
    </div>
  );
}
