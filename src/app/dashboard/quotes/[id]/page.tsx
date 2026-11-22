import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-ui";
import { QuoteView } from "@/components/quote-view";
import { requireAccess } from "@/lib/auth";
import type { Quote } from "@/lib/types";
import { PrintButton } from "../../../invoice/[id]/print-button";
import { deleteQuote, setQuoteStatus } from "../actions";
import { STATUS } from "../status";
import { SendQuote } from "./send";

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { store, db } = await requireAccess("quotes");
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await db
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("store_id", store.id)
    .maybeSingle();
  if (!data) notFound();
  const q = data as Quote;
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader title={`عرض سعر #${q.number}`} back="/dashboard/quotes" />
        {created && (
          <div className="mb-3 rounded-lg bg-[#affebf] p-3 text-[13px]">
            ✓ انحفظ العرض. ابعته للزبون من الزر تحت.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {q.phone && (
            <SendQuote
              token={q.share_token ?? ""}
              phone={q.phone}
              number={q.number}
              storeName={store.name}
            />
          )}
          <PrintButton />
          <span className={`badge ${STATUS[q.status].className}`}>
            ● {STATUS[q.status].label}
          </span>
          {(["accepted", "declined", "sent"] as const)
            .filter((s) => s !== q.status)
            .map((s) => (
              <form key={s} action={setQuoteStatus}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="status" value={s} />
                <button className="btn btn-outline !py-1 text-xs">
                  {s === "accepted"
                    ? "✓ وافق الزبون"
                    : s === "declined"
                      ? "ما وافق"
                      : "رجّعه مبعوث"}
                </button>
              </form>
            ))}
          <form action={deleteQuote} className="mr-auto">
            <input type="hidden" name="id" value={q.id} />
            <button className="text-xs text-red-700 hover:underline">
              احذف العرض
            </button>
          </form>
        </div>
      </div>
      <div className="card mx-auto max-w-2xl bg-white p-8 text-[14px] print:p-0 print:shadow-none">
        <QuoteView store={store} quote={q} />
      </div>
    </div>
  );
}
