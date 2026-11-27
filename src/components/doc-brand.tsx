import { KunLogo } from "@/components/kun-logo";

/** Small "made with Kun Stores" line at the bottom of invoices and quotes. */
export function MadeWithKun() {
  return (
    <a
      href="https://www.kunstores.com"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-10 flex items-center justify-center gap-2 border-t border-black/10 pt-4 text-[12px] text-muted"
    >
      <span>صادرة عبر</span>
      <KunLogo lang="ar" className="text-[1.1rem]" />
      <span dir="ltr">kunstores.com</span>
    </a>
  );
}

/** The store's own logo at the top of a document. */
export function StoreLogo({ src }: { src?: string | null }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="mb-3 h-16 max-w-[200px] object-contain object-right" />;
}
