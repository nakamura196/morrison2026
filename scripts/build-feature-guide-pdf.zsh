#!/usr/bin/env zsh
#
# 利用ガイド「機能のご紹介」の PDF を作る。
#
# 前提: pandoc と weasyprint (brew install pandoc weasyprint)
# 使い方: zsh scripts/build-feature-guide-pdf.zsh
#
# docs/feature-guide.md → docs/モリソンパンフレット統合データベース_機能のご紹介.pdf
# 体裁は docs/_pdf-style-feature.css (共通テーマ docs/_pdf-style.css を継承)。
#
# 2026-09-11: 初版を作ったときの手順が残っておらず、可視化ページの節を足すときに
# 組み直すことになった。次に同じことをしないよう、手順をここに残す。
set -euo pipefail

ROOT=${0:A:h:h}
SRC="$ROOT/docs/feature-guide.md"
OUT="$ROOT/docs/モリソンパンフレット統合データベース_機能のご紹介.pdf"
CSS="$ROOT/docs/_pdf-style-feature.css"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pandoc "$SRC" --standalone --from=markdown --to=html5 --metadata=lang:ja --output="$TMP/guide.html"
weasyprint "$TMP/guide.html" "$OUT" --stylesheet "$CSS" --base-url "$ROOT/docs/"

echo "作成: $OUT"
