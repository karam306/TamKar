"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-ui";
import type { LoyaltySettings } from "@/lib/loyalty";
import { saveLoyalty } from "./actions";

export function LoyaltyForm({ initial, unit }: { initial: LoyaltySettings | null; unit: string }) {
  const [state, action] = useActionState(saveLoyalty, undefined);
  const [on, setOn] = useState(initial?.enabled ?? false);
  const [per, setPer] = useState(String(initial?.per ?? (unit === "ل.س" ? 1000 : 1)));
  const [block, setBlock] = useState(String(initial?.block ?? 100));
  const [reward, setReward] = useState(String(initial?.reward ?? (unit === "ل.س" ? 5000 : 5)));
  const spend = Number(per) * Number(block);
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 accent-black" />
        تفعيل نقاط الولاء
      </label>
      <div className={`space-y-3 text-[13px] ${on ? "" : "pointer-events-none opacity-40"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span>نقطة واحدة عن كل</span>
          <input name="per" className="input !w-28" dir="ltr" inputMode="decimal" value={per} onChange={(e) => setPer(e.target.value)} />
          <span>{unit} يدفعها الزبون</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span>كل</span>
          <input name="block" className="input !w-24" dir="ltr" inputMode="numeric" value={block} onChange={(e) => setBlock(e.target.value)} />
          <span>نقطة = خصم</span>
          <input name="reward" className="input !w-28" dir="ltr" inputMode="decimal" value={reward} onChange={(e) => setReward(e.target.value)} />
          <span>{unit}</span>
        </div>
        {spend > 0 && Number(reward) > 0 && (
          <p className="rounded-lg bg-black/[0.04] px-3 py-2">
            يعني: من يشتري بقيمة {spend.toLocaleString("en-US")} {unit} يحصل على خصم {Number(reward).toLocaleString("en-US")} {unit}، أي{" "}
            {Math.round((Number(reward) / spend) * 1000) / 10}٪ من مشترياته.
          </p>
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton>حفظ</SubmitButton>
    </form>
  );
}
