"use client";

import { useState } from "react";
import { StoreLink } from "@/components/store-ui";
import { formatPrice } from "@/lib/format";
import type { Currency, WalletId } from "@/lib/types";
import { WALLETS } from "@/lib/wallets";

/** After the order: everything the customer needs to send the money from their wallet app. */
export function WalletPay({
  number,
  total,
  currency,
  whatsappUrl,
  wallet,
}: {
  number: number;
  total: number;
  currency: Currency;
  whatsappUrl: string;
  wallet: { id: WalletId; account: string; holder: string | null; qr: string | null };
}) {
  const info = WALLETS[wallet.id];
  const amount = String(Math.round(total * 100) / 100);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 text-4xl">{info.icon}</div>
        <h1 className="mb-1 text-2xl">آخر خطوة: الدفع عبر {info.name}</h1>
        <p className="text-sm text-muted">انحفظ طلبك رقم #{number}. حوّل المبلغ، وبعدين ابعتلنا الإيصال على واتساب.</p>
      </div>

      <div className="space-y-3 rounded-theme bg-surface p-4">
        <CopyRow label="المبلغ" shown={formatPrice(total, currency)} value={amount} big />
        <CopyRow label={wallet.id === "sham_cash" ? "رمز المحفظة" : "الرقم"} shown={wallet.account} value={wallet.account} mono />
        {wallet.holder && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">باسم</span>
            <span className="font-semibold">{wallet.holder}</span>
          </div>
        )}
        {wallet.qr && (
          <div className="rounded-theme bg-white p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wallet.qr} alt={`QR ${info.name}`} className="mx-auto max-h-64 w-auto" />
            <p className="mt-2 text-xs text-muted">إذا عم تدفع من موبايل تاني، امسح هالرمز من التطبيق</p>
          </div>
        )}
      </div>

      <ol className="my-6 space-y-2 text-sm">
        {info.steps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white">{info.steps.length + 1}</span>
          <span className="pt-0.5">ابعت الطلب على واتساب وارفق صورة الإيصال</span>
        </li>
      </ol>

      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn w-full !bg-[#25D366]">
        دفعت، ابعت الطلب على واتساب
      </a>
      <p className="mt-3 text-center text-xs text-muted">المحل بيأكد طلبك بعد ما توصله الدفعة.</p>
      <div className="mt-4 text-center">
        <StoreLink href="/" className="text-sm text-primary">
          الرجوع للمتجر
        </StoreLink>
      </div>
    </div>
  );
}

function CopyRow({ label, shown, value, big, mono }: { label: string; shown: string; value: string; big?: boolean; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older phones: copy through a hidden text box.
      const t = document.createElement("textarea");
      t.value = value;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-3 rounded-theme bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">{label}</div>
        <div className={`${big ? "text-2xl font-bold text-primary" : "text-sm"} ${mono ? "break-all font-mono" : ""}`} dir="ltr" style={{ textAlign: "right" }}>
          {shown}
        </div>
      </div>
      <button type="button" onClick={copy} className="btn btn-outline shrink-0 !px-3 !py-1.5 text-sm">
        {copied ? "✓ انتسخ" : "انسخ"}
      </button>
    </div>
  );
}
