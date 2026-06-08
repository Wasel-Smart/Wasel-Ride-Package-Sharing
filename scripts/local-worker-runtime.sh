#!/bin/sh
set -eu

PORT=${PORT:-8080}
export WASEL_RUNTIME_KIND=worker
export WASEL_RUNTIME_SERVICE=wasel-worker
export WASEL_WORKER_NAME=${1:-${WASEL_WORKER_NAME:-worker}}

echo "[wasel-$WASEL_WORKER_NAME] listening on $PORT"
exec busybox nc -lk -p "$PORT" -e /app/local-http-handler.sh
