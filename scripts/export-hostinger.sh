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

cat > "$out/.htaccess" <<'HTACCESS'
Options -Indexes
DirectoryIndex index.html

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  <FilesMatch "\.html$">
    Header always set Cache-Control "no-cache, no-store, must-revalidate"
    Header always set Pragma "no-cache"
    Header always set Expires "0"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ index.html [L]
</IfModule>
HTACCESS

echo "Hostinger export created at $out"
