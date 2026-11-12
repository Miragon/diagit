#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../../.." && pwd)"
container_dir="$repo_root/packages/extension/e2e/container"
image=diagit-browser-checks

podman build --quiet --tag "$image" --file "$container_dir/Containerfile" "$container_dir" >/dev/null

podman run --rm --init \
  --volume "$repo_root":/work \
  --volume /work/node_modules \
  --volume /work/packages/extension/node_modules \
  --volume /work/packages/bpmn-diff/node_modules \
  --volume diagit-browser-checks-npm-cache:/root/.npm \
  --env WDIO_BROWSERS --env WDIO_SCREENSHOTS \
  "$image" \
  bash -c 'npm ci --no-audit --no-fund &&
    npm run e2e:build -w @diagit/extension &&
    xvfb-run -a -s "-screen 0 1920x1200x24" npm run test:e2e -w @diagit/extension'
