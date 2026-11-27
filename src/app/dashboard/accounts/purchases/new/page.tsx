import { PageHeader } from "@/components/admin-ui";
import { ProGate } from "@/components/pro-gate";
import { branchList, PAID_FROM, todayDamascus } from "@/lib/accounts";
import { requireOwner } from "@/lib/auth";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import type { Variant } from "@/lib/types";
import { AccountsTabs } from "../../ui";
import { PurchaseBuilder } from "./builder";

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ supplier?: string }> }) {
  const { store } = await requireOwner();
  const { supplier } = await searchParams;
  if (!isPro(store))
    return (
      <div>
        <PageHeader title="فاتورة شراء" back="/dashboard/accounts/purchases" />
        <ProGate feature="الموردون والمشتريات" />
      </div>
    );
  const db = supabaseAdmin();
  const [{ data: sups }, { data: prods }] = await Promise.all([
    db.from("suppliers").select("id, name").eq("store_id", store.id).order("name"),
    db.from("products").select("id, title, variants, stock").eq("store_id", store.id).order("title").limit(3000),
  ]);
  return (
    <div>
      <PageHeader title="فاتورة شراء جديدة" back="/dashboard/accounts/purchases" />
      <AccountsTabs active="/dashboard/accounts/purchases" />
      <PurchaseBuilder
        suppliers={(sups ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
        products={(prods ?? []).map((p) => ({
          id: p.id as string,
          title: p.title as string,
          variants: ((p.variants as Variant[]) ?? []).map((v) => ({ id: v.id, title: v.title })),
        }))}
        supplierId={supplier && (sups ?? []).some((s) => s.id === supplier) ? supplier : ""}
        today={todayDamascus()}
        paidFrom={PAID_FROM}
        branches={branchList(store)}
        unit={store.currency === "SYP" ? "ل.س" : "$"}
      />
    </div>
  );
}
