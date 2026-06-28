#!/bin/sh
# Validate the rendered nginx config (runs after 20-envsubst, before nginx starts). The entrypoint
# runs with `set -e`, so a bad config aborts the container with a clear error instead of a crash
# loop. This passes even when the api is unreachable: the variable proxy_pass is resolved lazily,
# so `nginx -t` checks syntax only and does not perform DNS resolution.
echo "[25-validate] checking rendered nginx config..."
nginx -t
