// Smart product search for the store. The customer does not need to type the exact name:
// - Arabic spelling differences are ignored (أ إ آ ا، ة ه، ى ي، ؤ ئ، tashkeel, tatweel)
// - common prefixes and endings are ignored ("الفستان" = "فستان"، "بالشوكولا" = "شوكولا"، "فساتين" ≈ "فستان")
// - small typos are forgiven (one wrong letter in short words, two in long words)
// - spaces don't matter ("تي شيرت" = "تيشيرت")
// - a few common synonyms (Syrian and standard Arabic, English) are understood
// - Arabic and English digits are the same
// Pure functions, no database: used on the server to rank products.

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Removes "ال" and attached و ب ل ك ف at the start of an Arabic word. */
export function stem(word: string): string {
  let w = word;
  if (/^[\u0600-\u06FF]/.test(w)) {
    if (w.length > 4 && /^(وال|بال|كال|فال)/.test(w)) w = w.slice(3);
    else if (w.length > 4 && w.startsWith("لل")) w = w.slice(2);
    else if (w.length > 3 && w.startsWith("ال")) w = w.slice(2);
  }
  return w;
}

/** Also drops common endings (plural, feminine, possessive), used as a second, looser comparison. */
function root(w: string): string {
  if (/^[\u0600-\u06FF]/.test(w)) {
    if (w.length > 4 && /(ات|ون|ين|يه|ها|هم)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /[هي]$/.test(w)) return w.slice(0, -1);
  } else if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
  return w;
}

// Groups of words people use for the same thing. Kept short and general on purpose.
const SYNONYMS: string[][] = [
  ["بنطلون", "بنطال", "جينز", "pants", "jeans"],
  ["تيشيرت", "تيشرت", "تي شيرت", "كنزه", "بلوزه", "tshirt", "t shirt"],
  ["قميص", "شميز", "shirt"],
  ["فستان", "فساتين", "روب", "dress"],
  ["حذاء", "احذيه", "صباط", "كندره", "بوط", "shoes", "shoe"],
  ["شنطه", "حقيبه", "جزدان", "bag"],
  ["جاكيت", "جاكيت", "معطف", "جاكيت", "jacket", "coat"],
  ["عطر", "عطور", "برفان", "perfume"],
  ["ساعه", "ساعات", "watch"],
  ["موبايل", "جوال", "هاتف", "تلفون", "phone", "mobile"],
  ["شاحن", "charger"],
  ["سماعه", "سماعات", "headphones", "earbuds"],
  ["كاسه", "كاسات", "كاس", "كؤوس", "كوب", "اكواب", "glass", "cup", "mug"],
  ["فنجان", "فناجين", "فناجين قهوه"],
  ["صحن", "طبق", "صحون", "اطباق", "plate"],
  ["طنجره", "قدر", "حله", "pot"],
  ["مقلايه", "طاوه", "pan"],
  ["كيك", "كاتو", "جاتو", "cake"],
  ["حلويات", "حلو", "سكاكر", "sweets"],
  ["شوكولا", "شوكولاته", "شكولا", "شكولاته", "شوكلت", "chocolate"],
  ["قهوه", "بن", "coffee"],
  ["اطفال", "ولادي", "بيبي", "kids", "baby"],
  ["نسائي", "ستاتي", "حريمي", "women"],
  ["رجالي", "شبابي", "men"],
  ["كريم", "مرطب", "cream"],
  ["مكياج", "ميك اب", "makeup"],
];

const SYN_INDEX = new Map<string, string[]>();
for (const group of SYNONYMS) {
  const norm = group.map((w) => stem(normalize(w).replace(/ /g, "")));
  for (const w of norm) SYN_INDEX.set(w, [...new Set([...(SYN_INDEX.get(w) ?? []), ...norm])]);
}

function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well one query word matches one product word, 0 to 1. Synonyms only match whole words. */
function rawScore(q: string, w: string, syn: boolean): number {
  if (q === w) return 1;
  if (syn && q.length < 4) return 0; // short synonyms ("بن") would match too much
  if (q.length >= 2 && w.startsWith(q)) return 0.9; // typing in progress: "فست" → "فستان"
  if (q.length >= 3 && w.includes(q)) return 0.75;
  if (!syn && w.length >= 3 && q.startsWith(w)) return 0.7;
  const allowed = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
  if (allowed && distance(q, w, allowed) <= allowed) return 0.65;
  return 0;
}

/** Arabic word without long vowels and a final ن: "فساتين" and "فستان" both give "فست". */
function skeleton(w: string): string {
  if (!/^[\u0600-\u06FF]/.test(w)) return "";
  let k = w.replace(/[اويه]/g, "");
  if (k.length > 3 && k.endsWith("ن")) k = k.slice(0, -1);
  return k;
}

function wordScore(q: string, w: string, syn: boolean): number {
  const a = rawScore(q, w, syn);
  if (a >= 0.9) return a;
  const rq = root(q);
  const rw = root(w);
  const b = rq.length >= 3 && rw.length >= 3 ? rawScore(rq, rw, syn) * 0.9 : 0;
  // broken plurals share their consonants ("فستان" / "فساتين"، "قميص" / "قمصان")
  const sq = skeleton(q);
  const c = !syn && sq.length >= 3 && sq === skeleton(w) ? 0.6 : 0;
  return Math.max(a, b, c);
}

export type Searchable = {
  title: string;
  category?: string | null;
  description?: string | null;
  sku?: string | null;
  options?: { name: string; values: string[] }[];
  specs?: { name: string; value: string }[];
};

type Field = { words: string[]; joined: string; weight: number };

function field(text: string | null | undefined, weight: number): Field {
  const n = normalize(text ?? "");
  return { words: n ? n.split(" ").map(stem) : [], joined: n.replace(/ /g, ""), weight };
}

export type Query = { words: string[][]; phrase: string[] | null; joined: string; raw: string };

/** Prepare the customer's text once, with its synonyms. */
export function parseQuery(text: string): Query | null {
  const n = normalize(text);
  if (!n) return null;
  const words = n
    .split(" ")
    .filter((w) => w.length > 1 || /\d/.test(w))
    .slice(0, 8)
    .map((w) => {
      const s = stem(w);
      return [s, ...(SYN_INDEX.get(s) ?? []).filter((x) => x !== s)];
    });
  const joined = n.replace(/ /g, "");
  // a two-word phrase that is one synonym ("تي شيرت") also counts as one word
  const one = stem(joined);
  const phrase = words.length > 1 && SYN_INDEX.has(one) ? [one, ...SYN_INDEX.get(one)!] : null;
  return words.length ? { words, phrase, joined, raw: n } : null;
}

/** 0 = not a match. Higher = better. Every query word must match something. */
export function scoreProduct(p: Searchable, q: Query): number {
  if (p.sku && normalize(p.sku) === q.raw) return 100;
  const fields = [
    field(p.title, 3),
    field(p.category, 2),
    field((p.options ?? []).flatMap((o) => o.values).join(" "), 1.2),
    field((p.specs ?? []).map((s) => s.value).join(" "), 1),
    field(p.description, 0.6),
  ];
  // whole phrase without spaces inside the title ("تي شيرت" in "تيشيرت قطن")
  let total = fields[0].joined.includes(q.joined) && q.joined.length >= 3 ? 3 : 0;
  const best = (alternatives: string[]) => {
    let b = 0;
    for (const f of fields)
      for (const w of f.words)
        for (const alt of alternatives) {
          const s = wordScore(alt, w, alt !== alternatives[0]) * f.weight * (alt === alternatives[0] ? 1 : 0.9);
          if (s > b) b = s;
        }
    return b;
  };
  if (q.phrase) {
    const b = best(q.phrase);
    if (b >= 1) return total + b * 2;
  }
  let matched = 0;
  const needed = q.words.length;
  for (const alternatives of q.words) {
    const b = best(alternatives);
    if (b > 0) matched++;
    total += b;
  }
  // Allow one missing word in longer searches ("فستان سهره احمر طويل"), never in short ones.
  if (matched < needed - (needed >= 3 ? 1 : 0)) return 0;
  return total * (matched / needed);
}

export function searchProducts<T extends Searchable>(products: T[], text: string): T[] {
  const q = parseQuery(text);
  if (!q) return products;
  return products
    .map((p) => ({ p, s: scoreProduct(p, q) }))
    .filter((x) => x.s > 0.6)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}
