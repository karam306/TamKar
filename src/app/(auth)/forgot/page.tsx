import type { Metadata } from "next";
import { ForgotForm } from "./form";

export const metadata: Metadata = { title: "نسيت كلمة المرور", robots: { index: false } };

export default function ForgotPage() {
  return <ForgotForm support={process.env.PLATFORM_SUPPORT_WHATSAPP ?? null} />;
}
