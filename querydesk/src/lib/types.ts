export type Cell = string | number | null;
export type Row = Record<string, Cell>;
export type ColType = "number" | "string" | "date";

export interface Field {
  name: string;
  type: ColType;
}

export interface Dataset {
  id: string;
  name: string;
  fields: Field[];
  rows: Row[];
  builtin?: boolean;
}

export type Viz = "kpi" | "bar" | "line" | "donut" | "table";
export type Agg = "sum" | "avg" | "count" | "min" | "max";

export interface ReportFilter {
  column: string;
  op: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains";
  value: string;
}

export interface Report {
  id: string;
  title: string;
  datasetId: string;
  viz: Viz;
  dimension?: string;
  measure?: string;
  agg: Agg;
  filter?: ReportFilter | null;
  limit: number;
  sortDesc: boolean;
}

// ---------------------------------------------------------------------------
// CSV parsing — RFC-4180-ish: handles quoted fields, embedded commas/newlines,
// and escaped double-quotes ("").
// ---------------------------------------------------------------------------
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const headers = (nonEmpty.shift() || []).map((h) => h.trim());
  return { headers, rows: nonEmpty };
}

function inferType(values: string[]): ColType {
  const sample = values.filter((v) => v != null && v.trim() !== "").slice(0, 200);
  if (!sample.length) return "string";
  const allNum = sample.every((v) => v.trim() !== "" && !isNaN(Number(v.replace(/,/g, ""))));
  if (allNum) return "number";
  const dateLike = sample.every((v) => /^\d{4}-\d{2}(-\d{2})?$/.test(v.trim()) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v.trim()));
  if (dateLike) return "date";
  return "string";
}

export function datasetFromCsv(name: string, text: string): Dataset {
  const { headers, rows } = parseCsv(text);
  if (!headers.length) throw new Error("No header row found.");
  const cols = headers.map((_, ci) => rows.map((r) => r[ci] ?? ""));
  const fields: Field[] = headers.map((h, ci) => ({ name: h || `col_${ci + 1}`, type: inferType(cols[ci]) }));
  const objRows: Row[] = rows.map((r) => {
    const o: Row = {};
    fields.forEach((f, ci) => {
      const raw = (r[ci] ?? "").trim();
      o[f.name] = f.type === "number" ? (raw === "" ? null : Number(raw.replace(/,/g, ""))) : raw === "" ? null : raw;
    });
    return o;
  });
  return {
    id: "ds_" + Math.random().toString(36).slice(2, 9),
    name,
    fields,
    rows: objRows,
  };
}

export const dimensions = (d: Dataset) => d.fields.filter((f) => f.type !== "number").map((f) => f.name);
export const measures = (d: Dataset) => d.fields.filter((f) => f.type === "number").map((f) => f.name);
