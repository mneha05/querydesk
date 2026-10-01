# QueryLab — query processing and optimization benchmark

QueryLab is a reproducible database-performance lab inside QueryDesk. It generates a deterministic orders workload, measures real SQL latency, captures SQLite's optimizer plans with `EXPLAIN QUERY PLAN`, adds targeted indexes, reruns the exact same workload, and records the before/after evidence.

## What it measures

Three scenarios exercise different optimizer behaviors:

| Scenario | Before | Optimization | Expected plan change |
|---|---|---|---|
| filter + sort | full table scan + sort work | composite `(account_id, created_at DESC)` index | `SCAN` → indexed `SEARCH` |
| grouped aggregate | table scan | covering `(account_id, created_at, status, amount_cents)` index | scan → covering-index search |
| join + aggregate | scan-heavy join | region/account + account/time indexes | scans → indexed join lookups |

The benchmark reports **median query latency**, not one lucky run, and writes the raw plans and timings to JSON.

## Run

```bash
python querylab/benchmark.py --rows 250000 --out querylab-results.json
```

Example output shape:

```text
SQLite 3.x · 250,000 orders
filter_sort           ... ms -> ... ms (...x)
  before: SCAN orders | USE TEMP B-TREE FOR ORDER BY
  after:  SEARCH orders USING INDEX idx_orders_account_created (...)
```

Actual timing depends on CPU, filesystem, SQLite version, and runner load. The important invariant tested in CI is the **query-plan transition** from scanning the fact table to using an explicit index.

## Why this is query optimization rather than a dashboard demo

The code works directly with:
- physical indexes,
- composite key ordering,
- covering indexes,
- join access paths,
- cardinality statistics through `ANALYZE`,
- query plans,
- warm-cache median latency,
- optimizer plan validation.

That makes the performance claim inspectable and reproducible instead of saying “optimized SQL” without evidence.
