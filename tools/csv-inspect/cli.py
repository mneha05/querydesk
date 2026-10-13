import argparse
import json
from profiler.load import load
from profiler.report import profile


def main():
    parser = argparse.ArgumentParser(description="Profile any CSV file locally")
    parser.add_argument("csv")
    parser.add_argument("--top", type=int, default=5)
    arguments = parser.parse_args()
    if arguments.top < 0:
        parser.error("--top must be non-negative")
    try:
        columns, rows = load(arguments.csv)
        print(json.dumps(profile(columns, rows, arguments.top), indent=2))
    except (OSError, ValueError) as error:
        parser.exit(2, f"csv-inspect: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
