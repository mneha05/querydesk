def cardinality(values):
    return len(set(value for value in values if value is not None and value.strip()))
