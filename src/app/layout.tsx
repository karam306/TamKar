import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND_FULL } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: "أنشئ متجرك الإلكتروني خلال دقائق",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

/** Picks light or dark before the page paints: the saved choice, else the device setting. */
const MODE_SCRIPT = `(function(){try{var m=localStorage.getItem("kun-mode");if(m!=="dark"&&m!=="light")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.mode=m}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
