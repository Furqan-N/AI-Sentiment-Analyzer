"""
Generate a large-scale CSV dataset for throughput testing.

Downloads the IMDB movie reviews dataset (50k reviews, ~130MB of text) from
HuggingFace and writes it as a CSV with a 'text' column. You can also
generate synthetic multiples to hit GB-scale file sizes.

Usage:
    python generate_large_dataset.py                    # IMDB 25k test split (~60MB)
    python generate_large_dataset.py --rows 100000      # 100k rows (cycles IMDB data)
    python generate_large_dataset.py --rows 500000      # 500k rows (~1.2 GB)
"""

import argparse
import csv
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Generate large sentiment test CSVs")
    parser.add_argument(
        "--rows", type=int, default=25000,
        help="Number of rows to generate (default: 25000)",
    )
    parser.add_argument(
        "--output", type=str, default="large_test_data.csv",
        help="Output CSV file path (default: large_test_data.csv)",
    )
    args = parser.parse_args()

    try:
        from datasets import load_dataset
    except ImportError:
        print("Error: 'datasets' package required. Run: pip install datasets")
        sys.exit(1)

    print(f"Downloading IMDB dataset from HuggingFace...")
    ds = load_dataset("stanfordnlp/imdb", split="test")
    source_texts = [row["text"] for row in ds if row["text"].strip()]
    print(f"  Loaded {len(source_texts)} source reviews from IMDB test split.\n")

    output_path = Path(args.output)
    target_rows = args.rows

    print(f"Generating {target_rows:,} rows -> {output_path}")

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text"])

        for i in range(target_rows):
            text = source_texts[i % len(source_texts)]
            writer.writerow([text])

            if (i + 1) % 10000 == 0:
                print(f"  [{i + 1:,} / {target_rows:,}] written")

    file_size = output_path.stat().st_size
    if file_size >= 1024 ** 3:
        size_str = f"{file_size / (1024 ** 3):.2f} GB"
    else:
        size_str = f"{file_size / (1024 ** 2):.1f} MB"

    print(f"\nDone: {output_path} ({target_rows:,} rows, {size_str})")
    print(f"\nTo process with the CLI:")
    print(f"  python cli.py batch {output_path} --engine vader")
    print(f"  python cli.py batch {output_path} --engine ensemble")


if __name__ == "__main__":
    main()
