import { BRAND_FULL, BRAND_FULL_AR } from "@/lib/brand";
import { LOGO } from "./kun-logo-data";

/**
 * The Kun Stores logo, drawn from the outlined brand-kit shapes (no web fonts needed).
 * Arabic: "كن" in Rakkas with the brand damma + "ستورز" (Alexandria Bold) on the highlighter.
 * English: "kun" in Abril Fatface with the brand damma on the k + "stores" on the highlighter.
 * The brand damma is the same mark as the favicon.
 * Size it with a text-* class: the name is drawn 1em tall-ish, like text.
 * `onDark` switches to the dark-background colors (damma mint, bar olive).
 * `short` drops the second word (small spaces like the dashboard bar).
 * Never show the Arabic and English logos side by side.
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
  const art = LOGO[`${lang}${short ? "-short" : ""}`];
  const [x, y, w, h] = art.viewBox;
  const label = lang === "ar" ? (short ? "كُن" : BRAND_FULL_AR) : short ? "Kun" : BRAND_FULL;
  return (
    <svg
      className={`kun-logo ${onDark ? "kun-on-dark" : ""} ${className}`}
      viewBox={`${x} ${y} ${w} ${h}`}
      style={{ height: `${h / 200}em`, width: "auto" }}
      role="img"
      aria-label={label}
    >
      {art.bar && <rect x={art.bar[0]} y={art.bar[1]} width={art.bar[2]} height={art.bar[3]} className="kun-bar" />}
      <path d={art.ink} fill="currentColor" />
      <path d={art.damma} className="kun-damma" />
    </svg>
  );
}
