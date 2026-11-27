"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { useStore } from "./store-context";

type Hit = { id: string; title: string; price: number; compare: number | null; image: string | null };

/**
 * Search in the store header. A magnifier opens a box under the header; suggestions
 * appear while typing, and Enter opens the full results page. The search forgives
 * spelling differences and small mistakes (see lib/search.ts).
 */
export function StoreSearch() {
  const { slug, base, currency } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?s=${encodeURIComponent(slug)}&q=${encodeURIComponent(text)}`, { signal: ctrl.signal });
        const j = (await r.json()) as { items: Hit[]; total: number };
        setHits(j.items ?? []);
        setTotal(j.total ?? 0);
      } catch {}
      setLoading(false);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, slug]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const short = q.trim().length < 2;
  const all = `${base}/products?q=${encodeURIComponent(q.trim())}`;
  const close = () => {
    setOpen(false);
    setQ("");
    setHits([]);
  };

  return (
    <div ref={box}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center rounded-theme px-3 py-2 hover:bg-surface" aria-label="البحث">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-black/5 bg-bg shadow-lg">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (short) return;
                router.push(all);
                close();
              }}
              className="flex gap-2"
            >
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
                enterKeyHint="search"
                placeholder="عمّ تبحث؟"
                className="input flex-1"
                aria-label="ابحث في المتجر"
              />
              <button type="submit" className="btn">
                بحث
              </button>
            </form>

            {!short && (
              <div className="mt-2 max-h-[60vh] overflow-y-auto">
                {hits.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">{loading ? "جارٍ البحث..." : "لا توجد منتجات مطابقة. جرّب كلمة أخرى."}</p>
                ) : (
                  <ul className="divide-y divide-black/5">
                    {hits.map((h) => (
                      <li key={h.id}>
                        <Link href={`${base}/p/${h.id}`} onClick={close} className="flex items-center gap-3 py-2 hover:bg-surface">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={h.image || "/demo/k1.svg"} alt="" className="h-12 w-12 shrink-0 rounded-theme bg-surface object-cover" />
                          <span className="flex-1 text-sm">{h.title}</span>
                          <span className="text-sm font-semibold text-primary">{formatPrice(h.price, currency)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {total > hits.length && (
                  <Link href={all} onClick={close} className="mt-2 block rounded-theme bg-surface py-2 text-center text-sm font-semibold">
                    عرض كل النتائج ({total})
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
