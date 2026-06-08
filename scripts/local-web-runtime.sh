#!/bin/sh
set -eu

PORT=${PORT:-8080}
export WASEL_RUNTIME_KIND=web
export WASEL_RUNTIME_SERVICE=wasel-web
export WASEL_WEB_ROOT=${WASEL_WEB_ROOT:-/app/dist}

if [ ! -f "$WASEL_WEB_ROOT/index.html" ]; then
  echo "[wasel-web] missing $WASEL_WEB_ROOT/index.html" >&2
  exit 1
fi

echo "[wasel-web] serving $WASEL_WEB_ROOT on $PORT"
exec busybox nc -lk -p "$PORT" -e /app/local-http-handler.sh
