"use server";

import { refresh, revalidatePath } from "next/cache";
import type { FormState } from "@/components/form-ui";
import { requireOwner } from "@/lib/auth";
import { saveImage } from "@/lib/media";
import type { Wallet, WalletId } from "@/lib/types";
import { WALLET_IDS, WALLETS } from "@/lib/wallets";

/** Saves cash on/off and the e-wallets (Sham Cash code + QR picture, Syriatel / MTN Cash numbers). */
export async function savePayments(_: FormState, form: FormData): Promise<FormState> {
  const { store, db } = await requireOwner();
  const old = store.shipping?.payments?.wallets ?? [];
  const wallets: Wallet[] = [];

  for (const id of WALLET_IDS as WalletId[]) {
    if (form.get(`${id}_on`) !== "on") continue;
    let account = String(form.get(`${id}_account`) ?? "").trim();
    if (id === "sham_cash") {
      account = account.replace(/\s+/g, "");
      if (!/^[A-Za-z0-9]{16,64}$/.test(account)) return { error: "رمز محفظة شام كاش لازم يكون حروف إنكليزية وأرقام بس (عادة 32)" };
    } else {
      account = account.replace(/[^\d+]/g, "");
      if (account.replace(/\D/g, "").length < 9) return { error: `رقم ${WALLETS[id].name} غير صحيح` };
    }
    let qr = old.find((w) => w.id === id)?.qr ?? null;
    if (form.get(`${id}_qr_remove`) === "on") qr = null;
    const file = form.get(`${id}_qr`);
    if (WALLETS[id].qr && file instanceof File && file.size > 0) {
      try {
        qr = await saveImage(store.id, file, 800);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "ما قدرنا نرفع الصورة" };
      }
    }
    wallets.push({ id, account, holder: String(form.get(`${id}_holder`) ?? "").trim().slice(0, 80) || null, qr });
  }

  const cod = form.get("cod") === "on";
  if (!cod && wallets.length === 0) return { error: "لازم تخلي طريقة دفع وحدة على الأقل" };

  const { error } = await db
    .from("stores")
    .update({ shipping: { ...(store.shipping ?? {}), payments: { cod, wallets } } })
    .eq("id", store.id);
  if (error) return { error: "ما قدرنا نحفظ، جرب مرة تانية" };
  revalidatePath("/dashboard/settings/payments");
  revalidatePath("/dashboard/settings");
  refresh();
  return { ok: "✓ انحفظ" };
}
