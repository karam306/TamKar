"use client";

import { useRef, useState } from "react";
import { bulkProducts } from "./actions";

/** Wraps the product table: when products are ticked, shows bulk actions. */
export function BulkBar({ children }: { children: React.ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const recount = () => setCount(form.current?.querySelectorAll('input[name="ids"]:checked').length ?? 0);

  return (
    <form ref={form} action={bulkProducts} onChange={recount} className="relative overflow-x-auto">
      {count > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-black/5 bg-white p-2 text-[13px]">
          <span className="font-semibold">تم اختيار {count}</span>
          <button name="action" value="activate" className="btn btn-outline" onClick={() => setTimeout(() => setCount(0), 50)}>
            تفعيلها
          </button>
          <button name="action" value="draft" className="btn btn-outline" onClick={() => setTimeout(() => setCount(0), 50)}>
            تحويلها إلى مسودة
          </button>
          <button
            name="action"
            value="delete"
            className="btn btn-outline !text-red-700"
            onClick={(e) => {
              if (!window.confirm(`هل تريد بالتأكيد حذف ${count} منتج؟ الحذف نهائي.`)) e.preventDefault();
            }}
          >
            حذف
          </button>
        </div>
      )}
      {children}
    </form>
  );
}
