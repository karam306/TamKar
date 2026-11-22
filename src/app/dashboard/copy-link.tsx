"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const full = url.startsWith("/") ? origin + url : url;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="flex-1 truncate rounded-theme bg-surface px-3 py-2 text-sm" dir="ltr">
        {full}
      </code>
      <button
        type="button"
        className="btn !py-2 text-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(full);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
      >
        {copied ? "✓ تم النسخ" : "نسخ الرابط"}
      </button>
      <a
        className="btn btn-outline !py-2 text-sm"
        href={`https://wa.me/?text=${encodeURIComponent(`تفضّلوا بزيارة متجرنا والطلب عبر الإنترنت: ${full}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        مشاركة عبر واتساب
      </a>
    </div>
  );
}
