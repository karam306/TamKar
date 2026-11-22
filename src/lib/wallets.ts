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
    accountHint: "من تطبيق شام كاش: استقبال، انسخ الرمز. بيكون 32 حرف ورقم.",
    steps: ["افتح تطبيق شام كاش واكبس إرسال", "الصق رمز المحفظة، أو امسح الـ QR", "حط المبلغ واكبس إرسال، وصوّر الإيصال"],
    qr: true,
  },
  syriatel_cash: {
    name: "سيرياتل كاش",
    short: "سيرياتل كاش",
    icon: "📱",
    accountLabel: "رقم موبايل سيرياتل كاش",
    accountHint: "الرقم اللي عليه حساب سيرياتل كاش، مثال 0933123456",
    steps: ["افتح تطبيق سيرياتل كاش واختار تحويل", "حط الرقم والمبلغ", "أكّد التحويل وصوّر الإيصال"],
    qr: false,
  },
  mtn_cash: {
    name: "MTN كاش",
    short: "MTN كاش",
    icon: "📱",
    accountLabel: "رقم موبايل MTN كاش",
    accountHint: "الرقم اللي عليه حساب MTN كاش، مثال 0944123456",
    steps: ["افتح تطبيق MTN كاش واختار تحويل", "حط الرقم والمبلغ", "أكّد التحويل وصوّر الإيصال"],
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
  !m || m === "cod" ? (pickup ? "كاش بالمحل" : "كاش عند الاستلام") : WALLETS[m]?.name ?? m;
