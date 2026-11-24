"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Homepage motion helpers.
 * RevealObserver: anything with [data-reveal] fades up when it scrolls into view,
 * and any [data-count] number counts up once. Without JavaScript everything is simply visible.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("kun-js");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal],[data-count]"));
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          if (el.dataset.count) countUp(el);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target)) return;
  const start = performance.now();
  const dur = 1200;
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** A bottom bar on phones that appears once the hero buttons scroll out of view. */
export function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const end = document.getElementById("final-cta");
    if (!hero || !("IntersectionObserver" in window)) return;
    let heroVisible = true;
    let endVisible = false;
    const update = () => setShow(!heroVisible && !endVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting || e.boundingClientRect.top > 0;
        if (e.target === end) endVisible = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    if (end) io.observe(end);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`kun-sticky ${show ? "is-on" : ""}`} aria-hidden={!show}>
      <div className="text-sm leading-5">
        <div className="font-semibold">14 يوماً مجاناً</div>
        <div className="text-[var(--mute)]">دون بطاقة ودون عمولة</div>
      </div>
      <Link href="/signup" className="nama-btn !px-5 !py-2.5" tabIndex={show ? 0 : -1}>
        أنشئ متجرك
      </Link>
    </div>
  );
}
