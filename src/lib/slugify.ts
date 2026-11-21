/** Turns a store name (Arabic or English) into a web address like "bait-almatbakh". */
const AR: Record<string, string> = {
  ا: "a", أ: "a", إ: "e", آ: "a", ء: "", ؤ: "o", ئ: "e", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh", د: "d", ذ: "th",
  ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l",
  م: "m", ن: "n", ه: "h", ة: "a", و: "w", ي: "y", ى: "a",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function slugify(name: string): string {
  const latin = [...name.trim().toLowerCase()].map((ch) => (ch in AR ? AR[ch] : ch)).join("");
  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    .replace(/-$/, "");
}
