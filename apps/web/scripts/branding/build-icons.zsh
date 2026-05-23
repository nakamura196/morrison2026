#!/usr/bin/env zsh
# Regenerate the site's favicon / OG raster assets from the source SVGs.
#
# Prerequisites (macOS): brew install librsvg imagemagick
#   - rsvg-convert : SVG -> PNG (honours system fonts via fontconfig; the OG
#                    card needs BIZ UDMincho installed for the Japanese text)
#   - magick       : PNG packing for the multi-size .ico
#
# Sources : apps/web/assets/branding/{icon,apple-icon,opengraph-image}.svg
# Outputs : apps/web/src/app/{favicon.ico,icon.svg,apple-icon.png,
#                              opengraph-image.png,twitter-image.png}
# Next.js picks these up via file-based metadata conventions.
#
# Usage   : apps/web/scripts/branding/build-icons.zsh   (run from anywhere)

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
WEB_DIR="${SCRIPT_DIR:h:h}"          # apps/web
SRC="$WEB_DIR/assets/branding"
OUT="$WEB_DIR/src/app"

for bin in rsvg-convert magick; do
  command -v "$bin" >/dev/null 2>&1 || { print -u2 "error: '$bin' not found (brew install librsvg imagemagick)"; exit 1; }
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

print "→ icon.svg (SVG favicon for modern browsers)"
cp "$SRC/icon.svg" "$OUT/icon.svg"

print "→ favicon.ico (16/32/48, legacy + universal)"
for s in 16 32 48; do
  rsvg-convert -w $s -h $s "$SRC/icon.svg" -o "$tmp/favicon-$s.png"
done
magick "$tmp/favicon-16.png" "$tmp/favicon-32.png" "$tmp/favicon-48.png" "$OUT/favicon.ico"

print "→ apple-icon.png (180×180, iOS home screen)"
rsvg-convert -w 180 -h 180 "$SRC/apple-icon.svg" -o "$OUT/apple-icon.png"

print "→ opengraph-image.png (1200×630, social share)"
rsvg-convert -w 1200 -h 630 "$SRC/opengraph-image.svg" -o "$OUT/opengraph-image.png"

print "→ twitter-image.png (1200×630, same card)"
cp "$OUT/opengraph-image.png" "$OUT/twitter-image.png"

print "\n✓ done. Generated in $OUT:"
for f in favicon.ico icon.svg apple-icon.png opengraph-image.png twitter-image.png; do
  printf '  %-22s %s\n' "$f" "$(magick identify -format '%wx%h %m' "$OUT/$f" 2>/dev/null | head -1 || stat -f%z "$OUT/$f")"
done
