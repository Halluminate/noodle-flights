# Determinism Checks

These scripts make it easy to catch regressions in the simulator's generated flight data.

They validate the simulator only. Benchmark tasks and verifiers live in the separate `westworld` repository.

## Commands

```bash
pnpm test:determinism
pnpm data:snapshot
pnpm data:compare
```

## What They Do

- `test:determinism`: runs curated queries multiple times and verifies identical output for a fixed seed
- `data:snapshot`: saves a versioned summary of the current generated data distribution
- `data:compare`: compares the current generated data against the latest saved snapshot and exits non-zero if it changed

## Files Created

- `testing/data-snapshots/data-snapshot-YYYY-MM-DD.json`: saved data summaries
- `testing/data-snapshots/change-report-YYYY-MM-DD.txt`: human-readable change reports when `data:compare` finds a difference

## Typical Workflow

1. Run `pnpm test:determinism` before and after changing generation logic.
2. If you intentionally changed the distribution, run `pnpm data:compare` to inspect the delta.
3. Save a new baseline with `pnpm data:snapshot` once the new output is accepted.
4. For hosted deployments, bump `SIM_VERSION` and optionally publish a `DATA_SNAPSHOT_HASH` when you accept a new baseline.

## CI

`pnpm test:determinism` is the minimum recommended check for pull requests. Add `pnpm data:compare` if you want CI to fail whenever the current output differs from the latest committed snapshot.
