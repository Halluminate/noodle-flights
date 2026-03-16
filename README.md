---
title: Noodle Flights
emoji: ✈️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 8000
base_path: /web
tags:
  - openenv
  - flight-search
  - web-agent
  - reinforcement-learning
---

# Noodle Flights

Noodle Flights is an open-source flight search simulator used for web-agent evaluation. It packages a deterministic flight generator, airport lookup APIs, and a multi-step booking flow in a standalone Next.js app.

This repository is intentionally published with a fresh git history. It contains the simulator source code and the minimal public metadata surface needed to expose the simulator to external benchmark harnesses. Benchmark tasks, verifiers, and task-generation code belong in the separate `westworld` repository.

It also now contains the initial OpenEnv scaffold for publishing this simulator to the Hugging Face OpenEnv Hub. The repo root is the OpenEnv environment directory so the Python wrapper, Docker build, and the existing Next.js app all share the same build context.

## Features

- One-way, round-trip, and multi-city search flows
- Deterministic generated results for repeatable evaluation
- Local airport, airline, and aircraft datasets bundled with the app
- Public simulator metadata at `GET /api/version`

## Getting Started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

If you want to override the default RNG seed or publish your own simulator metadata, copy [`.env.example`](.env.example) to `.env.local` and edit the values there.

## Scripts

- `pnpm dev`: start the development server
- `pnpm build`: create a production build
- `pnpm start`: run the production build
- `pnpm typecheck`: run TypeScript without emitting files
- `pnpm test:determinism`: verify repeatable flight generation
- `pnpm data:snapshot`: save a deterministic output snapshot for later comparison
- `pnpm data:compare`: compare the current output against the latest saved snapshot

## OpenEnv Scaffold

The repository root now doubles as the OpenEnv environment directory. The initial scaffold adds:

- [`openenv.yaml`](openenv.yaml): OpenEnv manifest
- [`pyproject.toml`](pyproject.toml): Python package metadata for the OpenEnv wrapper
- [`client.py`](client.py): thin `NoodleFlightsEnv` client
- [`server/app.py`](server/app.py): OpenEnv app entrypoint
- [`server/environment.py`](server/environment.py): first-pass environment wrapper over the existing noodle-flights APIs

The current wrapper is intentionally minimal:

- Search tools proxy the existing `/api/airports`, `/api/flights`, and `/api/version` endpoints
- Episode state, itinerary selection, and task completion are managed in the OpenEnv wrapper
- The wrapper currently targets a small deterministic task set suitable for an MVP hub launch

## Simulator Contract

The app exposes a small public metadata contract at `GET /api/version`. The handler lives in [`app/api/version/route.ts`](app/api/version/route.ts).

Example response:

```json
{
  "simVersion": "0.1.0",
  "rngSeed": 1,
  "dataSnapshotHash": null
}
```

- `simVersion`: taken from `SIM_VERSION`, or `package.json` version if unset
- `rngSeed`: the active `GLOBAL_RNG_SEED`
- `dataSnapshotHash`: optional `DATA_SNAPSHOT_HASH` for pinning a committed output baseline

Self-hosted deployments can change these values as needed. The official hosted deployment should treat them as a compatibility surface: changes to the seed or observable simulator output should be intentional and versioned.

## Repository Boundaries

- Keep simulator code in this repository.
- Keep benchmark tasks, verifiers, and task-generation logic in `westworld`.
- If `westworld` needs simulator state, expose the smallest stable contract necessary from this repo rather than copying task code here.

## Project Structure

- [`app`](app): Next.js routes and API handlers
- [`components`](components): UI primitives and search flows
- [`lib`](lib): flight generation, transforms, and shared utilities
- [`data`](data): bundled runtime datasets
- [`data_scripts`](data_scripts): raw inputs, checked-in artifacts, and rebuild scripts for derived datasets
- [`testing`](testing): determinism and snapshot checks

## Data And Attribution

Data provenance notes for the bundled airport, airline, and aircraft datasets are in [ATTRIBUTION.md](ATTRIBUTION.md).

## Notes

- The original private repository history is not included here.
- This project is inspired by common flight-search interfaces but is not affiliated with Google or any airline.
