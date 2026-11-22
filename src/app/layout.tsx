import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND,
  description: "أنشئ متجرك الإلكتروني خلال دقائق",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
