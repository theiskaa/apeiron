# The Books

A typeset edition of the [apeirron](../) project. Every node in [`content/nodes/`](../content/nodes) is rendered as a chapter, organized into seven volumes by category. Each volume is its own self-contained EPUB and PDF.

## The volumes

The seven volumes follow the categories defined in [`content/categories.json`](../content/categories.json). Chapter ordering inside each volume is alphabetical by title.

| Volume | Subject | Chapters |
| --- | --- | --- |
| `apeirron-mind` | Consciousness, philosophy of mind, altered states, philosophical traditions | 17 |
| `apeirron-origins` | Pre-history, lost civilizations, ancient mysteries, esoteric tradition | 14 |
| `apeirron-cosmos` | UFOs, UAPs, the Fermi paradox, the Pentagon disclosure arc | 7 |
| `apeirron-power` | Hidden power structures, secret societies, the deep state, dynastic finance | 26 |
| `apeirron-operations` | Documented intelligence operations, assassinations, false flags | 34 |
| `apeirron-modern` | Twenty-first-century cases, contested deaths, contemporary disinformation | 19 |
| `apeirron-reality` | Foundational physics, the Mandela effect, the simulation hypothesis, flat-earth epistemology | 6 |

<a href="./apeirron-mind.pdf"><img src="../public/books/cover-mind.png" alt="Mind" width="110"></a> <a href="./apeirron-origins.pdf"><img src="../public/books/cover-origins.png" alt="Origins" width="110"></a> <a href="./apeirron-cosmos.pdf"><img src="../public/books/cover-cosmos.png" alt="Cosmos" width="110"></a> <a href="./apeirron-power.pdf"><img src="../public/books/cover-power.png" alt="Power" width="110"></a> <a href="./apeirron-operations.pdf"><img src="../public/books/cover-operations.png" alt="Operations" width="110"></a> <a href="./apeirron-modern.pdf"><img src="../public/books/cover-modern.png" alt="Modern" width="110"></a> <a href="./apeirron-reality.pdf"><img src="../public/books/cover-reality.png" alt="Reality" width="110"></a>

## How a volume is structured

Each volume opens with a cover page (the deep-navy series mark for the category) and a table of contents that lists every chapter. Within a chapter, the body is followed by a *Connections* list — the same connections authored in the source node's frontmatter, rendered as cross-references.

Connections to other chapters in the same volume are anchor links that the e-reader navigates to directly. Connections to chapters in another volume render as `***Topic*** *(see <Volume>)*` so a reader can find the chapter in the appropriate book.

In-prose `[[wikilinks]]` are handled the same way: same-volume links become anchors, cross-volume links render as italic plain text. Phantom targets — referenced in the source nodes but never authored as their own node — also render as italic plain text.

## How the volumes are produced

The build is a three-stage pipeline driven from [`package.json`](../package.json):

1. **Cover generation** — [`generate-cover.mjs`](./generate-cover.mjs) draws one cover per category to `books/assets/cover-<id>.png` using `@napi-rs/canvas`. The apeirron logo SVG is recolored cream in memory before rasterizing so it reads on the dark ground.

2. **Markdown assembly** — [`generate-book.mjs`](./generate-book.mjs) reads every node, buckets it by category, alphabetizes within each bucket, rewrites wikilinks against the global node index, and emits a per-volume `book.md`, `meta.yaml`, `cover.tex`, and `header.tex` under `books/parts/<id>/`.

3. **Pandoc** — [`build-book.sh`](./build-book.sh) runs `pandoc` once per volume per format. EPUB uses pandoc's `cover-image` metadata directly. PDF injects the cover via `--include-before-body` (an `eso-pic` shipout overlay) and disables pandoc's auto title page via `--include-in-header`.

## Running the build

```sh
pnpm run books          # both formats, all seven volumes
pnpm run books:epub     # EPUB only
pnpm run books:pdf      # PDF only
```

To rebuild a single volume during iteration, invoke the build script directly:

```sh
bash books/build-book.sh all mind
```

### Prerequisites

- [pandoc](https://pandoc.org) (`brew install pandoc`)
- [xelatex](https://tug.org/mactex/) for PDFs (`brew install --cask mactex-no-gui`, ≈4 GB)

EPUB-only builds need only pandoc.

## Editing the books

The volumes are derived. Every fact in them comes from a markdown file in [`content/nodes/`](../content/nodes). To correct a chapter, fix the source node and rebuild — the assembler will pick up the change automatically. The typeset output is generated; it is not authoritative.

The cover design lives in [`generate-cover.mjs`](./generate-cover.mjs) and the EPUB stylesheet in [`epub.css`](./epub.css). Both are intended to be edited.
