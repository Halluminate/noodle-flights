#!/usr/bin/env python3

import json
import os
import sys
from pathlib import Path

# ────────── paths & params ──────────
AIRLINES_FILE = Path("data/airlines.json")
LOGOS_DIR = Path("public/airline_logos")


def load_airlines():
    """Load the airlines data from airlines.json."""
    with open(AIRLINES_FILE, "r") as f:
        airlines = json.load(f)
    return {airline["code"] for airline in airlines}


def clean_logos(logos_dir, airline_codes):
    """
    Remove logo files for airlines that don't exist in airlines.json.
    Preserves multi.png.
    """
    preserved = 0
    removed = 0
    preserved_files = []
    removed_files = []

    logos_dir = os.path.abspath(logos_dir)

    for filename in os.listdir(logos_dir):
        if filename == "multi.png":
            preserved += 1
            preserved_files.append(filename)
            continue

        if not filename.endswith(".png"):
            continue

        airline_code = filename[:-4]
        if airline_code in airline_codes:
            preserved += 1
            preserved_files.append(filename)
        else:
            file_path = os.path.join(logos_dir, filename)
            try:
                os.remove(file_path)
                removed += 1
                removed_files.append(filename)
            except OSError as e:
                print(f"Error removing {filename}: {e}", file=sys.stderr)

    return {
        "preserved": preserved,
        "removed": removed,
        "preserved_files": sorted(preserved_files),
        "removed_files": sorted(removed_files),
    }


def main():
    airline_codes = load_airlines()
    results = clean_logos(LOGOS_DIR, airline_codes)

    print("\nLogo Cleanup Results:")
    print(f"Preserved: {results['preserved']} logos")
    print(f"Removed: {results['removed']} logos")

    print("\nPreserved files:")
    for file in results["preserved_files"]:
        print(f"  {file}")

    print("\nRemoved files:")
    for file in results["removed_files"]:
        print(f"  {file}")


if __name__ == "__main__":
    main()
