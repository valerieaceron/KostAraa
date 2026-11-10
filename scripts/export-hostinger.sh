#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
base="${1:-http://localhost:3000}"
out="$root/out"
routes=("" about blog contact login pricing privacy signup terms workspace)

rm -rf "$out"
mkdir -p "$out"
cp -R "$root/dist/client/." "$out/"

for route in "${routes[@]}"; do
  target="$out"
  if [[ -n "$route" ]]; then
    target="$out/$route"
    mkdir -p "$target"
  fi
  curl --fail --silent --show-error "$base/${route}" -o "$target/index.html"
done

# Keep routing identical to the Vite export, including hidden files.
cp "$root/public/.htaccess" "$out/.htaccess"

echo "Hostinger export created at $out"
