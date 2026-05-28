"use client";

import type { ReportOutput } from "@/lib/analytics";
import type { Row } from "@/lib/types";

const PALETTE = ["#ef5d4c", "#5b8c7e", "#e0a93f", "#5a7bb5", "#b8678f", "#7a9e5c", "#d97b53", "#6c8ca8"];

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function ChartView({ out, viz, accent = 0 }: { out: ReportOutput; viz: string; accent?: number }) {
  if (out.empty) return <div style={{ color: "#9b8e84", fontSize: 14, padding: 30, textAlign: "center" }}>No data for this configuration.</div>;
  if (out.kind === "kpi") return <Kpi value={out.value!} accent={accent} />;
  if (out.kind === "table") return <Table columns={out.columns!} rows={out.rows!} />;
  if (viz === "donut") return <Donut data={out.series!} />;
  if (viz === "line") return <Line data={out.series!} accent={accent} />;
  return <Bar data={out.series!} accent={accent} />;
}

function Kpi({ value, accent }: { value: number; accent: number }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "26px 10px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 800, lineHeight: 1, color: PALETTE[accent % PALETTE.length] }} className="tnum">
        {fmt(value)}
      </div>
    </div>
  );
}

function Bar({ data, accent }: { data: { label: string; value: number }[]; accent: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 460, gap = 10, bh = 30;
  const H = data.length * (bh + gap);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {data.map((d, i) => {
        const bw = (d.value / max) * (W - 150);
        const y = i * (bh + gap);
        return (
          <g key={i}>
            <text x={0} y={y + bh / 2 + 4} fontFamily="var(--font-body)" fontSize={12.5} fill="#5b4f47" style={{ fontWeight: 600 }}>
              {d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label}
            </text>
            <rect x={108} y={y} width={Math.max(bw, 2)} height={bh} rx={5} fill={PALETTE[accent % PALETTE.length]} opacity={0.9}>
              <animate attributeName="width" from="0" to={Math.max(bw, 2)} dur="0.5s" fill="freeze" />
            </rect>
            <text x={108 + Math.max(bw, 2) + 8} y={y + bh / 2 + 4} fontFamily="var(--font-mono)" fontSize={12} fill="#2b211c" className="tnum">{fmt(d.value)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Line({ data, accent }: { data: { label: string; value: number }[]; accent: number }) {
  const W = 480, H = 220, pad = 34;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`);
  const area = `M ${x(0)},${H - pad} L ${pts.join(" L ")} L ${x(data.length - 1)},${H - pad} Z`;
  const col = PALETTE[accent % PALETTE.length];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={pad} x2={W - pad} y1={pad + t * (H - pad * 2)} y2={pad + t * (H - pad * 2)} stroke="#e8ddd2" strokeWidth={1} />
      ))}
      <path d={area} fill={col} opacity={0.12} />
      <polyline points={pts.join(" ")} fill="none" stroke={col} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={3.5} fill="#fff" stroke={col} strokeWidth={2} />
          <text x={x(i)} y={H - pad + 16} textAnchor="middle" fontFamily="var(--font-body)" fontSize={10.5} fill="#9b8e84">
            {d.label.length > 8 ? d.label.slice(0, 7) + "…" : d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 78, r = 46, cx = 95, cy = 95;
  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const frac = d.value / total;
    const a0 = angle, a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, a: number) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0);
    return { d: `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`, color: PALETTE[i % PALETTE.length], label: d.label, value: d.value, frac };
  });
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", padding: "8px 0" }}>
      <svg viewBox="0 0 190 190" width={170} height={170} style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
        <text x={95} y={92} textAnchor="middle" fontFamily="var(--font-display)" fontSize={26} fontWeight={800} fill="#2b211c" className="tnum">{fmt(total)}</text>
        <text x={95} y={108} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="#9b8e84" letterSpacing={1}>TOTAL</text>
      </svg>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: a.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "#5b4f47", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "#9b8e84" }}>{Math.round(a.frac * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: Row[] }) {
  return (
    <div style={{ overflow: "auto", maxHeight: 300, borderRadius: 10, border: "1px solid #ece1d5" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
        <thead>
          <tr>{columns.map((c) => <th key={c} style={{ position: "sticky", top: 0, background: "#f3ebe1", color: "#7a6a5d", padding: "8px 11px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? "#fbf6ef" : "#fff" }}>
              {columns.map((c) => <td key={c} className="tnum" style={{ padding: "6px 11px", borderTop: "1px solid #f0e7db", whiteSpace: "nowrap", color: "#2b211c" }}>{r[c] === null ? "—" : typeof r[c] === "number" ? (r[c] as number).toLocaleString("en-US") : String(r[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
