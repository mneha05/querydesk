# QueryLab measured results

These numbers are from GitHub Actions run **36797421899** on the hosted Ubuntu runner using **SQLite 3.45.1** and **120,000 orders**. They are CI measurements, not production database claims.

| Scenario | Before | After | Speedup | Plan change |
|---|---:|---:|---:|---|
| filter + sort | 5.742 ms | 0.113 ms | **50.89×** | table scan + temp sort → composite-index search |
| covering aggregate | 6.417 ms | 1.058 ms | **6.07×** | table scan → covering-index search |
| join + aggregate | 13.089 ms | 5.087 ms | **2.57×** | scan-heavy join → indexed account lookup + covering order lookup |

## Exact optimizer evidence

### Filter + sort

Before:

```text
SCAN orders
USE TEMP B-TREE FOR ORDER BY
```

After:

```text
SEARCH orders USING INDEX idx_orders_account_created
(account_id=? AND created_at>? AND created_at<?)
```

### Covering aggregate

Before:

```text
SCAN orders
USE TEMP B-TREE FOR GROUP BY
USE TEMP B-TREE FOR ORDER BY
```

After:

```text
SEARCH orders USING COVERING INDEX idx_orders_covering
(account_id=? AND created_at>? AND created_at<?)
USE TEMP B-TREE FOR GROUP BY
USE TEMP B-TREE FOR ORDER BY
```

### Join + aggregate

Before:

```text
SCAN o
BLOOM FILTER ON a (id=?)
SEARCH a USING INTEGER PRIMARY KEY (rowid=?)
```

After:

```text
SEARCH a USING INDEX idx_accounts_region_id (region=?)
SEARCH o USING COVERING INDEX idx_orders_account_time_amount
(account_id=? AND created_at>?)
```

The benchmark uses median warm-cache latency and asserts the optimized plans actually switch to explicit indexed search paths.
