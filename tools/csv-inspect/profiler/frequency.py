from collections import Counter


def most_common(values, limit=5):
    if limit < 0:
        raise ValueError("limit must be non-negative")
    frequencies = Counter(value for value in values if value is not None and value.strip())
    return [{"value": value, "count": count} for value, count in frequencies.most_common(limit)]
