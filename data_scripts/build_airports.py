#!/usr/bin/env python3
"""
Build a lean airports.json for the flight generator.

Sources
-------
- OpenFlights airports.dat  (last update 2019-10 but topology stable)
- OpenFlights routes.dat

Output (records-oriented JSON)
------------------------------
[
  {
    "iata"      : "SFO",
    "city"      : "San Francisco",
    "country"   : "United States",
    "lat"       : 37.6213,
    "lon"       : -122.3790,
    "tz"        : "America/Los_Angeles",
    "routeCount": 2438,
    "hubScore"  : 5
  },
  ...
]
"""

from pathlib import Path
import numpy as np
import pandas as pd

# ────────── paths & params ──────────
AIRPORTS_FILE = Path("data_scripts/airports.dat")
ROUTES_FILE = Path("data_scripts/routes.dat")
RETIRED_AIRLINES_FILE = Path("data_scripts/retired_airlines.csv")
OUT_FILE = Path("data/airports.json")

TOP_N_AIRPORTS = None      # e.g. 500 to trim; None = keep everybody
# Refined percentile-based bins for better airport hierarchy
# Top 2% = 1 (Mega Hubs), Next 4% = 2 (Major Hubs), Next 15% = 3 (Regional Hubs), 
# Next 29% = 4 (Secondary), Bottom 50% = 5 (Local)
HUB_PERCENTILES = [98, 94, 79, 50, 0]  # Descending percentiles for hubScore 1-5

# ────────── load raw files ──────────
airport_cols = [
    "id", "name", "city", "country", "iata", "icao",
    "lat", "lon", "alt_ft", "timezone_hrs",
    "dst", "tz_database", "type", "source"
]
airports = pd.read_csv(
    AIRPORTS_FILE,
    header=None,
    names=airport_cols,
    na_values="\\N"
)

route_cols = [
    "airline_code", "airline_id",
    "src_iata", "src_id",
    "dst_iata", "dst_id",
    "codeshare", "stops", "equipment"
]
routes = pd.read_csv(
    ROUTES_FILE,
    header=None,
    names=route_cols,
    na_values="\\N"
)

# Load retired airlines
retired_airlines = pd.read_csv(RETIRED_AIRLINES_FILE)
retired_codes = set(retired_airlines["code"].values)

# Filter out routes from retired airlines
routes = routes[~routes["airline_code"].isin(retired_codes)]

# ────────── clean & filter ──────────
airports = (
    airports
        .loc[(airports["type"] == "airport") &
             airports["iata"].notna() &
             (airports["iata"].str.len() == 3)]
        .drop_duplicates(subset="iata", keep="first")
)

# ────────── popularity / hub proxy ──────────
popularity = (
    pd.concat([
        routes["src_iata"],
        routes["dst_iata"]
    ], ignore_index=True)
      .dropna()
      .value_counts()
      .rename_axis("iata")
      .reset_index(name="routeCount")
)

airports = airports.merge(popularity, on="iata", how="inner")

# ────────── airlines per airport ──────────
# Get all routes with their airline codes and airport IATA codes
src_routes = routes[["airline_code", "src_iata"]].rename(columns={"src_iata": "iata"})
dst_routes = routes[["airline_code", "dst_iata"]].rename(columns={"dst_iata": "iata"})
all_airport_airlines = pd.concat([src_routes, dst_routes], ignore_index=True).dropna()

# Count flights per airline per airport
airline_counts = (
    all_airport_airlines
    .groupby(["iata", "airline_code"])
    .size()
    .reset_index(name="flight_count")
)

# Create dict of airlines with relative frequencies for each airport
def get_airlines_for_airport(iata_code):
    airport_airlines = airline_counts[airline_counts["iata"] == iata_code]
    if airport_airlines.empty:
        return {}
    
    # Calculate total flights for this airport
    total_flights = airport_airlines["flight_count"].sum()
    
    # Sort by flight count descending to maintain order
    airport_airlines = airport_airlines.sort_values("flight_count", ascending=False)
    
    # Create dictionary with airline codes as keys and relative frequencies as values
    airlines_dict = {}
    for _, row in airport_airlines.iterrows():
        relative_freq = row["flight_count"] / total_flights
        airlines_dict[row["airline_code"]] = round(relative_freq, 4)  # Round to 4 decimal places
    
    return airlines_dict

# Add airlines field to airports dataframe
airports["airlines"] = airports["iata"].apply(get_airlines_for_airport)

# ────────── hubScore 1-5 (1=biggest hubs, 5=smallest) ──────────
# Calculate percentile thresholds based on route counts
percentile_thresholds = np.percentile(airports["routeCount"], HUB_PERCENTILES)

# Assign hubScore based on percentiles (bigger airports get lower scores)
def assign_hub_score(route_count):
    if route_count >= percentile_thresholds[0]:    # Top 2% (Mega Hubs)
        return 1
    elif route_count >= percentile_thresholds[1]:  # Next 4% (94th-98th percentile - Major Hubs)
        return 2
    elif route_count >= percentile_thresholds[2]:  # Next 15% (79th-94th percentile - Regional Hubs)
        return 3
    elif route_count >= percentile_thresholds[3]:  # Next 29% (50th-79th percentile - Secondary)
        return 4
    else:                                          # Bottom 50% (0-50th percentile - Local)
        return 5

airports["hubScore"] = airports["routeCount"].apply(assign_hub_score)

airports = airports.drop(columns=["alt_ft", "timezone_hrs",
                                  "dst", "icao", "id", "source", "type"])

# rename tz_database → tz
airports = airports.rename(columns={"tz_database": "tz"})

# ────────── optional trimming ──────────
if TOP_N_AIRPORTS:
    airports = airports.sort_values("routeCount", ascending=False).head(TOP_N_AIRPORTS)

# ────────── save ──────────
airports.to_json(OUT_FILE, orient="records", indent=2)
print(f"Saved {len(airports):,} airports → {OUT_FILE.resolve()}")