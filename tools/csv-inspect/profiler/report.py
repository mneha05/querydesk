from .types import infer_type
from .missing import missing_count
from .cardinality import cardinality
from .frequency import most_common


def profile(columns, rows, top=5):
    result = []
    for column in columns:
        values = [row.get(column) for row in rows]
        result.append({"name": column, "type": infer_type(values), "missing": missing_count(values),
                       "unique": cardinality(values), "top_values": most_common(values, top)})
    return {"rows": len(rows), "columns": result}
