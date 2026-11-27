import "server-only";
import ExcelJS from "exceljs";

/** Product spreadsheet columns. Arabic header first; English names are accepted too. */
export const PRODUCT_COLUMNS = [
  { key: "title", header: "الاسم", alt: ["title", "name", "اسم المنتج"] },
  { key: "description", header: "الوصف", alt: ["description", "body"] },
  { key: "price", header: "السعر", alt: ["price"] },
  { key: "compare_at_price", header: "السعر قبل الخصم", alt: ["compare at price", "compare_at_price"] },
  { key: "stock", header: "الكمية", alt: ["stock", "quantity", "inventory", "المخزون"] },
  { key: "sku", header: "SKU", alt: ["sku", "رمز المنتج", "الرمز", "باركود", "barcode"] },
  { key: "category", header: "النوع", alt: ["type", "category", "product type", "التصنيف", "القسم"] },
  { key: "status", header: "الحالة", alt: ["status", "active"] },
] as const;

export type ProductRow = Partial<Record<(typeof PRODUCT_COLUMNS)[number]["key"], string>>;

const norm = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, " ");

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
    if (v instanceof Date) return v.toISOString();
  }
  return String(v);
}

/** Reads an .xlsx or .csv file into rows keyed by our column names. */
export async function readProductSheet(file: File): Promise<ProductRow[]> {
  const buf = Buffer.from(await file.arrayBuffer());
  let table: string[][];
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    table = parseCsv(buf.toString("utf8").replace(/^﻿/, ""));
  } else {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    table = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as ExcelJS.CellValue[];
      table.push(values.slice(1).map(cellText));
    });
  }
  if (table.length < 2) return [];
  const headers = table[0].map(norm);
  const index: Partial<Record<string, number>> = {};
  for (const col of PRODUCT_COLUMNS) {
    const names = [col.header, ...col.alt].map(norm);
    const i = headers.findIndex((h) => names.includes(h));
    if (i >= 0) index[col.key] = i;
  }
  return table.slice(1).map((r) => {
    const row: ProductRow = {};
    for (const col of PRODUCT_COLUMNS) {
      const i = index[col.key];
      if (i !== undefined) row[col.key] = (r[i] ?? "").toString().trim();
    }
    return row;
  });
}

/** Minimal CSV reader (handles quotes, commas and new lines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Builds an .xlsx file (right-to-left sheet, bold headers). */
export async function buildSheet(name: string, headers: string[], rows: (string | number | null | undefined)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.addRow(headers).font = { bold: true };
  rows.forEach((r) => ws.addRow(r.map((v) => (v == null ? "" : v))));
  ws.columns.forEach((c, i) => (c.width = Math.min(50, Math.max(12, headers[i]?.length + 4))));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Several sheets in one .xlsx file (right-to-left, bold headers). */
export async function buildBook(sheets: { name: string; headers: string[]; rows: (string | number | null | undefined)[][] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
    ws.addRow(s.headers).font = { bold: true };
    s.rows.forEach((r) => ws.addRow(r.map((v) => (v == null ? "" : v))));
    ws.columns.forEach((c, i) => (c.width = Math.min(50, Math.max(12, (s.headers[i]?.length ?? 8) + 4))));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
