#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
import sqlite3
import statistics
import tempfile
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

@dataclass
class Measurement:
    scenario: str
    rows: int
    before_plan: list[str]
    after_plan: list[str]
    before_ms: float
    after_ms: float
    speedup: float
    result_rows: int

def explain(conn: sqlite3.Connection, sql: str, params: tuple) -> list[str]:
    return [row[3] for row in conn.execute("EXPLAIN QUERY PLAN " + sql, params)]

def median_ms(conn: sqlite3.Connection, sql: str, params: tuple, repeats: int = 11) -> tuple[float, int]:
    # Warm once so page-cache effects are represented consistently in both cases.
    rows = list(conn.execute(sql, params))
    samples = []
    for _ in range(repeats):
        start = time.perf_counter_ns()
        rows = list(conn.execute(sql, params))
        elapsed = time.perf_counter_ns() - start
        samples.append(elapsed / 1_000_000)
    return statistics.median(samples), len(rows)

def batched(items: list[tuple], size: int = 5000) -> Iterable[list[tuple]]:
    for i in range(0, len(items), size):
        yield items[i:i + size]

def build_db(path: Path, rows: int, seed: int = 2026) -> sqlite3.Connection:
    rng = random.Random(seed)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=OFF")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA automatic_index=OFF")
    conn.executescript(
        """
        CREATE TABLE accounts (
          id INTEGER PRIMARY KEY,
          region TEXT NOT NULL,
          plan TEXT NOT NULL
        );

        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          account_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          sku TEXT NOT NULL
        );
        """
    )

    regions = ("us-east", "us-west", "eu-west", "ap-south")
    plans = ("free", "team", "business", "enterprise")
    accounts = [(i, regions[i % len(regions)], plans[(i // 3) % len(plans)]) for i in range(1, 5001)]
    conn.executemany("INSERT INTO accounts VALUES (?, ?, ?)", accounts)

    statuses = ("pending", "paid", "shipped", "refunded")
    base_ts = 1_700_000_000
    generated: list[tuple] = []
    hot_account = 4242
    for i in range(1, rows + 1):
        # Make account 4242 common enough to give the indexed query meaningful output.
        account_id = hot_account if i % 41 == 0 else rng.randint(1, 5000)
        created_at = base_ts + rng.randint(0, 365 * 24 * 3600)
        status = statuses[rng.randrange(len(statuses))]
        amount = rng.randint(500, 250_000)
        sku = f"SKU-{rng.randint(1, 2500):04d}"
        generated.append((i, account_id, created_at, status, amount, sku))
    for chunk in batched(generated):
        conn.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)", chunk)
    conn.commit()
    return conn

def benchmark_filter_sort(conn: sqlite3.Connection, rows: int) -> Measurement:
    sql = """
      SELECT id, created_at, status, amount_cents
      FROM orders
      WHERE account_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
      LIMIT 100
    """
    params = (4242, 1_700_000_000, 1_731_536_000)
    before_plan = explain(conn, sql, params)
    before_ms, result_rows = median_ms(conn, sql, params)

    conn.execute("CREATE INDEX idx_orders_account_created ON orders(account_id, created_at DESC)")
    conn.execute("ANALYZE")
    after_plan = explain(conn, sql, params)
    after_ms, _ = median_ms(conn, sql, params)

    return Measurement(
        scenario="filter_sort",
        rows=rows,
        before_plan=before_plan,
        after_plan=after_plan,
        before_ms=before_ms,
        after_ms=after_ms,
        speedup=before_ms / after_ms if after_ms else float("inf"),
        result_rows=result_rows,
    )

def benchmark_covering_aggregate(conn: sqlite3.Connection, rows: int) -> Measurement:
    # Start from a clean index state for this scenario.
    conn.execute("DROP INDEX IF EXISTS idx_orders_account_created")
    conn.execute("ANALYZE")
    sql = """
      SELECT status, COUNT(*) AS orders, SUM(amount_cents) AS revenue_cents
      FROM orders
      WHERE account_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY status
      ORDER BY revenue_cents DESC
    """
    params = (4242, 1_700_000_000, 1_731_536_000)
    before_plan = explain(conn, sql, params)
    before_ms, result_rows = median_ms(conn, sql, params)

    conn.execute(
        "CREATE INDEX idx_orders_covering ON orders(account_id, created_at, status, amount_cents)"
    )
    conn.execute("ANALYZE")
    after_plan = explain(conn, sql, params)
    after_ms, _ = median_ms(conn, sql, params)

    return Measurement(
        scenario="covering_aggregate",
        rows=rows,
        before_plan=before_plan,
        after_plan=after_plan,
        before_ms=before_ms,
        after_ms=after_ms,
        speedup=before_ms / after_ms if after_ms else float("inf"),
        result_rows=result_rows,
    )

def benchmark_join(conn: sqlite3.Connection, rows: int) -> Measurement:
    conn.execute("DROP INDEX IF EXISTS idx_orders_covering")
    conn.execute("ANALYZE")
    sql = """
      SELECT a.plan, COUNT(*) AS orders, SUM(o.amount_cents) AS revenue_cents
      FROM accounts a
      JOIN orders o ON o.account_id = a.id
      WHERE a.region = ? AND o.created_at >= ?
      GROUP BY a.plan
      ORDER BY revenue_cents DESC
    """
    params = ("us-east", 1_720_000_000)
    before_plan = explain(conn, sql, params)
    before_ms, result_rows = median_ms(conn, sql, params, repeats=7)

    conn.execute("CREATE INDEX idx_accounts_region_id ON accounts(region, id)")
    conn.execute("CREATE INDEX idx_orders_account_time_amount ON orders(account_id, created_at, amount_cents)")
    conn.execute("ANALYZE")
    after_plan = explain(conn, sql, params)
    after_ms, _ = median_ms(conn, sql, params, repeats=7)

    return Measurement(
        scenario="join",
        rows=rows,
        before_plan=before_plan,
        after_plan=after_plan,
        before_ms=before_ms,
        after_ms=after_ms,
        speedup=before_ms / after_ms if after_ms else float("inf"),
        result_rows=result_rows,
    )

def assert_plan_improved(m: Measurement) -> None:
    before = " | ".join(m.before_plan).upper()
    after = " | ".join(m.after_plan).upper()
    if "SCAN ORDERS" not in before and "SCAN O" not in before:
        raise AssertionError(f"{m.scenario}: expected a table scan before optimization: {m.before_plan}")
    if "SEARCH" not in after and "COVERING INDEX" not in after:
        raise AssertionError(f"{m.scenario}: expected indexed search after optimization: {m.after_plan}")

def main() -> None:
    parser = argparse.ArgumentParser(description="Reproducible SQLite query-plan benchmark")
    parser.add_argument("--rows", type=int, default=250_000)
    parser.add_argument("--out", type=Path, default=Path("querylab-results.json"))
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as temp:
        db = Path(temp) / "querylab.db"

        measurements = []
        for scenario in (benchmark_filter_sort, benchmark_covering_aggregate, benchmark_join):
            conn = build_db(db, args.rows)
            try:
                measurement = scenario(conn, args.rows)
                assert_plan_improved(measurement)
                measurements.append(measurement)
            finally:
                conn.close()
                db.unlink(missing_ok=True)

    payload = {
        "engine": sqlite3.sqlite_version,
        "rows": args.rows,
        "measurements": [asdict(m) for m in measurements],
    }
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"SQLite {payload['engine']} · {args.rows:,} orders")
    for m in measurements:
        print(
            f"{m.scenario:20s} {m.before_ms:9.3f} ms -> {m.after_ms:9.3f} ms "
            f"({m.speedup:6.2f}x)  rows={m.result_rows}"
        )
        print("  before:", " | ".join(m.before_plan))
        print("  after: ", " | ".join(m.after_plan))
    print(f"wrote {args.out}")

if __name__ == "__main__":
    main()
