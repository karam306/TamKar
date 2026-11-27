"use client";

import { useState, useTransition } from "react";
import { makeCartCode, markReminded } from "./actions";

/** Reminder buttons for one abandoned cart. */
export function Remind({ id, phone, base }: { id: string; phone: string; base: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const wa = (text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={wa(base)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline !py-1.5 text-[13px]"
        onClick={() => void markReminded(id)}
      >
        تذكير عبر واتساب
      </a>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="btn !py-1.5 text-[13px]" onClick={() => void markReminded(id)}>
          إرسال التذكير مع الكود
        </a>
      ) : (
        <button
          type="button"
          className="btn btn-outline !py-1.5 text-[13px]"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await makeCartCode(10);
              if ("error" in r) return setError(r.error);
              setLink(wa(`${base}\nولأنك من زبائننا، استخدم الكود ${r.code} لخصم ١٠٪ على طلبك، صالح حتى ${r.until}.`));
            })
          }
        >
          {pending ? "..." : "تذكير مع خصم ١٠٪"}
        </button>
      )}
      {error && <span className="text-[13px] text-red-700">{error}</span>}
    </div>
  );
}
