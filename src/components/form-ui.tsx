"use client";

import { useFormStatus } from "react-dom";

export type FormState = { error?: string; ok?: string } | undefined;

export function SubmitButton({ children, pendingText = "جاري الحفظ...", className = "" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-theme bg-red-50 p-3 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="rounded-theme bg-green-50 p-3 text-sm text-green-800">{state.ok}</p>;
  return null;
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
