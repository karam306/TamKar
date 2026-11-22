"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form-ui";
import type { Wallet, WalletId } from "@/lib/types";
import { WALLET_IDS, WALLETS } from "@/lib/wallets";
import { savePayments } from "./actions";

export function PaymentsForm({ cod, wallets }: { cod: boolean; wallets: Wallet[] }) {
  const [state, action] = useActionState(savePayments, undefined);
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(wallets.map((w) => [w.id, true])));

  return (
    <form action={action} className="space-y-4">
      <section className="card space-y-2 p-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="cod" defaultChecked={cod} className="h-5 w-5" />
          <span>
            <b className="block text-sm">💵 نقداً عند الاستلام</b>
            <span className="text-[13px] text-muted">يدفع الزبون في المحل أو للمندوب عند الاستلام.</span>
          </span>
        </label>
      </section>

      <p className="px-1 text-[13px] text-muted">
        فعّل المحفظة التي لديك. بعد أن يطلب الزبون، تظهر له صفحة فيها المبلغ ورقم حسابك مع زر نسخ، فيحوّل من تطبيقه ويرسل إليك الإيصال عبر واتساب. وبعد التحقق من وصول المبلغ، اضغط &quot;تم الدفع&quot; في الطلب.
      </p>

      {WALLET_IDS.map((id: WalletId) => {
        const info = WALLETS[id];
        const w = wallets.find((x) => x.id === id);
        return (
          <section key={id} className="card space-y-3 p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name={`${id}_on`}
                checked={Boolean(on[id])}
                onChange={(e) => setOn({ ...on, [id]: e.target.checked })}
                className="h-5 w-5"
              />
              <b className="text-sm">
                {info.icon} {info.name}
              </b>
            </label>
            {on[id] && (
              <div className="space-y-3">
                <Field label={info.accountLabel} hint={info.accountHint}>
                  <input name={`${id}_account`} required defaultValue={w?.account ?? ""} className="input font-mono" dir="ltr" autoComplete="off" />
                </Field>
                <Field label="اسم صاحب الحساب (اختياري)" hint="يراه الزبون ليتأكد من أنه يحوّل إلى الشخص الصحيح">
                  <input name={`${id}_holder`} defaultValue={w?.holder ?? ""} maxLength={80} className="input" />
                </Field>
                {info.qr && (
                  <Field label="صورة الـ QR (اختياري)" hint="من تطبيق شام كاش: اختر «استقبال»، والتقط صورة للشاشة تُظهر الرمز، ثم ارفعها هنا.">
                    <div className="space-y-2">
                      {w?.qr && (
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={w.qr} alt="QR" className="h-24 w-24 rounded-lg border object-contain" />
                          <label className="flex items-center gap-1 text-[13px] text-muted">
                            <input type="checkbox" name={`${id}_qr_remove`} /> حذف الصورة
                          </label>
                        </div>
                      )}
                      <input type="file" name={`${id}_qr`} accept="image/*" className="text-sm" />
                    </div>
                  </Field>
                )}
              </div>
            )}
          </section>
        );
      })}

      <FormMessage state={state} />
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
