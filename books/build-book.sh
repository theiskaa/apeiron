#!/usr/bin/env bash
# Build apeirron-<id>.epub and apeirron-<id>.pdf for every category
# under books/parts/. Each volume is its own self-contained ebook.
#
# Prereqs:
#   • pandoc            (brew install pandoc)
#   • xelatex (MacTeX or BasicTeX is enough for PDFs)
#       brew install --cask mactex-no-gui
#
# Usage:
#   books/build-book.sh                  # both formats, all volumes
#   books/build-book.sh epub             # epub only, all volumes
#   books/build-book.sh pdf              # pdf only, all volumes
#   books/build-book.sh all <id>         # both formats, single volume
#   books/build-book.sh epub <id>        # epub only, single volume
#   books/build-book.sh pdf <id>         # pdf only, single volume

set -euo pipefail

# Always operate from the project root so relative paths resolve the
# same regardless of where the script was invoked from.
cd "$(dirname "$0")/.."

BOOKS_DIR="books"
PARTS_DIR="$BOOKS_DIR/parts"
CSS="$BOOKS_DIR/epub.css"

target="${1:-all}"
single="${2:-}"

if ! command -v pandoc >/dev/null 2>&1; then
  echo "error: pandoc is not installed. Run: brew install pandoc" >&2
  exit 1
fi

if [[ ! -d "$PARTS_DIR" ]]; then
  echo "error: $PARTS_DIR not found. Run: pnpm run book:assemble" >&2
  exit 1
fi

# Discover volume ids by directory name. The order matches the order
# in content/categories.json because generate-book.mjs writes them in
# that order and the directory listing on macOS is alphabetical by
# default — which is fine; nothing depends on a specific build order.
volumes=()
if [[ -n "$single" ]]; then
  if [[ ! -d "$PARTS_DIR/$single" ]]; then
    echo "error: volume not found: $PARTS_DIR/$single" >&2
    exit 1
  fi
  volumes=("$single")
else
  for dir in "$PARTS_DIR"/*/; do
    [[ -d "$dir" ]] || continue
    volumes+=("$(basename "$dir")")
  done
fi

build_epub_volume() {
  local id="$1"
  local src="$PARTS_DIR/$id/book.md"
  local meta="$PARTS_DIR/$id/meta.yaml"
  local out="$BOOKS_DIR/apeirron-$id.epub"
  echo "→ building $out"
  pandoc \
    "$meta" "$src" \
    -o "$out" \
    --from markdown+smart \
    --to epub3 \
    --resource-path="$BOOKS_DIR" \
    --toc \
    --toc-depth=2 \
    --split-level=2 \
    --css="$CSS" \
    --epub-title-page=true
}

build_pdf_volume() {
  local id="$1"
  local src="$PARTS_DIR/$id/book.md"
  local meta="$PARTS_DIR/$id/meta.yaml"
  local cover_tex="$PARTS_DIR/$id/cover.tex"
  local header_tex="$PARTS_DIR/$id/header.tex"
  local out="$BOOKS_DIR/apeirron-$id.pdf"
  if ! command -v xelatex >/dev/null 2>&1; then
    echo "error: xelatex is not installed. Run: brew install --cask mactex-no-gui" >&2
    exit 1
  fi
  # Pandoc's default LaTeX template ignores cover-image metadata, so
  # the cover PNG is injected as a titlepage snippet via
  # --include-before-body. The companion header.tex disables pandoc's
  # auto title page from the preamble so the cover lands on page 1
  # with nothing before it.
  local cover_arg=()
  if [[ -f "$cover_tex" ]]; then
    cover_arg+=("--include-before-body=$cover_tex")
  fi
  if [[ -f "$header_tex" ]]; then
    cover_arg+=("--include-in-header=$header_tex")
  fi
  echo "→ building $out"
  pandoc \
    "$meta" "$src" \
    -o "$out" \
    --from markdown+smart \
    --pdf-engine=xelatex \
    --resource-path="$BOOKS_DIR" \
    --toc \
    --toc-depth=2 \
    --top-level-division=part \
    "${cover_arg[@]}" \
    -V graphics=true \
    -V mainfont="Georgia" \
    -V sansfont="Helvetica Neue" \
    -V monofont="Menlo" \
    -V linkcolor=black \
    -V colorlinks=true
}

case "$target" in
  epub)
    for id in "${volumes[@]}"; do build_epub_volume "$id"; done
    ;;
  pdf)
    for id in "${volumes[@]}"; do build_pdf_volume "$id"; done
    ;;
  all)
    for id in "${volumes[@]}"; do
      build_epub_volume "$id"
      build_pdf_volume "$id"
    done
    ;;
  *)
    echo "usage: $0 [epub|pdf|all] [<volume-id>]" >&2
    exit 2
    ;;
esac

echo "  done"
