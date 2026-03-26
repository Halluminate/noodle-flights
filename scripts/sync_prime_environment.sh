#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="$ROOT_DIR/environments/noodle_flights"
PROJ_DIR="$ENV_DIR/proj"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/noodle-flights-prime-proj.XXXXXX")"

cleanup() {
  rm -rf "$STAGING_DIR"
}

trap cleanup EXIT

copy_into_proj() {
  local rel="$1"
  rsync -a "$ROOT_DIR/$rel" "$STAGING_DIR/"
}

FILES=(
  ".dockerignore"
  ".env.example"
  ".npmrc"
  "__init__.py"
  "client.py"
  "components.json"
  "next-env.d.ts"
  "next.config.mjs"
  "openenv.yaml"
  "package.json"
  "pnpm-lock.yaml"
  "postcss.config.mjs"
  "pyproject.toml"
  "tailwind.config.ts"
  "tsconfig.json"
  "uv.lock"
)

DIRS=(
  "app"
  "components"
  "data"
  "hooks"
  "lib"
  "providers"
  "public"
  "server"
  "styles"
)

for path in "${FILES[@]}"; do
  copy_into_proj "$path"
done

for path in "${DIRS[@]}"; do
  copy_into_proj "$path"
done

cat >"$STAGING_DIR/openenv.yaml" <<'EOF'
name: noodle_flights
description: OpenEnv wrapper around the Noodle Flights deterministic flight search simulator.
version: 0.1.0
python_class: noodle_flights:NoodleFlightsEnv
app: server.prime_app:app
port: 8000
EOF

perl -0pi -e 's/server = "noodle_flights\.server\.app:main"/server = "noodle_flights.server.prime_app:main"/' \
  "$STAGING_DIR/pyproject.toml"

perl -0pi -e 's/noodle_flights\.server\.app:app/noodle_flights.server.prime_app:app/' \
  "$STAGING_DIR/server/Dockerfile"

cat >"$STAGING_DIR/server/prime_app.py" <<'EOF'
from openenv.core import CallToolAction, CallToolObservation
from openenv.core.env_server.http_server import create_app

from .environment import NoodleFlightsEnvironment

app = create_app(
    NoodleFlightsEnvironment,
    CallToolAction,
    CallToolObservation,
    env_name="noodle_flights",
)


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
EOF

rm -rf "$PROJ_DIR"
mv "$STAGING_DIR" "$PROJ_DIR"
trap - EXIT

echo "Synced Prime bundled project into $PROJ_DIR"
