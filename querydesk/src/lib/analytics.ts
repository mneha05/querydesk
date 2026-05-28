import type { Dataset, Report, Row, Agg } from "./types";

const CMP: Record<string, (a: any, b: any) => boolean> = {
  "==": (a, b) => String(a) === String(b),
  "!=": (a, b) => String(a) !== String(b),
  ">": (a, b) => Number(a) > Number(b),
  "<": (a, b) => Number(a) < Number(b),
  ">=": (a, b) => Number(a) >= Number(b),
  "<=": (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a ?? "").toLowerCase().includes(String(b).toLowerCase()),
};

function aggregate(nums: number[], rowsCount: number, agg: Agg): number {
  switch (agg) {
    case "count": return rowsCount;
    case "sum": return nums.reduce((s, n) => s + n, 0);
    case "avg": return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
    case "min": return nums.length ? Math.min(...nums) : 0;
    case "max": return nums.length ? Math.max(...nums) : 0;
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface ReportOutput {
  kind: "kpi" | "series" | "table";
  value?: number;
  series?: { label: string; value: number }[];
  columns?: string[];
  rows?: Row[];
  empty: boolean;
}

export function applyFilter(rows: Row[], report: Report): Row[] {
  const f = report.filter;
  if (!f || !f.column || f.value === "") return rows;
  const fn = CMP[f.op] || CMP["=="];
  return rows.filter((r) => fn(r[f.column], f.value));
}

export function buildReport(dataset: Dataset | undefined, report: Report): ReportOutput {
  if (!dataset) return { kind: "kpi", empty: true };
  const rows = applyFilter(dataset.rows, report);

  if (report.viz === "table") {
    return {
      kind: "table", empty: rows.length === 0,
      columns: dataset.fields.map((f) => f.name),
      rows: rows.slice(0, report.limit || 100),
    };
  }

  if (report.viz === "kpi") {
    const nums = report.measure ? rows.map((r) => Number(r[report.measure!])).filter((n) => !isNaN(n)) : [];
    return { kind: "kpi", empty: rows.length === 0, value: round(aggregate(nums, rows.length, report.agg)) };
  }

  // bar / line / donut — group by dimension, aggregate measure
  if (!report.dimension) return { kind: "series", empty: true };
  const groups = new Map<string, number[]>();
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = String(r[report.dimension] ?? "—");
    if (!groups.has(key)) { groups.set(key, []); counts.set(key, 0); }
    counts.set(key, counts.get(key)! + 1);
    if (report.measure) {
      const v = Number(r[report.measure]);
      if (!isNaN(v)) groups.get(key)!.push(v);
    }
  }
  let series = [...groups.entries()].map(([label, nums]) => ({
    label, value: round(aggregate(nums, counts.get(label)!, report.agg)),
  }));
  series.sort((a, b) => (report.sortDesc ? b.value - a.value : a.value - b.value));
  if (report.limit) series = series.slice(0, report.limit);
  return { kind: "series", series, empty: series.length === 0 };
}

export function defaultReport(dataset: Dataset): Report {
  const dims = dataset.fields.filter((f) => f.type !== "number").map((f) => f.name);
  const meas = dataset.fields.filter((f) => f.type === "number").map((f) => f.name);
  return {
    id: "r_" + Math.random().toString(36).slice(2, 9),
    title: "Untitled report",
    datasetId: dataset.id,
    viz: "bar",
    dimension: dims[0],
    measure: meas[0],
    agg: "sum",
    filter: null,
    limit: 8,
    sortDesc: true,
  };
}
