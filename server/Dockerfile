ARG BASE_IMAGE=ghcr.io/meta-pytorch/openenv-base:latest
FROM ${BASE_IMAGE}

WORKDIR /app/env

COPY . /app/env

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

RUN pnpm install --frozen-lockfile
RUN pnpm build

RUN uv sync --frozen || uv sync

ENV NOODLE_FLIGHTS_APP_URL=http://127.0.0.1:3000
ENV ENABLE_WEB_INTERFACE=true

EXPOSE 8000

CMD ["/bin/bash", "-lc", "HOSTNAME=0.0.0.0 PORT=3000 pnpm start & uv run python -m uvicorn noodle_flights.server.app:app --host 0.0.0.0 --port 8000"]
