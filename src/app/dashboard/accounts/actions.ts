"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/form-ui";
import { cleanPaidFrom, todayDamascus } from "@/lib/accounts";
import { aiCall, aiMessage, imageFromFile } from "@/lib/ai";
import { requireOwner } from "@/lib/auth";
import { toNum, txt } from "@/lib/clean-product";
import { isPro } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";

/** All of "Accounts" is the owner's alone: staff never see costs, profit or cash. */
async function owner() {
  const m = await requireOwner();
  return { ...m, admin: supabaseAdmin() };
}

const NEED_018 = "تُفعَّل الحسابات بعد تشغيل التحديث 018_accounts.sql في Supabase.";
const amountOf = (v: FormDataEntryValue | null) => {
  const n = toNum(v);
  return n === null || Number.isNaN(n) || n < 0 ? NaN : Math.round(n * 100) / 100;
};
const dayOf = (v: FormDataEntryValue | null) => {
  const d = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= todayDamascus() ? d : todayDamascus();
};
const branchOf = (store: { shipping?: { branches?: { id: string }[] } | null }, v: FormDataEntryValue | null) => {
  const id = String(v ?? "");
  return (store.shipping?.branches ?? []).some((b) => b.id === id) ? id : "";
};
const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/.test(v) ? v : null);
const done = (path: string) => {
  revalidatePath(path);
  revalidatePath("/dashboard/accounts");
  refresh();
};

// ───────────── Expenses ─────────────

export async function addExpense(_: FormState, form: FormData): Promise<FormState> {
  const { store, user, admin } = await owner();
  const amount = amountOf(form.get("amount"));
  if (!(amount > 0)) return { error: "أدخل مبلغاً صحيحاً" };
  const picked = txt(form.get("category"), 40);
  const category = picked === "أخرى" ? txt(form.get("other"), 40) || "أخرى" : picked || "أخرى";
  const row = {
    store_id: store.id,
    amount,
    category,
    note: txt(form.get("note"), 300) || null,
    paid_from: cleanPaidFrom(form.get("paid_from")),
    branch: branchOf(store, form.get("branch")),
  };
  const day = dayOf(form.get("day"));

  let recurring_id: string | null = null;
  if (form.get("repeat") === "1") {
    const dom = Math.min(28, Math.max(1, Number(day.slice(8, 10))));
    const { data, error } = await admin
      .from("recurring_expenses")
      .insert({ ...row, day_of_month: dom, last_month: day.slice(0, 7) })
      .select("id")
      .single();
    if (error) return { error: NEED_018 };
    recurring_id = data.id;
  }
  const { error } = await admin.from("expenses").insert({ ...row, day, recurring_id, created_by: user.id });
  if (error) return { error: NEED_018 };
  done("/dashboard/accounts/expenses");
  return { ok: recurring_id ? "✓ سُجّل المصروف، وسيُضاف تلقائياً كل شهر." : "✓ سُجّل المصروف" };
}

export async function deleteExpense(form: FormData) {
  const { store, admin } = await owner();
  const id = uuid(form.get("id"));
  if (id) await admin.from("expenses").delete().eq("id", id).eq("store_id", store.id);
  done("/dashboard/accounts/expenses");
}

export async function stopRecurring(form: FormData) {
  const { store, admin } = await owner();
  const id = uuid(form.get("id"));
  if (id) await admin.from("recurring_expenses").delete().eq("id", id).eq("store_id", store.id);
  done("/dashboard/accounts/expenses");
}

// ───────────── Cost prices ─────────────

/** Saves the whole cost table at once: c:<productId> and v:<productId>:<variant title>. */
export async function saveCosts(_: FormState, form: FormData): Promise<FormState> {
  const { store, admin } = await owner();
  const rows = new Map<string, { cost: number | null; variants: Record<string, number> }>();
  for (const [k, v] of form.entries()) {
    const m = /^(c|v):([0-9a-f-]{36})(?::(.+))?$/.exec(k);
    if (!m) continue;
    const r = rows.get(m[2]) ?? { cost: null, variants: {} };
    const n = String(v).trim() === "" ? null : amountOf(v);
    if (n !== null && Number.isNaN(n)) return { error: "أحد الأسعار غير صحيح" };
    if (m[1] === "c") r.cost = n;
    else if (m[3] && n !== null) r.variants[m[3].slice(0, 120)] = n;
    rows.set(m[2], r);
  }
  if (!rows.size) return { ok: "لا تغييرات" };
  // Only this store's products.
  const { data: own } = await admin.from("products").select("id").eq("store_id", store.id).in("id", [...rows.keys()]);
  const ids = new Set((own ?? []).map((p) => p.id as string));
  const upserts = [...rows.entries()]
    .filter(([id]) => ids.has(id))
    .map(([id, r]) => ({ product_id: id, store_id: store.id, cost: r.cost, variant_costs: r.variants, updated_at: new Date().toISOString() }));
  for (let i = 0; i < upserts.length; i += 200) {
    const { error } = await admin.from("product_costs").upsert(upserts.slice(i, i + 200), { onConflict: "product_id" });
    if (error) return { error: NEED_018 };
  }
  done("/dashboard/accounts/costs");
  return { ok: `✓ حُفظت أسعار التكلفة (${upserts.length} منتج)` };
}

// ───────────── Daily cash close ─────────────

export async function closeCash(_: FormState, form: FormData): Promise<FormState> {
  const { store, user, admin } = await owner();
  if (!isPro(store)) return { error: "إغلاق الصندوق متاح في الباقة الاحترافية" };
  const counted = amountOf(form.get("counted"));
  const opening = amountOf(form.get("opening"));
  const expected = Number(form.get("expected"));
  if (Number.isNaN(counted)) return { error: "أدخل المبلغ الموجود في الصندوق" };
  if (Number.isNaN(opening)) return { error: "رصيد البداية غير صحيح" };
  if (!Number.isFinite(expected)) return { error: "حدث خطأ، حدّث الصفحة" };
  let details: unknown = null;
  try {
    details = JSON.parse(String(form.get("details") ?? "null"));
  } catch {}
  const { error } = await admin.from("cash_closes").upsert(
    {
      store_id: store.id,
      branch: branchOf(store, form.get("branch")),
      day: dayOf(form.get("day")),
      opening,
      expected,
      counted,
      details,
      note: txt(form.get("note"), 300) || null,
      closed_by: user.id,
      created_at: new Date().toISOString(),
    },
    { onConflict: "store_id,branch,day" },
  );
  if (error) return { error: NEED_018 };
  done("/dashboard/accounts/cash");
  const diff = Math.round((counted - expected) * 100) / 100;
  return { ok: diff === 0 ? "✓ أُغلق الصندوق، والمبلغ مطابق." : `✓ أُغلق الصندوق، مع فرق ${diff > 0 ? "زيادة" : "نقص"} ${Math.abs(diff).toLocaleString("en-US")}.` };
}

// ───────────── Suppliers ─────────────

export async function saveSupplier(_: FormState, form: FormData): Promise<FormState> {
  const { store, admin } = await owner();
  if (!isPro(store)) return { error: "الموردون متاحون في الباقة الاحترافية" };
  const name = txt(form.get("name"), 80);
  if (!name) return { error: "أدخل اسم المورد" };
  const row = { name, phone: txt(form.get("phone"), 20).replace(/[^\d+]/g, "") || null, note: txt(form.get("note"), 300) || null };
  const id = uuid(form.get("id"));
  if (id) {
    const { error } = await admin.from("suppliers").update(row).eq("id", id).eq("store_id", store.id);
    if (error) return { error: NEED_018 };
    done(`/dashboard/accounts/suppliers/${id}`);
    return { ok: "✓ حُفظ" };
  }
  const { data, error } = await admin.from("suppliers").insert({ ...row, store_id: store.id }).select("id").single();
  if (error || !data) return { error: NEED_018 };
  redirect(`/dashboard/accounts/suppliers/${data.id}`);
}

export async function paySupplier(_: FormState, form: FormData): Promise<FormState> {
  const { store, user, admin } = await owner();
  const id = uuid(form.get("supplier_id"));
  const amount = amountOf(form.get("amount"));
  if (!id) return { error: "حدث خطأ" };
  if (!(amount > 0)) return { error: "أدخل مبلغاً صحيحاً" };
  const { data: s } = await admin.from("suppliers").select("id").eq("id", id).eq("store_id", store.id).maybeSingle();
  if (!s) return { error: "المورد غير موجود" };
  const { error } = await admin.from("supplier_payments").insert({
    store_id: store.id,
    supplier_id: id,
    amount,
    day: dayOf(form.get("day")),
    paid_from: cleanPaidFrom(form.get("paid_from")),
    branch: branchOf(store, form.get("branch")),
    note: txt(form.get("note"), 300) || null,
    created_by: user.id,
  });
  if (error) return { error: NEED_018 };
  done(`/dashboard/accounts/suppliers/${id}`);
  return { ok: "✓ سُجّلت الدفعة" };
}

export async function deleteSupplierPayment(form: FormData) {
  const { store, admin } = await owner();
  const id = uuid(form.get("id"));
  const sid = uuid(form.get("supplier_id"));
  if (id) await admin.from("supplier_payments").delete().eq("id", id).eq("store_id", store.id);
  done(`/dashboard/accounts/suppliers/${sid ?? ""}`);
}

// ───────────── Purchases ─────────────

export type PurchaseLine = { productId: string | null; variantId: string | null; title: string; qty: number; cost: number };

/** Saves a supplier invoice: stock goes up for linked products, and their cost is updated. */
export async function savePurchase(input: {
  supplierId?: string | null;
  newSupplier?: string;
  day?: string;
  ref?: string;
  lines: PurchaseLine[];
  paid: number;
  paidFrom?: string;
  branch?: string;
  note?: string;
}): Promise<{ ok?: true; id?: string; error?: string }> {
  const { store, user, admin } = await owner();
  if (!isPro(store)) return { error: "المشتريات متاحة في الباقة الاحترافية" };

  const lines = (Array.isArray(input.lines) ? input.lines : [])
    .map((l) => ({
      productId: uuid(l?.productId),
      variantId: typeof l?.variantId === "string" ? l.variantId.slice(0, 80) : null,
      title: txt(l?.title, 200),
      qty: Math.floor(Number(l?.qty)),
      cost: Math.round(Number(l?.cost) * 100) / 100,
    }))
    .filter((l) => l.title && l.qty > 0 && l.qty <= 100000 && Number.isFinite(l.cost) && l.cost >= 0)
    .slice(0, 300);
  if (!lines.length) return { error: "أضف سطراً واحداً على الأقل بكمية وسعر صحيحين" };
  const total = Math.round(lines.reduce((s, l) => s + l.qty * l.cost, 0) * 100) / 100;
  const paid = Math.min(total, Math.max(0, Math.round(Number(input.paid) * 100) / 100 || 0));

  // Linked products must belong to this store; keep the variant title for the cost table.
  const ids = [...new Set(lines.map((l) => l.productId).filter(Boolean))] as string[];
  const { data: prods } = ids.length
    ? await admin.from("products").select("id, variants").eq("store_id", store.id).in("id", ids)
    : { data: [] };
  const byId = new Map((prods ?? []).map((p) => [p.id as string, (p.variants as { id: string; title: string }[]) ?? []]));
  const items = lines.map((l) => {
    if (!l.productId || !byId.has(l.productId)) return { ...l, productId: null, variantId: null, variantTitle: null };
    const v = l.variantId ? byId.get(l.productId)!.find((x) => x.id === l.variantId) : undefined;
    return { ...l, variantId: v?.id ?? null, variantTitle: v?.title ?? null };
  });

  let supplierId = uuid(input.supplierId);
  if (supplierId) {
    const { data: s } = await admin.from("suppliers").select("id").eq("id", supplierId).eq("store_id", store.id).maybeSingle();
    if (!s) supplierId = null;
  }
  const newName = txt(input.newSupplier, 80);
  if (!supplierId && newName) {
    const { data: s, error } = await admin.from("suppliers").insert({ store_id: store.id, name: newName }).select("id").single();
    if (error) return { error: NEED_018 };
    supplierId = s.id;
  }
  if (!supplierId && paid < total) return { error: "اختر المورد لتسجيل المبلغ المتبقي ديناً عليك، أو اجعل المدفوع كامل المبلغ" };

  const branches = store.shipping?.branches ?? [];
  const { data, error } = await admin
    .from("purchases")
    .insert({
      store_id: store.id,
      supplier_id: supplierId,
      day: dayOf(input.day ?? null),
      ref: txt(input.ref, 60) || null,
      items,
      total,
      paid,
      paid_from: cleanPaidFrom(input.paidFrom),
      branch: branches.some((b) => b.id === input.branch) ? input.branch : "",
      note: txt(input.note, 300) || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: NEED_018 };

  for (const it of items) {
    if (!it.productId) continue;
    const { error: e } = await admin.rpc("receive_stock", {
      p_store: store.id,
      p_product: it.productId,
      p_variant: it.variantId ?? "",
      p_qty: it.qty,
      p_cost: it.cost,
    });
    if (e) console.error("receive_stock", e.message);
  }
  revalidatePath("/dashboard/products");
  done("/dashboard/accounts/purchases");
  return { ok: true, id: data.id };
}

export type InvoiceRead = {
  supplier: string;
  ref: string;
  day: string;
  lines: { title: string; qty: number; cost: number | null }[];
};

/** Reads a photo of a supplier's invoice into purchase lines (counts as one AI request). */
export async function aiReadInvoice(form: FormData): Promise<{ data?: InvoiceRead; left?: number; error?: string }> {
  const { store } = await owner();
  if (!isPro(store)) return { error: "المشتريات متاحة في الباقة الاحترافية" };
  try {
    const image = await imageFromFile(form.get("file") as File | null);
    const { data, left } = await aiCall<InvoiceRead>({
      store,
      kind: "invoice",
      system: "أنت تقرأ فواتير الموردين لمحل سوري وتحوّلها إلى أسطر مشتريات. انقل الأسماء كما هي مع تصحيح الإملاء فقط، ولا تخترع أسطراً أو أرقاماً.",
      images: [image],
      text: `اقرأ هذه الفاتورة. عملة المحل ${store.currency === "SYP" ? "الليرة السورية" : "الدولار الأمريكي"}.
- supplier: اسم المورد أو الشركة إن ظهر، وإلا فارغ.
- ref: رقم الفاتورة إن ظهر، وإلا فارغ.
- day: تاريخ الفاتورة بصيغة YYYY-MM-DD إن ظهر، وإلا فارغ.
- lines: لكل صنف: الاسم، والكمية (عدد صحيح، 1 إن لم تظهر)، وسعر الوحدة (cost). إذا ظهر الإجمالي فقط فاقسمه على الكمية. إذا لم يُقرأ السعر فاجعله null. "45 ألف" تعني 45000.
تجاهل المجاميع والضرائب والخصومات وأرقام الهواتف.`,
      tool: {
        name: "invoice",
        description: "الفاتورة المقروءة",
        schema: {
          type: "object",
          properties: {
            supplier: { type: "string" },
            ref: { type: "string" },
            day: { type: "string" },
            lines: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, qty: { type: "number" }, cost: { type: ["number", "null"] } },
                required: ["title", "qty", "cost"],
              },
            },
          },
          required: ["supplier", "ref", "day", "lines"],
        },
      },
      maxTokens: 6000,
    });
    const lines = (Array.isArray(data.lines) ? data.lines : [])
      .map((l) => ({
        title: txt(l?.title, 200),
        qty: Math.max(1, Math.floor(Number(l?.qty) || 1)),
        cost: typeof l?.cost === "number" && Number.isFinite(l.cost) && l.cost >= 0 ? l.cost : null,
      }))
      .filter((l) => l.title)
      .slice(0, 300);
    if (!lines.length) return { error: "لم أجد أصنافاً في الصورة. جرّب صورة أوضح للفاتورة.", left };
    const day = /^\d{4}-\d{2}-\d{2}$/.test(data.day ?? "") && data.day <= todayDamascus() ? data.day : "";
    return { data: { supplier: txt(data.supplier, 80), ref: txt(data.ref, 60), day, lines }, left };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

