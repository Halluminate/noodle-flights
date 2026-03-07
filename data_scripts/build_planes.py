#!/usr/bin/env python3
"""
Build a lean planes.json for the flight generator.

Sources
-------
- OpenFlights planes.dat   (curated list of ~173 passenger aircraft)  :contentReference[oaicite:0]{index=0}
- OpenFlights routes.dat   (equipment field gives 3-letter IATA codes) :contentReference[oaicite:1]{index=1}
- OpenFlights airlines.dat (to ignore defunct airlines if desired)

Output (records-oriented JSON)
-----------------------------
[
  {
    "code"      : "738",
    "icao"      : "B738",
    "name"      : "Boeing 737-800",
    "routeCount": 4219,
    "airlines"  : { "AA": 0.18, "DL": 0.14, "WN": 0.12, ... }
  },
  ...
]
"""

from pathlib import Path
import json
import numpy as np
import pandas as pd

# ────────── paths & params ──────────
PLANES_FILE = Path("data_scripts/planes.dat")
ROUTES_FILE = Path("data_scripts/routes.dat")
RETIRED_AIRLINES_FILE = Path("data_scripts/retired_airlines.csv")
OUT_FILE = Path("data/planes.json")

KEEP_CODES_WITH_MIN_ROUTES = 5      # discard ultra-rare types (set None to keep all)
ROUND_DIGITS = 4                    # decimals for airline weights

# ────────── load raw files ──────────
planes_cols = ["name", "iata", "icao"]
planes = pd.read_csv(
    PLANES_FILE,
    header=None,
    names=planes_cols,
    na_values="\\N"
)

routes_cols = [
    "airline_code", "airline_id",
    "src_iata", "src_id",
    "dst_iata", "dst_id",
    "codeshare", "stops",
    "equipment"
]
routes = pd.read_csv(
    ROUTES_FILE,
    header=None,
    names=routes_cols,
    na_values="\\N"
)

# Load retired airlines
retired_airlines = pd.read_csv(RETIRED_AIRLINES_FILE)
retired_codes = set(retired_airlines["code"].values)

# Filter out routes from retired airlines
routes = routes[~routes["airline_code"].isin(retired_codes)]

# ────────── explode equipment codes ──────────
routes = routes.dropna(subset=["equipment", "airline_code"])
routes["equipment_list"] = routes["equipment"].str.split()
routes_exploded = routes.explode("equipment_list", ignore_index=True)

# ────────── popularity proxy ──────────
popularity = (
    routes_exploded["equipment_list"]
        .value_counts()
        .rename_axis("code")
        .reset_index(name="routeCount")
)

# ────────── airlines per aircraft ──────────
equip_airline_counts = (
    routes_exploded
        .groupby(["equipment_list", "airline_code"])
        .size()
        .reset_index(name="flight_count")
)

def airlines_dict_for(code: str) -> dict:
    subset = equip_airline_counts[equip_airline_counts["equipment_list"] == code]
    if subset.empty:
        return {}
    total = subset["flight_count"].sum()
    subset = subset.sort_values("flight_count", ascending=False)
    return {
        row["airline_code"]: round(row["flight_count"] / total, ROUND_DIGITS)
        for _, row in subset.iterrows()
    }

# ────────── merge & tidy ──────────
planes = planes[planes["iata"].notna()].drop_duplicates(subset="iata")
planes = planes.merge(popularity, how="left", left_on="iata", right_on="code")
planes = planes.drop(columns=["code"])
planes = planes.rename(columns={"iata": "code", "name": "name", "icao": "icao"})
planes["routeCount"] = planes["routeCount"].fillna(0).astype(int)
planes["airlines"] = planes["code"].apply(airlines_dict_for)

# optional trimming of rare types
if KEEP_CODES_WITH_MIN_ROUTES:
    planes = planes[planes["routeCount"] >= KEEP_CODES_WITH_MIN_ROUTES]

# ────────── save ──────────
planes.to_json(OUT_FILE, orient="records", indent=2)
print(f"Saved {len(planes):,} plane types → {OUT_FILE.resolve()}")