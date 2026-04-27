#!/usr/bin/env node
// Render one cover per category (public/books/cover-<id>.png) at
// 1600×2400. Each cover follows the same template so the seven
// volumes read as a series:
//
//   • deep navy background, thin cream double-rule frame
//   • small caps "Biggest Questions Humanity Asks" series title near
//     the top (the line that ties all volumes together)
//   • the category name (Mind / Origins / Cosmos / …) set as the
//     dominant element in a serif display weight
//   • the apeirron logo (icon + wordmark) below as the imprint
//   • the author byline beneath the logo
//
// Usage:
//   node books/generate-cover.mjs           # all categories
//   node books/generate-cover.mjs <id>      # one category by id

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOGO_PATH = path.join(ROOT, "public", "logo.svg");
const CATEGORIES_FILE = path.join(ROOT, "content", "categories.json");
// Covers are written under public/books/ so Next.js serves them at
// /books/cover-<id>.png with the rest of the static bundle. The PDF
// and EPUB downloads stay in books/ and are fetched from GitHub raw
// at view time, so the deployed site does not carry their weight.
const ASSETS_DIR = path.join(ROOT, "public", "books");

const W = 1600;
const H = 2400;
const BG = "#0D2336";          // deep navy
const INK = "#f4f1ea";          // cream ink on the dark ground
const RULE = "#b8a98a";         // muted warm beige for the divider

const SERIES_TITLE = "Biggest Questions Humanity Asks";
const AUTHORS = "Ismael Shakverdiev and Sandro Abashidze";

// The bundled apeirron logo is filled with #222222 / black, which is
// invisible on the dark cover. Rather than maintain a second SVG, we
// rewrite the fill colors in memory to the cream ink before handing
// the buffer to napi-canvas's resvg-backed rasterizer.
function recolorLogoSvg(svgText, color) {
  return svgText
    .replace(/fill="#222222"/g, `fill="${color}"`)
    .replace(/fill="black"/g, `fill="${color}"`)
    .replace(/fill="#000000"/g, `fill="${color}"`)
    .replace(/fill="#000"/g, `fill="${color}"`);
}

async function renderCover(category, logo) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Inset double-frame — classic literary cover stamping.
  const frameMargin = 90;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(
    frameMargin,
    frameMargin,
    W - frameMargin * 2,
    H - frameMargin * 2
  );
  ctx.lineWidth = 1;
  const innerMargin = frameMargin + 14;
  ctx.strokeRect(
    innerMargin,
    innerMargin,
    W - innerMargin * 2,
    H - innerMargin * 2
  );

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Series title — small, letter-spaced caps near the top.
  const seriesY = innerMargin + 220;
  drawSpacedCaps(
    ctx,
    SERIES_TITLE.toUpperCase(),
    W / 2,
    seriesY,
    36,
    `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    500,
    8
  );

  // Thin horizontal rule beneath the series title to anchor it.
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W * 0.34, seriesY + 36);
  ctx.lineTo(W * 0.66, seriesY + 36);
  ctx.stroke();

  // Category name — the dominant typographic element. Set in serif
  // display weight, auto-fit so longer category labels still sit
  // comfortably inside the inner frame.
  const inner = W - innerMargin * 2 - 160;
  const catSize = fitFontSize(
    ctx,
    [category.label],
    `'Iowan Old Style', Georgia, 'Times New Roman', serif`,
    700,
    320,
    inner
  );
  ctx.font = `700 ${catSize}px 'Iowan Old Style', Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = INK;
  ctx.fillText(category.label, W / 2, H * 0.5);

  // Ornamental rule with centered diamond — same glyph as the prior
  // single-volume cover so the visual language is consistent.
  drawOrnament(ctx, W / 2, H * 0.5 + 110, 220, RULE);

  // Logo — the apeirron mark, bottom-centered above the byline.
  const logoTargetW = 460;
  const logoAspect = logo.height / logo.width;
  const logoH = logoTargetW * logoAspect;
  const logoX = (W - logoTargetW) / 2;
  const bylineY = H - innerMargin - 120;
  const logoY = bylineY - logoH - 40;
  ctx.drawImage(logo, logoX, logoY, logoTargetW, logoH);

  // Author byline — set in italic small caps so it reads as imprint
  // metadata rather than competing with the category name.
  ctx.fillStyle = INK;
  ctx.font = `400 italic 30px 'Iowan Old Style', Georgia, 'Times New Roman', serif`;
  ctx.fillText(AUTHORS, W / 2, bylineY);

  const outPath = path.join(ASSETS_DIR, `cover-${category.id}.png`);
  const buf = await canvas.encode("png");
  writeFileSync(outPath, buf);
  console.log(
    `  ${category.id.padEnd(11)} → ${path.relative(ROOT, outPath)}  (${category.label} @ ${catSize}px)`
  );
}

// Draw uppercase text with explicit pixel tracking. Canvas has no
// letter-spacing primitive so each glyph is positioned manually based
// on measured widths.
function drawSpacedCaps(ctx, text, cx, y, size, family, weight, tracking) {
  ctx.font = `${weight} ${size}px ${family}`;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, text.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x + widths[i] / 2, y);
    x += widths[i] + tracking;
  }
}

// Binary-search the largest font size at which every line in `lines`
// fits within `maxWidth`. Falling back to small sizes is acceptable —
// e-readers upscale covers without artifacting.
function fitFontSize(ctx, lines, family, weight, startSize, maxWidth) {
  let lo = 80;
  let hi = startSize;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    ctx.font = `${weight} ${mid}px ${family}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function drawOrnament(ctx, cx, cy, width, color) {
  const half = width / 2;
  const gap = 26;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + half, cy);
  ctx.stroke();

  const d = 9;
  ctx.beginPath();
  ctx.moveTo(cx, cy - d);
  ctx.lineTo(cx + d, cy);
  ctx.lineTo(cx, cy + d);
  ctx.lineTo(cx - d, cy);
  ctx.closePath();
  ctx.fill();
}

async function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  const categories = JSON.parse(readFileSync(CATEGORIES_FILE, "utf-8"));
  const logoSvg = readFileSync(LOGO_PATH, "utf-8");
  const logo = await loadImage(Buffer.from(recolorLogoSvg(logoSvg, INK), "utf-8"));

  // Optional CLI filter — render only one category by id when an
  // argument is given. Useful while iterating on the design.
  const filterId = process.argv[2];
  const targets = filterId
    ? categories.filter((c) => c.id === filterId)
    : categories;
  if (filterId && targets.length === 0) {
    console.error(`unknown category id: ${filterId}`);
    process.exit(1);
  }

  for (const category of targets) {
    await renderCover(category, logo);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
