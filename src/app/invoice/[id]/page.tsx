import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProGate } from "@/components/pro-gate";
import { getMerchant } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import type { Order } from "@/lib/types";
import { InvoiceView } from "../invoice-view";
import { PrintButton } from "./print-button";
import { ShareInvoice } from "./share";

export const metadata: Metadata = { title: "فاتورة", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMerchant();
  if (!m) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  if (!isPro(m.store))
    return (
      <div data-theme="admin" className="mx-auto max-w-xl p-8 font-sans">
        <ProGate feature="الفواتير PDF" />
      </div>
    );
  const { data } = await m.db.from("orders").select("*").eq("id", id).eq("store_id", m.store.id).maybeSingle();
  if (!data) notFound();
  const o = data as Order;
  return (
    <div data-theme="classic" className="mx-auto max-w-2xl bg-white p-8 font-sans text-[14px] print:p-0">
      <div className="mb-6 flex flex-wrap justify-end gap-2 print:hidden">
        <ShareInvoice orderId={o.id} phone={o.phone} number={o.number} storeName={m.store.name} />
        <PrintButton />
      </div>
      <InvoiceView store={m.store} order={o} />
    </div>
  );
}
