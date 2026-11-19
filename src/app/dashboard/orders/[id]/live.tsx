"use client";

import { createContext, useContext, useOptimistic } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { setOrderStatus, setPaid } from "../actions";
import { NEXT_STEP, ORDER_STATUSES, PaymentBadge, StatusBadge } from "../status";

/**
 * Status and payment change on screen the moment the merchant clicks,
 * while the server saves in the background.
 */
type Live = { status: OrderStatus; payment: Order["payment_status"] };
const Ctx = createContext<{ live: Live; set: (l: Partial<Live>) => void } | null>(null);
const useLive = () => useContext(Ctx)!;

export function LiveOrder({ status, payment, children }: Live & { children: React.ReactNode }) {
  const [live, set] = useOptimistic<Live, Partial<Live>>({ status, payment }, (cur, patch) => ({ ...cur, ...patch }));
  return <Ctx.Provider value={{ live, set }}>{children}</Ctx.Provider>;
}

export const LiveStatusBadge = () => <StatusBadge status={useLive().live.status} />;
export const LivePaymentBadge = () => <PaymentBadge status={useLive().live.payment} />;

export function NextStepButton({ id }: { id: string }) {
  const { live, set } = useLive();
  const next = NEXT_STEP[live.status];
  if (!next || live.status === "cancelled") return null;
  return (
    <div className="mt-3 flex justify-end border-t border-black/5 pt-3">
      <form
        action={async (fd) => {
          set({ status: next.to });
          await setOrderStatus(fd);
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value={next.to} />
        <button className="btn">{next.label}</button>
      </form>
    </div>
  );
}

export function PaidButton({ id }: { id: string }) {
  const { live, set } = useLive();
  if (live.status === "cancelled") return null;
  const paid = live.payment === "paid";
  return (
    <div className="mt-3 flex justify-end border-t border-black/5 pt-3">
      <form
        action={async (fd) => {
          set({ payment: paid ? "pending" : "paid" });
          await setPaid(fd);
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="paid" value={paid ? "0" : "1"} />
        <button className={paid ? "btn btn-outline" : "btn"}>{paid ? "رجّعه غير مدفوع" : "تم استلام المبلغ"}</button>
      </form>
    </div>
  );
}

export const LivePaidLabel = () => <>{useLive().live.payment === "paid" ? "مدفوع" : "باقي للتحصيل عند الاستلام"}</>;

export function StatusSelect({ id }: { id: string }) {
  const { live, set } = useLive();
  return (
    <form
      action={async (fd) => {
        set({ status: String(fd.get("status")) as OrderStatus });
        await setOrderStatus(fd);
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <select name="status" key={live.status} defaultValue={live.status} className="input">
        {ORDER_STATUSES.filter((s) => s.id !== "cancelled").map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <button className="btn btn-outline">غيّر</button>
    </form>
  );
}
