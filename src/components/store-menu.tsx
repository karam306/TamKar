"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { MenuLink } from "@/lib/types";
import { StoreLink } from "./store-ui";

/** ☰ menu for phones. */
export function StoreMobileMenu({ links }: { links: MenuLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-theme p-2 hover:bg-surface"
        aria-label="القائمة"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
            />
            <nav className="absolute inset-y-0 right-0 flex w-72 flex-col gap-1 bg-bg p-4 shadow-xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mb-2 self-start p-1 text-muted"
                aria-label="إغلاق"
              >
                ✕
              </button>
              {links.map((l) =>
                /^https?:\/\//.test(l.href) ? (
                  <a
                    key={l.href + l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-theme px-3 py-3 text-lg hover:bg-surface"
                  >
                    {l.label}
                  </a>
                ) : (
                  <span key={l.href + l.label} onClick={() => setOpen(false)}>
                    <StoreLink
                      href={l.href}
                      className="block rounded-theme px-3 py-3 text-lg hover:bg-surface"
                    >
                      {l.label}
                    </StoreLink>
                  </span>
                ),
              )}
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
