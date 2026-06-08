#!/bin/sh

request_line=""
IFS= read -r request_line || exit 0

while IFS= read -r header; do
  [ "$header" = "$(printf '\r')" ] || [ -z "$header" ] && break
done

method=$(printf '%s\n' "$request_line" | cut -d ' ' -f 1)
request_path=$(printf '%s\n' "$request_line" | cut -d ' ' -f 2)
request_path=${request_path%%\?*}

send_response() {
  status="$1"
  content_type="$2"
  body="$3"
  length=$(printf '%s' "$body" | wc -c | tr -d ' ')
  printf 'HTTP/1.1 %s\r\n' "$status"
  printf 'Content-Type: %s\r\n' "$content_type"
  printf 'Content-Length: %s\r\n' "$length"
  printf 'Connection: close\r\n\r\n'
  [ "$method" = "HEAD" ] || printf '%s' "$body"
}

send_file() {
  file_path="$1"
  content_type="$2"
  length=$(wc -c < "$file_path" | tr -d ' ')
  printf 'HTTP/1.1 200 OK\r\n'
  printf 'Content-Type: %s\r\n' "$content_type"
  printf 'Content-Length: %s\r\n' "$length"
  printf 'Connection: close\r\n'
  if [ "$(basename "$file_path")" = "index.html" ]; then
    printf 'Cache-Control: no-store\r\n'
  else
    printf 'Cache-Control: public, max-age=31536000, immutable\r\n'
  fi
  printf '\r\n'
  [ "$method" = "HEAD" ] || cat "$file_path"
}

content_type_for() {
  case "$1" in
    *.html) printf 'text/html; charset=utf-8' ;;
    *.css) printf 'text/css; charset=utf-8' ;;
    *.js|*.mjs) printf 'application/javascript; charset=utf-8' ;;
    *.json|*.webmanifest) printf 'application/json; charset=utf-8' ;;
    *.svg) printf 'image/svg+xml' ;;
    *.png) printf 'image/png' ;;
    *.jpg|*.jpeg) printf 'image/jpeg' ;;
    *.ico) printf 'image/x-icon' ;;
    *.txt) printf 'text/plain; charset=utf-8' ;;
    *.xml) printf 'application/xml; charset=utf-8' ;;
    *) printf 'application/octet-stream' ;;
  esac
}

if [ "$request_path" = "/health" ] || [ "$request_path" = "/ready" ]; then
  service=${WASEL_RUNTIME_SERVICE:-wasel-runtime}
  worker=${WASEL_WORKER_NAME:-}
  if [ -n "$worker" ]; then
    send_response "200 OK" "application/json" "{\"status\":\"ok\",\"service\":\"$service\",\"worker\":\"$worker\"}"
  else
    send_response "200 OK" "application/json" "{\"status\":\"ok\",\"service\":\"$service\"}"
  fi
  exit 0
fi

if [ "${WASEL_RUNTIME_KIND:-worker}" = "web" ]; then
  web_root=${WASEL_WEB_ROOT:-/app/dist}
  clean_path=${request_path#/}
  case "$clean_path" in
    ""|*..*) clean_path="index.html" ;;
  esac

  file_path="$web_root/$clean_path"
  if [ -d "$file_path" ]; then
    file_path="$file_path/index.html"
  fi
  if [ ! -f "$file_path" ]; then
    file_path="$web_root/index.html"
  fi

  if [ -f "$file_path" ]; then
    send_file "$file_path" "$(content_type_for "$file_path")"
  else
    send_response "404 Not Found" "text/plain; charset=utf-8" "Not found"
  fi
else
  worker=${WASEL_WORKER_NAME:-worker}
  send_response "200 OK" "text/plain; charset=utf-8" "Wasel $worker runtime\n"
fi
