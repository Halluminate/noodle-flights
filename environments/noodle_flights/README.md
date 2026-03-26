# noodle-flights

## Overview

- Environment ID: `noodle-flights`
- Contract: Prime `OpenEnvEnv` over an MCP-style OpenEnv server
- Simulator: deterministic flight-search and booking environment backed by Noodle Flights

This package generates a bundled OpenEnv project under `proj/` from the repo root so it can be built with Prime's environment workflow and then published with `prime env push`.

## Task

The current Prime package exposes the two deterministic MVP tasks from the simulator wrapper:

1. One-way cheapest flight from `SFO` to `JFK` on `2030-06-12`
2. Round-trip cheapest itinerary from `LAX` to `BOS` on `2030-09-10` returning `2030-09-17`

The agent must use the provided tools to search flights, select the cheapest valid itinerary, and finish with `complete_booking`.

## Quickstart

```bash
./scripts/sync_prime_environment.sh

cd environments/noodle_flights
uv pip install -e .
cd ../..

prime env build noodle-flights -p environments
prime env push noodle-flights -p environments --visibility PUBLIC
```

## Environment Arguments

- `num_train_examples`: number of seeded rollout prompts to generate for the train split
- `num_eval_examples`: number of seeded rollout prompts to generate for the eval split
- `seed`: starting seed for reset-generated prompts
- `max_turns`: maximum reasoning/tool turns per rollout
- `startup_timeout_seconds`: sandbox startup timeout for the bundled OpenEnv project

## Generated Project

The bundled OpenEnv project under `proj/` is generated from the repo root with:

```bash
./scripts/sync_prime_environment.sh
```

`proj/`, `dist/`, and `.prime/` are local build artifacts and are git-ignored on purpose.

The intended workflow is:

1. Edit the simulator in the repo root.
2. Regenerate `proj/` with `./scripts/sync_prime_environment.sh`.
3. Run `prime env build noodle-flights -p environments`.
4. Run `prime env push noodle-flights -p environments --visibility PUBLIC`.
