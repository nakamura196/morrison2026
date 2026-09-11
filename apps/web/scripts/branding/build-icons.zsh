#!/usr/bin/env zsh
# Regenerate the site's OG share-card raster assets from the source SVG.
#
# Favicons (favicon.ico / icon.png / apple-icon.png) are NOT generated here:
# they are the shared 東洋文庫 logo set, copied verbatim from the sibling apps
# (kanseki / taishozo / u-renja) so every Toyo Bunko site shows the same icon.
#
# Prerequisites (macOS): brew install librsvg imagemagick
#   - rsvg-convert : SVG -> PNG (honours system fonts via fontconfig; the OG
#                    card needs BIZ UDMincho installed for the Japanese text)
#   - magick       : image size report at the end
#
# Sources : apps/web/assets/branding/opengraph-image.svg
#           (+ toyobunko-logo.png, the 512px copy of the shared logo it embeds)
# Outputs : apps/web/src/app/{opengraph-image.png,twitter-image.png}
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

print "→ opengraph-image.png (1200×630, social share)"
rsvg-convert -w 1200 -h 630 "$SRC/opengraph-image.svg" -o "$OUT/opengraph-image.png"

print "→ twitter-image.png (1200×630, same card)"
cp "$OUT/opengraph-image.png" "$OUT/twitter-image.png"

print "\n✓ done. Generated in $OUT:"
for f in opengraph-image.png twitter-image.png; do
  printf '  %-22s %s\n' "$f" "$(magick identify -format '%wx%h %m' "$OUT/$f" 2>/dev/null | head -1 || stat -f%z "$OUT/$f")"
done
