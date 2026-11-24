import { BRAND_FULL, BRAND_FULL_AR } from "@/lib/brand";

/**
 * The Kun Stores wordmark (approved 2026-11-24).
 * Arabic: "كُن" in Rakkas + "ستورز" in Alexandria Bold on the highlighter.
 * English: "kun" in Abril Fatface (tight letters) with the Arabic damma over the "u",
 *          + "stores" in Alexandria Bold on the highlighter.
 * Size it with a text-* class: everything scales from the font size.
 * `onDark` switches to the dark-background colors (damma mint, bar olive).
 * `short` drops the second word (small spaces like the dashboard bar).
 */
export function KunLogo({
  lang = "ar",
  onDark = false,
  short = false,
  className = "",
}: {
  lang?: "ar" | "en";
  onDark?: boolean;
  short?: boolean;
  className?: string;
}) {
  const cls = `kun-logo ${onDark ? "kun-on-dark" : ""} ${className}`;
  if (lang === "en") {
    return (
      <span className={cls} dir="ltr" role="img" aria-label={short ? "Kun" : BRAND_FULL}>
        <span className="kun-en" aria-hidden>
          k
          <span className="kun-u">
            u<span className="kun-damma">و</span>
          </span>
          n
        </span>
        {!short && (
          <span className="kun-stores" aria-hidden>
            stores
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={cls} dir="rtl" role="img" aria-label={short ? "كُن" : BRAND_FULL_AR}>
      <span className="kun-ar" aria-hidden>
        كُن
      </span>
      {!short && (
        <span className="kun-stores" aria-hidden>
          ستورز
        </span>
      )}
    </span>
  );
}
