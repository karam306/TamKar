"use client";

import { useSyncExternalStore } from "react";

/**
 * Light / dark switch for the platform pages (homepage, login, dashboard, admin).
 * The choice is saved in the browser; without a choice the device setting is used
 * (see the small script in app/layout.tsx). Stores always stay in their own colors.
 */
const EVENT = "kun-mode";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const isDark = () => document.documentElement.dataset.mode === "dark";

export function ThemeToggle({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const label = dark ? "الوضع الفاتح" : "الوضع الداكن";

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.mode = next;
    try {
      localStorage.setItem("kun-mode", next);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[13px] font-semibold leading-none transition ${
        onDark ? "border-white/25 text-white hover:bg-white/10" : "border-black/15 hover:bg-black/5"
      }`}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
      <span className={compact ? "sr-only" : "hidden sm:inline"}>{label}</span>
    </button>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
