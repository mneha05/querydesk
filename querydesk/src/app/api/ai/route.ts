import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

  let question = "", schema = "";
  try { ({ question, schema } = await req.json()); } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!question?.trim()) return NextResponse.json({ error: "Missing 'question'." }, { status: 400 });

  if (!key) {
    return NextResponse.json({
      keyless: true,
      message:
        "Ask-your-data is dormant: no ANTHROPIC_API_KEY is set. Add one in Vercel → Settings → Environment Variables to turn it on. Uploading data and building reports by hand both work without it.",
    });
  }

  const system = `You configure a self-service BI report from a question about a dataset.
Dataset columns (name:type): ${schema}

Return STRICT JSON only (no markdown):
{ "title": string, "viz": "bar"|"line"|"donut"|"kpi"|"table",
  "dimension": string|null, "measure": string|null,
  "agg": "sum"|"avg"|"count"|"min"|"max",
  "filter": null | { "column": string, "op": "=="|"!="|">"|"<"|">="|"<="|"contains", "value": string },
  "limit": number, "sortDesc": boolean }

Rules:
- "dimension" must be a non-number column (string/date); "measure" must be a number column. Use only columns from the schema.
- Trend over a date column → "line". Share/composition → "donut". A single total/number → "kpi" (set dimension null). Ranking/comparison → "bar". Raw records → "table".
- If agg is "count", measure may be null. Keep limit between 5 and 12 for charts. title is a short human label.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 500, system, messages: [{ role: "user", content: question }] }),
    });
    if (!r.ok) return NextResponse.json({ error: `Anthropic API error (${r.status})`, detail: await r.text() }, { status: 502 });
    const data = await r.json();
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(clean); } catch {
      return NextResponse.json({ error: "Assistant returned non-JSON.", raw: text }, { status: 502 });
    }
    return NextResponse.json(parsed, { headers: { "x-api-version": "v1" } });
  } catch (e: any) {
    return NextResponse.json({ error: "Upstream failure", detail: String(e?.message || e) }, { status: 502 });
  }
}
