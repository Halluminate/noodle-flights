"""Build the enriched airlines.json file

This script ingests OpenFlights `airlines.dat` and `routes.dat` files and
produces `data/airlines.json` with the following shape per airline:

{
  "code": "AA",                   # IATA 2-letter code
  "name": "American Airlines",
  "country": "United States",
  "route_count": 2734,             # total routes in routes.dat
  "importance": 0.97,             # route_count / max(route_count)
  "hubs": [                       # top hubs with per-hub route counts
    {"code": "DFW", "routes": 432},
    {"code": "CLT", "routes": 301},
    ...
  ]
}

Rationale
---------
1. `route_count` gives an objective popularity signal that later code can use to
   bias flight generation toward larger carriers.
2. `importance` is the normalised weight ∈ [0,1] for quick probabilistic use.
3. The hubs list is adaptive:
      <  200 routes → top 3 hubs
      < 1000 routes → top 5 hubs
      otherwise     → top 10 hubs
   For each hub we store the underlying route count so downstream code can pick
   hubs with probability proportional to traffic.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

# ── configuration ──────────────────────────────────────────────────────────────
AIRLINES_FILE = Path("data_scripts/airlines.dat")
ROUTES_FILE = Path("data_scripts/routes.dat")
RETIRED_AIRLINES_FILE = Path("data_scripts/retired_airlines.csv")
OUT_FILE = Path("data/airlines.json")

# ── 1. load raw data ───────────────────────────────────────────────────────────
cols = [
    "id",
    "name",
    "alias",
    "iata",
    "icao",
    "callsign",
    "country",
    "active",
]
airlines = pd.read_csv(AIRLINES_FILE, header=None, names=cols, na_values="\\N")

routes = pd.read_csv(
    ROUTES_FILE,
    header=None,
    names=[
        "airline",
        "airline_id",
        "src_iata",
        "src_id",
        "dst_iata",
        "dst_id",
        "codeshare",
        "stops",
        "equip",
    ],
    na_values="\\N",
)

# Load retired airlines
retired_airlines = pd.read_csv(RETIRED_AIRLINES_FILE)
retired_codes = set(retired_airlines["code"].values)

# ── 2. retain only active commercial airlines with 2-letter IATA codes ─────────
airlines = airlines[
    airlines["iata"].notna()
    & (airlines["iata"].str.len() == 2)
    & (airlines["active"] == "Y")
    & (~airlines["iata"].isin(retired_codes))  # Exclude retired airlines
].copy()

# ── 3. compute per-airline route totals & importance ───────────────────────────
route_counts = routes.groupby("airline").size().rename("route_count")

airlines = airlines.merge(
    route_counts, left_on="iata", right_index=True, how="left"
)

airlines["route_count"] = airlines["route_count"].fillna(0).astype(int)
max_routes = airlines["route_count"].max() or 1  # avoid division by zero
airlines["importance"] = airlines["route_count"] / max_routes

# ── 4. gather hub statistics ───────────────────────────────────────────────────
hub_stats = (
    routes.groupby(["airline", "src_iata"]).size().rename("hub_routes").reset_index()
)


def top_hubs(iata_code: str, route_count: int) -> list[dict[str, int]]:
    """Return a list of hub dictionaries sorted by traffic.

    The list length adapts to airline size to avoid capping mega-carriers
    artificially while keeping small carriers concise.
    """
    if route_count < 200:
        limit = 3
    elif route_count < 1000:
        limit = 5
    else:
        limit = 10

    sub = hub_stats[hub_stats["airline"] == iata_code].nlargest(limit, "hub_routes")
    return (
        sub.rename(columns={"src_iata": "code", "hub_routes": "routes"})[
            ["code", "routes"]
        ].to_dict("records")
    )


airlines["hubs"] = airlines.apply(
    lambda row: top_hubs(row["iata"], row["route_count"]), axis=1
)

# ── 5. trim & save ─────────────────────────────────────────────────────────────
out = airlines[["iata", "name", "country", "route_count", "importance", "hubs"]]
out = out.rename(columns={"iata": "code"})

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
out.to_json(OUT_FILE, orient="records", indent=2)
print(f"Saved {len(out):,} airlines -> {OUT_FILE.resolve()}")