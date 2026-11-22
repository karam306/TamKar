import { PRO_FEATURES } from "@/lib/plans";

const SUPPORT = process.env.PLATFORM_SUPPORT_WHATSAPP;

/** Shown instead of a Pro feature on the Basic plan. */
export function ProGate({ feature, compact }: { feature: string; compact?: boolean }) {
  const link = SUPPORT ? `https://wa.me/${SUPPORT}?text=${encodeURIComponent(`مرحباً، أرغب في ترقية متجري إلى الباقة الاحترافية (${feature})`)}` : null;
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f4f0ff] p-3 text-[13px]">
        <span>🔒 {feature} متاحة في الباقة الاحترافية.</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#5700d1] underline">
            رقِّ متجرك
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="card space-y-3 p-5">
      <div className="text-2xl">🔒</div>
      <h2 className="text-base font-semibold">{feature} متاحة في الباقة الاحترافية</h2>
      <p className="text-[13px] text-muted">الباقة الاحترافية مخصصة للمحلات المتنامية، وتشمل:</p>
      <ul className="space-y-1 text-[13px]">
        {PRO_FEATURES.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="btn inline-block">
          رقِّ متجرك عبر واتساب
        </a>
      )}
    </div>
  );
}
