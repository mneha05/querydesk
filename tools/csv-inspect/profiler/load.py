import csv


def load(path):
    with open(path, newline='', encoding='utf-8-sig') as stream:
        reader = csv.DictReader(stream)
        names = reader.fieldnames
        if not names or not all(names):
            raise ValueError('CSV needs named columns')
        if len(set(names)) != len(names):
            raise ValueError('duplicate headers')
        return names, list(reader)
