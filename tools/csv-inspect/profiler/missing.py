def missing_count(values):
    return sum(value is None or not value.strip() for value in values)
