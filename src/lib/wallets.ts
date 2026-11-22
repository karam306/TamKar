import type { PaymentMethod, Store, Wallet, WalletId } from "./types";

/** The e-wallets we support, with what the merchant enters and what the customer does. */
export const WALLETS: Record<
  WalletId,
  { name: string; short: string; icon: string; accountLabel: string; accountHint: string; steps: string[]; qr: boolean }
> = {
  sham_cash: {
    name: "شام كاش",
    short: "شام كاش",
    icon: "💳",
    accountLabel: "رمز المحفظة (عنوان الحساب)",
    accountHint: "من تطبيق شام كاش: اختر «استقبال» وانسخ الرمز. يتكون من 32 حرفاً ورقماً.",
    steps: ["افتح تطبيق شام كاش واضغط «إرسال»", "الصق رمز المحفظة، أو امسح رمز QR", "أدخل المبلغ واضغط «إرسال»، ثم احفظ صورة الإيصال"],
    qr: true,
  },
  syriatel_cash: {
    name: "سيرياتل كاش",
    short: "سيرياتل كاش",
    icon: "📱",
    accountLabel: "رقم هاتف سيرياتل كاش",
    accountHint: "الرقم المسجّل عليه حساب سيرياتل كاش، مثال: 0933123456",
    steps: ["افتح تطبيق سيرياتل كاش واختر «تحويل»", "أدخل الرقم والمبلغ", "أكّد التحويل واحفظ صورة الإيصال"],
    qr: false,
  },
  mtn_cash: {
    name: "MTN كاش",
    short: "MTN كاش",
    icon: "📱",
    accountLabel: "رقم هاتف MTN كاش",
    accountHint: "الرقم المسجّل عليه حساب MTN كاش، مثال: 0944123456",
    steps: ["افتح تطبيق MTN كاش واختر «تحويل»", "أدخل الرقم والمبلغ", "أكّد التحويل واحفظ صورة الإيصال"],
    qr: false,
  },
};

export const WALLET_IDS = Object.keys(WALLETS) as WalletId[];

/** Wallets the store has filled in, in our fixed order. */
export function storeWallets(store: Pick<Store, "shipping">): Wallet[] {
  const list = store.shipping?.payments?.wallets ?? [];
  return WALLET_IDS.flatMap((id) => list.filter((w) => w.id === id && w.account?.trim()));
}

/** Cash on delivery is on unless the merchant turned it off AND has a wallet to fall back on. */
export function codEnabled(store: Pick<Store, "shipping">): boolean {
  return store.shipping?.payments?.cod !== false || storeWallets(store).length === 0;
}

/** The methods a customer may choose at checkout, cash first. */
export function paymentChoices(store: Pick<Store, "shipping">): PaymentMethod[] {
  return [...(codEnabled(store) ? (["cod"] as const) : []), ...storeWallets(store).map((w) => w.id)];
}

export const paymentLabel = (m?: PaymentMethod | null, pickup = true) =>
  !m || m === "cod" ? (pickup ? "نقداً في المحل" : "نقداً عند الاستلام") : WALLETS[m]?.name ?? m;
