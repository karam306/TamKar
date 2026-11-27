"use client";

import { useState, useTransition } from "react";
import { setProductActive } from "./actions";

/** The status badge in the product list is a switch: one tap shows or hides the product. */
export function StatusToggle({ id, active: start }: { id: string; active: boolean }) {
  const [active, setActive] = useState(start);
  const [pending, run] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={pending}
        title={active ? "اضغط لإخفاء المنتج من المتجر" : "اضغط لإظهار المنتج في المتجر"}
        onClick={() => {
          const next = !active;
          setActive(next);
          setError("");
          run(async () => {
            const res = await setProductActive(id, next);
            if (res.error) {
              setActive(!next);
              setError(res.error);
            }
          });
        }}
        className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-semibold transition-colors ${active ? "bg-[#affebf] text-[#014b40]" : "bg-[#e3e3e3] text-[#616161]"} ${pending ? "opacity-60" : "hover:brightness-95"}`}
      >
        <span className={`relative h-4 w-7 rounded-full transition-colors ${active ? "bg-[#1a7f37]" : "bg-[#b5b5b5]"}`}>
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${active ? "right-0.5" : "right-3.5"}`} />
        </span>
        {active ? "نشط" : "مسودة"}
      </button>
      {error && <span className="text-[11px] text-red-700">{error}</span>}
    </span>
  );
}
