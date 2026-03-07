# Attribution

The runtime datasets in this repository are derived from public aviation reference data:

- `data/airports.json` is built from the raw files in `data_scripts/airports.dat` and `data_scripts/routes.dat`.
- `data/airlines.json` is built from the raw files in `data_scripts/airlines.dat` and `data_scripts/routes.dat`, with retired carriers filtered via the checked-in `data_scripts/retired_airlines.csv` artifact.
- `data/planes.json` is built from the raw files in `data_scripts/planes.dat` and `data_scripts/routes.dat`, with retired carriers filtered via the checked-in `data_scripts/retired_airlines.csv` artifact.

The build scripts in [`data_scripts`](data_scripts) document the upstream sources they expect, including OpenFlights data and airport source metadata from OurAirports.

Only the derived JSON files in [`data`](data) are required to run the app locally. The raw `.dat` files and checked-in `retired_airlines.csv` artifact are retained for reproducibility of the published simulator data.
