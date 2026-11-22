import type { Quote } from "@/lib/types";

export const STATUS: Record<Quote["status"], { label: string; className: string }> = {
  sent: { label: "مُرسَل", className: "bg-[#e0f0ff] text-[#00527c]" },
  accepted: { label: "وافق الزبون", className: "bg-[#affebf] text-[#014b40]" },
  declined: { label: "لم يوافق", className: "bg-[#e3e3e3] text-[#616161]" },
};

