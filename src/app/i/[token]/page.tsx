import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPro } from "@/lib/plans";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import type { Order, Store } from "@/lib/types";
import { InvoiceView } from "../../invoice/invoice-view";
import { PrintButton } from "../../invoice/[id]/print-button";

export const metadata: Metadata = { title: "فاتورة", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The customer's copy of their invoice, opened from the WhatsApp link. */
export default async function SharedInvoice({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasSupabase || !/^[0-9a-f]{32}$/.test(token)) notFound();
  const db = supabaseAdmin();
  const { data } = await db.from("orders").select("*").eq("share_token", token).maybeSingle();
  if (!data) notFound();
  const { data: store } = await db.from("stores").select("name, city, whatsapp, logo_url, currency, plan").eq("id", data.store_id).maybeSingle();
  if (!store || !isPro(store)) notFound();
  return (
    <div data-theme="classic" className="mx-auto max-w-2xl bg-white p-6 font-sans text-[14px] print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton label="حفظ الفاتورة PDF" />
      </div>
      <InvoiceView store={store as Store} order={data as Order} />
    </div>
  );
}
