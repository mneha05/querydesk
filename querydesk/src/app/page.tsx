"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Dataset, type Report, type Viz, type Agg,
  datasetFromCsv, dimensions, measures,
} from "@/lib/types";
import { buildReport, defaultReport } from "@/lib/analytics";
import { BUILTIN_DATASETS, SAMPLE_CSV } from "@/lib/sampleData";
import { ChartView } from "@/components/Charts";

const LS_DATASETS = "qd_user_datasets_v1";
const LS_REPORTS = "qd_reports_v1";
const VIZ: { id: Viz; label: string; glyph: string }[] = [
  { id: "bar", label: "Bar", glyph: "▭" }, { id: "line", label: "Line", glyph: "╱" },
  { id: "donut", label: "Donut", glyph: "◓" }, { id: "kpi", label: "KPI", glyph: "#" },
  { id: "table", label: "Table", glyph: "▦" },
];

export default function QueryDesk() {
  const [userDatasets, setUserDatasets] = useState<Dataset[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeId, setActiveId] = useState(BUILTIN_DATASETS[0].id);
  const [draft, setDraft] = useState<Report>(() => defaultReport(BUILTIN_DATASETS[0]));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const datasets = useMemo(() => [...BUILTIN_DATASETS, ...userDatasets], [userDatasets]);
  const dsById = useMemo(() => new Map(datasets.map((d) => [d.id, d])), [datasets]);
  const active = dsById.get(activeId);

  // load persisted state
  useEffect(() => {
    try {
      const ud = JSON.parse(localStorage.getItem(LS_DATASETS) || "[]");
      const rp = JSON.parse(localStorage.getItem(LS_REPORTS) || "[]");
      if (Array.isArray(ud)) setUserDatasets(ud);
      if (Array.isArray(rp)) setReports(rp);
    } catch {/* ignore */}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(LS_DATASETS, JSON.stringify(userDatasets)); }, [userDatasets, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(LS_REPORTS, JSON.stringify(reports)); }, [reports, loaded]);

  function switchDataset(id: string) {
    setActiveId(id);
    const ds = dsById.get(id);
    if (ds) setDraft(defaultReport(ds));
  }
  const patch = (p: Partial<Report>) => setDraft((d) => ({ ...d, ...p }));

  function addToDashboard() {
    if (!active) return;
    setReports((r) => [{ ...draft, id: "r_" + Math.random().toString(36).slice(2, 9), datasetId: active.id }, ...r]);
  }
  function removeReport(id: string) { setReports((r) => r.filter((x) => x.id !== id)); }

  function addDataset(name: string, csv: string) {
    const ds = datasetFromCsv(name || "My dataset", csv);
    setUserDatasets((u) => [...u, ds]);
    setActiveId(ds.id);
    setDraft(defaultReport(ds));
    setUploadOpen(false);
  }

  const dims = active ? dimensions(active) : [];
  const meas = active ? measures(active) : [];
  const out = active ? buildReport(active, draft) : null;

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px 80px" }}>
      {/* TOP BAR */}
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 0 18px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--coral)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, boxShadow: "0 6px 16px rgba(239,93,76,0.35)" }}>Q</div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, lineHeight: 0.95 }}>QueryDesk</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--muted)", letterSpacing: 0.5 }}>self-service analytics & reporting</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <DatasetMenu datasets={datasets} activeId={activeId} onPick={switchDataset} />
        <button className="btn" onClick={() => setUploadOpen(true)}>↑ Add data</button>
        <button className="btn btn-ink" onClick={() => setAskOpen(true)}>✦ Ask your data</button>
      </header>

      {active && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span className="pill">{active.rows.length} rows</span>
          <span className="pill">{dims.length} dimensions</span>
          <span className="pill">{meas.length} measures</span>
          {active.builtin ? <span className="pill">built-in</span> : <span className="pill" style={{ background: "#fdeee4", color: "#c2492f" }}>your upload</span>}
        </div>
      )}

      {/* BUILDER */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, marginBottom: 36 }}>
        <div className="card" style={{ padding: 18, alignSelf: "start" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 800 }}>Build a report</h3>

          <Label>Chart type</Label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {VIZ.map((v) => (
              <button key={v.id} onClick={() => patch({ viz: v.id })}
                style={{ flex: "1 0 auto", cursor: "pointer", padding: "8px 6px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: "1px solid " + (draft.viz === v.id ? "var(--coral)" : "var(--line)"),
                  background: draft.viz === v.id ? "#fdeee4" : "#fff", color: draft.viz === v.id ? "#c2492f" : "var(--ink)" }}>
                <span style={{ marginRight: 4 }}>{v.glyph}</span>{v.label}
              </button>
            ))}
          </div>

          <Label>Report title</Label>
          <input className="field" style={{ marginBottom: 14 }} value={draft.title} onChange={(e) => patch({ title: e.target.value })} />

          {draft.viz !== "kpi" && draft.viz !== "table" && (
            <>
              <Label>Group by (dimension)</Label>
              <select className="field" style={{ marginBottom: 14 }} value={draft.dimension || ""} onChange={(e) => patch({ dimension: e.target.value })}>
                {dims.map((d) => <option key={d}>{d}</option>)}
              </select>
            </>
          )}

          {draft.viz !== "table" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <Label>Measure</Label>
                <select className="field" value={draft.measure || ""} onChange={(e) => patch({ measure: e.target.value })} disabled={draft.agg === "count"}>
                  {meas.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ width: 104 }}>
                <Label>Aggregate</Label>
                <select className="field" value={draft.agg} onChange={(e) => patch({ agg: e.target.value as Agg })}>
                  {(["sum", "avg", "count", "min", "max"] as Agg[]).map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
          )}

          {draft.viz !== "kpi" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <Label>{draft.viz === "table" ? "Max rows" : "Top N"}</Label>
                <input className="field" type="number" value={draft.limit} onChange={(e) => patch({ limit: Number(e.target.value) })} />
              </div>
              {draft.viz !== "table" && (
                <div style={{ flex: 1 }}>
                  <Label>Sort</Label>
                  <select className="field" value={draft.sortDesc ? "desc" : "asc"} onChange={(e) => patch({ sortDesc: e.target.value === "desc" })}>
                    <option value="desc">high → low</option><option value="asc">low → high</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <Label>Filter (optional)</Label>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <select className="field" style={{ flex: 1 }} value={draft.filter?.column || ""} onChange={(e) => patch({ filter: e.target.value ? { column: e.target.value, op: draft.filter?.op || "==", value: draft.filter?.value || "" } : null })}>
              <option value="">none</option>
              {active?.fields.map((f) => <option key={f.name}>{f.name}</option>)}
            </select>
            {draft.filter && (
              <>
                <select className="field" style={{ width: 64 }} value={draft.filter.op} onChange={(e) => patch({ filter: { ...draft.filter!, op: e.target.value as any } })}>
                  {["==", "!=", ">", "<", ">=", "<=", "contains"].map((o) => <option key={o}>{o}</option>)}
                </select>
                <input className="field" style={{ width: 76 }} placeholder="value" value={draft.filter.value} onChange={(e) => patch({ filter: { ...draft.filter!, value: e.target.value } })} />
              </>
            )}
          </div>

          <button className="btn btn-coral" style={{ width: "100%" }} onClick={addToDashboard}>＋ Add to dashboard</button>
        </div>

        {/* LIVE PREVIEW */}
        <div className="card floatin" style={{ padding: 22, minHeight: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{draft.title || "Live preview"}</h3>
            <span className="pill">{draft.viz}{draft.viz !== "table" && draft.viz !== "kpi" ? ` · ${draft.agg}` : ""}</span>
          </div>
          {out && <ChartView out={out} viz={draft.viz} accent={0} />}
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {draft.viz === "kpi" ? `${draft.agg}(${draft.measure}) over ${active?.name}`
              : draft.viz === "table" ? `rows from ${active?.name}`
              : `${draft.agg}(${draft.measure}) by ${draft.dimension} · ${active?.name}`}
          </div>
        </div>
      </div>

      {/* DASHBOARD */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard</h2>
        <span style={{ color: "var(--muted)", fontSize: 13.5 }}>{reports.length} saved report{reports.length === 1 ? "" : "s"} · auto-saved to this browser</span>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          Build a report above and hit <b style={{ color: "var(--coral)" }}>Add to dashboard</b> — saved reports pin here and persist across visits.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
          {reports.map((r, i) => {
            const ds = dsById.get(r.datasetId);
            const o = ds ? buildReport(ds, r) : null;
            return (
              <div key={r.id} className="card floatin" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, lineHeight: 1.05 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{ds?.name || "missing dataset"}</div>
                  </div>
                  <button onClick={() => removeReport(r.id)} title="remove"
                    style={{ cursor: "pointer", border: "none", background: "transparent", color: "var(--muted)", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
                {o ? <ChartView out={o} viz={r.viz} accent={i + 1} /> : <div style={{ color: "var(--muted)" }}>Dataset no longer available.</div>}
              </div>
            );
          })}
        </div>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onAdd={addDataset} />}
      {askOpen && active && <AskModal dataset={active} onClose={() => setAskOpen(false)} onApply={(r) => { setDraft(r); setAskOpen(false); }} />}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{children}</div>;
}

function DatasetMenu({ datasets, activeId, onPick }: { datasets: Dataset[]; activeId: string; onPick: (id: string) => void }) {
  return (
    <select className="field" style={{ width: "auto", minWidth: 190, fontWeight: 600 }} value={activeId} onChange={(e) => onPick(e.target.value)}>
      {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}{d.builtin ? "" : " ⬆"}</option>)}
    </select>
  );
}

function UploadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, csv: string) => void }) {
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [err, setErr] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!name) setName(f.name.replace(/\.csv$/i, ""));
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.readAsText(f);
  }
  function submit() {
    try {
      if (!csv.trim()) { setErr("Paste some CSV or choose a file first."); return; }
      onAdd(name, csv);
    } catch (e: any) { setErr(e.message || String(e)); }
  }

  return (
    <Modal onClose={onClose} title="Add your own data">
      <p style={{ marginTop: 0, color: "#6e6056", fontSize: 13.5 }}>Upload a CSV or paste it below. QueryDesk infers column types automatically and you can immediately build reports on it.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input className="field" placeholder="Dataset name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
        <label className="btn" style={{ cursor: "pointer" }}>
          Choose file<input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
        </label>
        <button className="btn" onClick={() => { setCsv(SAMPLE_CSV); if (!name) setName("Sample sales"); }}>Use sample</button>
      </div>
      <textarea className="field" style={{ minHeight: 150, fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
        placeholder={"product,region,revenue\nWidget,West,1200\n..."} value={csv} onChange={(e) => setCsv(e.target.value)} />
      {err && <div style={{ color: "#c2492f", fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-coral" onClick={submit}>Add dataset</button>
      </div>
    </Modal>
  );
}

function AskModal({ dataset, onClose, onApply }: { dataset: Dataset; onClose: () => void; onApply: (r: Report) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const examples = dataset.id === "builtin_tickets"
    ? ["Average CSAT by channel", "Ticket volume by category", "Avg resolution hours by priority"]
    : ["Total revenue by region", "Average deal size by segment", "Win count by rep"];

  async function go(question: string) {
    if (!question.trim()) return;
    setBusy(true); setMsg("");
    try {
      const schema = dataset.fields.map((f) => `${f.name}:${f.type}`).join(", ");
      const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, schema, datasetId: dataset.id }) }).then((x) => x.json());
      if (r.keyless) { setMsg(r.message); return; }
      if (r.error) { setMsg(r.error); return; }
      const rep: Report = {
        id: "r_" + Math.random().toString(36).slice(2, 9), datasetId: dataset.id,
        title: r.title || question, viz: r.viz || "bar",
        dimension: r.dimension, measure: r.measure, agg: r.agg || "sum",
        filter: r.filter || null, limit: r.limit || 8, sortDesc: r.sortDesc ?? true,
      };
      onApply(rep);
    } catch (e: any) { setMsg(String(e)); } finally { setBusy(false); }
  }

  return (
    <Modal onClose={onClose} title="✦ Ask your data">
      <p style={{ marginTop: 0, color: "#6e6056", fontSize: 13.5 }}>Ask a question about <b>{dataset.name}</b> in plain English. QueryDesk turns it into a report you can tweak and pin.</p>
      <textarea className="field" style={{ minHeight: 80, resize: "vertical", marginBottom: 10 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. average resolution time by priority" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {examples.map((ex) => <button key={ex} className="pill" style={{ cursor: "pointer" }} onClick={() => { setQ(ex); go(ex); }}>{ex}</button>)}
      </div>
      {msg && <div style={{ color: "#c2492f", fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>{msg}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-ink" onClick={() => go(q)} disabled={busy || !q.trim()}>{busy ? "Thinking…" : "Generate report"}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,33,28,0.4)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="card floatin" style={{ width: 560, maxWidth: "100%", padding: 26 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
