import type { Dataset, Row, Field } from "./types";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

function buildTickets(): Dataset {
  const r = rng(11);
  const channels = ["Email", "Chat", "Phone", "Portal"];
  const categories = ["Billing", "Technical", "Account", "Feature Request", "Outage"];
  const priorities = ["Low", "Medium", "High", "Urgent"];
  const regions = ["West", "Central", "East", "International"];
  const agents = ["Maya", "Devon", "Priya", "Leo", "Sana", "Theo"];
  const status = ["Resolved", "Resolved", "Resolved", "Pending", "Escalated"];
  const rows: Row[] = [];
  for (let i = 1; i <= 260; i++) {
    const pr = pick(r, priorities);
    const baseRes = { Low: 6, Medium: 14, High: 26, Urgent: 40 }[pr]!;
    const month = 1 + Math.floor(r() * 6);
    const day = 1 + Math.floor(r() * 27);
    const csatBias = pr === "Urgent" ? -1.1 : 0;
    rows.push({
      ticket_id: 5000 + i,
      date: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      channel: pick(r, channels),
      category: pick(r, categories),
      priority: pr,
      region: pick(r, regions),
      agent: pick(r, agents),
      status: pick(r, status),
      resolution_hours: Math.round((baseRes * (0.5 + r())) * 10) / 10,
      csat: Math.max(1, Math.min(5, Math.round((4.1 + csatBias + (r() - 0.5) * 2)))),
      reopened: r() < 0.12 ? 1 : 0,
    });
  }
  const fields: Field[] = [
    { name: "ticket_id", type: "number" }, { name: "date", type: "date" },
    { name: "channel", type: "string" }, { name: "category", type: "string" },
    { name: "priority", type: "string" }, { name: "region", type: "string" },
    { name: "agent", type: "string" }, { name: "status", type: "string" },
    { name: "resolution_hours", type: "number" }, { name: "csat", type: "number" },
    { name: "reopened", type: "number" },
  ];
  return { id: "builtin_tickets", name: "Support Tickets", fields, rows, builtin: true };
}

function buildSales(): Dataset {
  const r = rng(29);
  const regions = ["West", "Central", "East", "International"];
  const segments = ["SMB", "Mid-Market", "Enterprise"];
  const products = ["Platform", "Add-on", "Services", "Support Plan"];
  const reps = ["A. Cole", "R. Diaz", "M. Kang", "J. Owens"];
  const rows: Row[] = [];
  for (let i = 1; i <= 220; i++) {
    const seg = pick(r, segments);
    const base = { SMB: 4000, "Mid-Market": 18000, Enterprise: 65000 }[seg]!;
    const month = 1 + Math.floor(r() * 6);
    rows.push({
      deal_id: 9000 + i,
      date: `2025-${String(month).padStart(2, "0")}-15`,
      region: pick(r, regions),
      segment: seg,
      product: pick(r, products),
      rep: pick(r, reps),
      amount: Math.round(base * (0.6 + r() * 0.9)),
      stage: pick(r, ["Won", "Won", "Won", "Lost", "Open"]),
      discount_pct: Math.round(r() * 22),
    });
  }
  const fields: Field[] = [
    { name: "deal_id", type: "number" }, { name: "date", type: "date" },
    { name: "region", type: "string" }, { name: "segment", type: "string" },
    { name: "product", type: "string" }, { name: "rep", type: "string" },
    { name: "amount", type: "number" }, { name: "stage", type: "string" },
    { name: "discount_pct", type: "number" },
  ];
  return { id: "builtin_sales", name: "Sales Pipeline", fields, rows, builtin: true };
}

export const BUILTIN_DATASETS: Dataset[] = [buildTickets(), buildSales()];

// A small CSV string offered as a one-click sample upload in the UI.
export const SAMPLE_CSV = `product,region,month,units,revenue,returns
Sensor Kit,West,2025-01,120,15600,4
Gateway,East,2025-01,64,21760,2
Sensor Kit,East,2025-02,98,12740,7
Edge Unit,West,2025-02,40,19200,1
Gateway,West,2025-03,77,26180,3
Edge Unit,East,2025-03,52,24960,2`;
