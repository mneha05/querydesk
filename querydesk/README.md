# QueryDesk — Self-Service BI & Reporting

> Bring your own data, build reports **without writing code**, pin them to a dashboard
> that persists, and ask questions about your data in plain English.

QueryDesk is the tool a non-technical "customer" reaches for when they need answers
fast: pick a dataset (built-in, or **upload your own CSV**), choose a chart, drag in a
dimension and a measure, and a live report renders instantly. Save it to a dashboard
that survives refreshes. Or just type a question and let the assistant configure the
report for you.

Deploys to Vercel in ~2 minutes and works for anyone with **zero configuration**.

---

## Why this maps to the role

Built deliberately against the Enterprise BI & Integration intern posting:

| What the posting asks for | Where it lives in QueryDesk |
|---|---|
| **Self-service analytics** | The entire product — anyone builds reports with no code |
| **Create/edit reports & visualizations** | Bar, line, donut, KPI, and table reports, configured live |
| **Data analytics & reporting solutions** | Group-by + aggregate engine (sum/avg/count/min/max) with filters |
| **Provide customer support** | The built-in dataset is **support tickets** — CSAT, resolution time, channel, priority, reopen rate |
| **Data & data pipelines** | CSV ingestion with automatic type inference (a real parser) |
| **Databases / query languages (SQL concepts)** | Reports map directly to SELECT … GROUP BY … WHERE … ORDER BY … LIMIT |
| **AI and AI agents** | "Ask your data" → natural language becomes a report configuration |
| **HTML / CSS** | The whole UI; **charts are hand-written SVG** (no chart library) |
| **Version control** | Git + GitHub (this repo) |
| **Agile** | Shipped in slices: engine → builder → dashboard → upload → AI |

---

## What makes it genuinely impressive (not a template)

- **Bring-your-own-data.** Upload a CSV or paste one. A **from-scratch CSV parser**
  (RFC-4180-ish: quoted fields, embedded commas/newlines, escaped quotes) ingests it,
  and column **types are inferred** (number / date / string) to auto-classify
  dimensions vs. measures.
- **Charts are hand-rolled SVG.** Bar, line, donut (with real arc math), KPI, and
  table — no Recharts, no Chart.js. Every pixel is intentional.
- **Real persistence.** Saved reports and uploaded datasets are stored in the browser
  (`localStorage`), so a built dashboard is still there when you come back.
- **Customer-support framing.** The default dataset models a support desk, so the demo
  reports answer real ops questions: CSAT by channel, resolution time by priority,
  ticket volume by category, reopen rate by agent.
- **Ask-your-data.** Plain-English questions become report configs (dimension, measure,
  aggregation, chart type) you can still tweak before pinning.

---

## Built-in datasets

- **Support Tickets** (260 rows): channel, category, priority, region, agent, status,
  resolution_hours, csat, reopened
- **Sales Pipeline** (220 rows): region, segment, product, rep, amount, stage, discount

…plus anything you upload.

---

## Run locally

```bash
git clone <your-repo-url> querydesk
cd querydesk
npm install
npm run dev        # http://localhost:3000
```

Fully functional immediately — datasets, uploads, report building, the dashboard, and
persistence all work with no keys.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. vercel.com → **Add New Project** → import the repo → **Deploy**. No settings needed.
3. Done — live.

### (Optional) Turn on "Ask your data"

The natural-language feature is the only thing that needs a key, and it **fails
gracefully** without one.

1. Get a key at **console.anthropic.com** (add a few dollars of credit under Billing).
2. Vercel → your project → **Settings → Environment Variables**:
   - `ANTHROPIC_API_KEY` = `sk-ant-…`
   - *(optional)* `CLAUDE_MODEL` = `claude-sonnet-4-6`
3. **Redeploy** (Deployments → ⋯ → Redeploy).

> The key is read only server-side from `process.env` — never shipped to the browser,
> never committed. To test locally, create `.env.local` with
> `ANTHROPIC_API_KEY=sk-ant-…` (it's gitignored).

---

## Project layout

```
querydesk/
├── src/
│   ├── lib/
│   │   ├── types.ts        # types + the hand-written CSV parser & type inference
│   │   ├── analytics.ts    # the report engine: filter → group → aggregate → sort → limit
│   │   └── sampleData.ts   # built-in support-ticket & sales datasets
│   ├── components/
│   │   └── Charts.tsx      # hand-rolled SVG charts (bar/line/donut/kpi/table)
│   ├── app/
│   │   ├── page.tsx        # the app: dataset mgmt, builder, dashboard, upload, ask
│   │   └── api/ai/         # English → report config (Anthropic, optional)
│   └── ...
└── README.md
```

---

Built by Neha Mahesh · Computer Science, Purdue University
