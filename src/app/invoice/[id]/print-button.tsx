"use client";

/** The browser's print window can save the invoice as a PDF ("Save as PDF"). */
export function PrintButton({ label = "طباعة أو حفظ PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn">
      {label}
    </button>
  );
}
