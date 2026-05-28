<div align="center">

# 📊 QueryDesk

### Self-service BI in the browser — bring your own data, build reports without code, and ask questions in plain English.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)
![Deploy](https://img.shields.io/badge/deploy-Vercel-000?logo=vercel)

*Upload a CSV, drag in a dimension and a measure, and a live chart appears. Pin it to a dashboard that remembers itself. No spreadsheets, no SQL, no setup.*

</div>

---

## ✨ What it does

QueryDesk turns raw tabular data into reports that anyone can build — no query language, no BI license, no analyst required.

- **📁 Bring your own data** — upload a `.csv` or paste it inline. Column types are inferred automatically and you can report on your data seconds later.
- **🧱 No-code report builder** — choose a chart, pick a dimension to group by, a measure to aggregate, an aggregation (sum / avg / count / min / max), and an optional filter. The preview updates live as you change anything.
- **📌 A dashboard that persists** — pin reports to a dashboard that survives a refresh and a return visit, stored locally in your browser.
- **💬 Ask your data** — type a question in plain English (*"average resolution time by priority"*) and QueryDesk configures the report for you — which you can still tweak before pinning.
- **📈 Five visualizations** — bar, line, donut, KPI, and table, each tuned for a different question.

It ships with two realistic built-in datasets so it's useful the moment you open it — and works for anyone with **zero configuration**.

---

## 🧠 Under the hood

The parts worth a closer look:

### A from-scratch CSV parser
No CSV library. `parseCsv` is a hand-written, RFC-4180-style state machine that correctly handles quoted fields, commas and newlines *inside* quotes, and escaped double-quotes (`""`). On top of it, a type-inference pass classifies each column as **number**, **date**, or **string** — which is what lets QueryDesk automatically tell dimensions apart from measures.

### Charts rendered as raw SVG
No Recharts, no Chart.js. Every visualization — including the donut's arc geometry — is drawn directly in SVG with intentional spacing, animation, and a cohesive palette. Small, dependency-free, and fully themeable.

### A tidy analytics engine
`buildReport()` is a pure function: it takes a dataset and a report config and runs **filter → group-by → aggregate → sort → limit**. The same five primitives express everything from a single KPI to a grouped time series — the mental model maps cleanly onto `SELECT … WHERE … GROUP BY … ORDER BY … LIMIT`.

### Real persistence
Uploaded datasets and saved reports are serialized to `localStorage`, so a dashboard you build is still there when you come back — no backend database required.

### Optional AI, done safely
The "Ask your data" feature calls a model server-side through a Next.js route handler, reading the API key from `process.env` only. It's never shipped to the browser or committed to the repo, and the entire app degrades gracefully when no key is present.

---

## 📦 Built-in datasets

| Dataset | Rows | Columns |
|---|---|---|
| **Support Tickets** | 260 | channel, category, priority, region, agent, status, resolution_hours, csat, reopened |
| **Sales Pipeline** | 220 | region, segment, product, rep, amount, stage, discount_pct |

…plus anything you upload.

---

## 🚀 Quickstart

```bash
git clone <your-repo-url> querydesk
cd querydesk
npm install
npm run dev          # → http://localhost:3000
```

Everything works immediately — datasets, uploads, the report builder, the dashboard, and persistence all run with no keys.

---

## ▲ Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New Project** → import the repo → **Deploy**. Next.js is auto-detected; no settings needed.
3. Done — your instance is live.

### Optional: enable "Ask your data"

This is the only feature that needs a key, and it fails gracefully without one.

1. Get a key at [console.anthropic.com](https://console.anthropic.com).
2. In Vercel → **Project → Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = `sk-ant-…`
   - *(optional)* `CLAUDE_MODEL` = `claude-sonnet-4-6`
3. **Redeploy.** The feature is now live.

> To test locally, create a `.env.local` file with `ANTHROPIC_API_KEY=sk-ant-…` — it's gitignored, so it never leaves your machine.

---

## 🏗️ Architecture

```
                upload / paste CSV            built-in datasets
                        │                            │
                        ▼                            ▼
              ┌──────────────────────────────────────────────┐
              │  parseCsv + type inference  (src/lib/types)   │
              └──────────────────────────────────────────────┘
                        │  Dataset { fields, rows }
                        ▼
   report config ─▶ buildReport()  filter → group → aggregate → sort → limit
   (no-code UI)        (src/lib/analytics)              │
        ▲                                               ▼
        │                                   hand-rolled SVG charts
   "Ask your data" ─▶ /api/ai  (NL → report config)  (src/components/Charts)
                                                        │
                                          dashboard ◀── pin & persist (localStorage)
```

---

## 📂 Project structure

```
querydesk/
├── src/
│   ├── lib/
│   │   ├── types.ts        # types + hand-written CSV parser & type inference
│   │   ├── analytics.ts    # the report engine (filter → group → aggregate → sort → limit)
│   │   └── sampleData.ts   # built-in datasets
│   ├── components/
│   │   └── Charts.tsx      # SVG charts: bar · line · donut · KPI · table
│   └── app/
│       ├── page.tsx        # dataset management, report builder, dashboard, upload, ask
│       └── api/ai/route.ts # English → report config (optional)
└── README.md
```

---

## 🛠️ Tech stack

**Next.js 14** (App Router) · **React 18** · **TypeScript** · hand-rolled **SVG** visualizations · `localStorage` persistence · serverless route handlers.
Zero runtime chart or CSV dependencies.

---

## 🗺️ Roadmap

- [ ] Multi-dimension grouping (stacked / grouped bars)
- [ ] Export a dashboard to a shareable JSON file
- [ ] Computed columns (derived measures)
- [ ] Date bucketing (day / week / month) for time series

---

<div align="center">

**QueryDesk** · built by Neha Mahesh

</div>
