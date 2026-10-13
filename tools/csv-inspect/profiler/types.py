from datetime import datetime
import math


def infer_type(values):
    values = [value.strip() for value in values if value is not None and value.strip()]
    if not values:
        return "empty"
    try:
        if all(math.isfinite(float(value)) for value in values):
            return "number"
    except ValueError:
        pass
    try:
        for value in values:
            datetime.fromisoformat(value)
        return "datetime"
    except ValueError:
        return "text"
