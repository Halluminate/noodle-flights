# Contributing

## Development Setup

```bash
pnpm install
pnpm dev
```

## Before Opening a PR

- Run `pnpm build`
- Run `pnpm typecheck`
- Run `pnpm test:determinism`

## Guidelines

- Keep flight generation deterministic unless a change explicitly updates the determinism expectations.
- If you intentionally change observable simulator output, update the published simulator contract for hosted deployments (`SIM_VERSION` and, if used, `DATA_SNAPSHOT_HASH`).
- Keep `westworld` task, verifier, and orchestration code out of this repository. This repository should only contain simulator code and the minimal public interfaces required to expose it.
- Do not commit secrets, `.env` files, or private credentials.
- Prefer small, reviewable pull requests with clear behavior changes.
