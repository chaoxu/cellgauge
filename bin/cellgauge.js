#!/usr/bin/env node

const BAR_STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"];
const BAR_VARIANTS = ["l", "m", "r", "s"];

const BAR1_LEVELS = 16;
const BAR1_STRIDE = BAR1_LEVELS + 1;
const BAR1_BASE = 0x10fa20;
const BAR1_STYLE_BLOCK = BAR_VARIANTS.length * BAR1_STRIDE;

const BAR_LEVELS = 8;
const BAR_STRIDE = BAR_LEVELS + 1;
const BAR2_BASE = 0x10f000;
const BAR2_STYLE_BLOCK = BAR_VARIANTS.length * BAR_STRIDE * BAR_STRIDE;
const BAR3_BASE = 0x100000;
const BAR3_STYLE_BLOCK = BAR_VARIANTS.length * BAR_STRIDE * BAR_STRIDE * BAR_STRIDE;

const DONUT_LEVELS = 32;
const DONUT_STATES = DONUT_LEVELS + 1;
const DONUT_STYLE_IDS = ["hb", "fb", "hn", "fn"];
const DONUT2_BASE = 0x10fe20;
const DONUT2_STYLE_BLOCK = 2 * DONUT_STATES;

function clampPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function pctToUnits(pct, widthCells, levels) {
  return Math.round((clampPct(pct) / 100) * widthCells * levels);
}

function laneLevel(units, idx, levels) {
  const r = units - idx * levels;
  if (r <= 0) return 0;
  if (r >= levels) return levels;
  return r;
}

function isNoBorderBarStyle(styleId) {
  return styleId.endsWith("n");
}

function buildBarStyle(gapped, full, border) {
  return `${gapped ? "g" : "n"}${full ? "f" : "h"}${border ? "b" : "n"}`;
}

function buildDonutStyle(full, border) {
  return `${full ? "f" : "h"}${border ? "b" : "n"}`;
}

function variantForIndex(i, width) {
  if (width === 1) return "s";
  if (i === 0) return "l";
  if (i === width - 1) return "r";
  return "m";
}

function bar1Codepoint(styleId, variant, level) {
  const styleIdx = BAR_STYLE_IDS.indexOf(styleId);
  const variantIdx = BAR_VARIANTS.indexOf(variant);
  const base = BAR1_BASE + styleIdx * BAR1_STYLE_BLOCK + variantIdx * BAR1_STRIDE;
  return base + level;
}

function bar2Codepoint(styleId, variant, a, b) {
  const styleIdx = BAR_STYLE_IDS.indexOf(styleId);
  const variantIdx = BAR_VARIANTS.indexOf(variant);
  const state = a * BAR_STRIDE + b;
  const base = BAR2_BASE + styleIdx * BAR2_STYLE_BLOCK + variantIdx * (BAR_STRIDE * BAR_STRIDE);
  return base + state;
}

function bar3Codepoint(styleId, variant, a, b, c) {
  const styleIdx = BAR_STYLE_IDS.indexOf(styleId);
  const variantIdx = BAR_VARIANTS.indexOf(variant);
  const state = a * BAR_STRIDE * BAR_STRIDE + b * BAR_STRIDE + c;
  const base = BAR3_BASE + styleIdx * BAR3_STYLE_BLOCK + variantIdx * (BAR_STRIDE * BAR_STRIDE * BAR_STRIDE);
  return base + state;
}

function donutCodepoint(styleId, side, level) {
  const styleIdx = DONUT_STYLE_IDS.indexOf(styleId);
  const sideOffset = side === "l" ? 0 : DONUT_STATES;
  const base = DONUT2_BASE + styleIdx * DONUT2_STYLE_BLOCK + sideOffset;
  return base + level;
}

function renderBar1(pct, width, styleId) {
  const units = pctToUnits(pct, width, BAR1_LEVELS);
  const out = [];
  for (let i = 0; i < width; i += 1) {
    const level = laneLevel(units, i, BAR1_LEVELS);
    if (isNoBorderBarStyle(styleId) && level === 0) {
      out.push(" ");
      continue;
    }
    const variant = variantForIndex(i, width);
    out.push(String.fromCodePoint(bar1Codepoint(styleId, variant, level)));
  }
  return out.join("");
}

function renderBar2(topPct, bottomPct, width, styleId) {
  const topUnits = pctToUnits(topPct, width, BAR_LEVELS);
  const botUnits = pctToUnits(bottomPct, width, BAR_LEVELS);
  const out = [];
  for (let i = 0; i < width; i += 1) {
    const a = laneLevel(topUnits, i, BAR_LEVELS);
    const b = laneLevel(botUnits, i, BAR_LEVELS);
    if (isNoBorderBarStyle(styleId) && a === 0 && b === 0) {
      out.push(" ");
      continue;
    }
    const variant = variantForIndex(i, width);
    out.push(String.fromCodePoint(bar2Codepoint(styleId, variant, a, b)));
  }
  return out.join("");
}

function renderBar3(aPct, bPct, cPct, width, styleId) {
  const aUnits = pctToUnits(aPct, width, BAR_LEVELS);
  const bUnits = pctToUnits(bPct, width, BAR_LEVELS);
  const cUnits = pctToUnits(cPct, width, BAR_LEVELS);
  const out = [];
  for (let i = 0; i < width; i += 1) {
    const a = laneLevel(aUnits, i, BAR_LEVELS);
    const b = laneLevel(bUnits, i, BAR_LEVELS);
    const c = laneLevel(cUnits, i, BAR_LEVELS);
    if (isNoBorderBarStyle(styleId) && a === 0 && b === 0 && c === 0) {
      out.push(" ");
      continue;
    }
    const variant = variantForIndex(i, width);
    out.push(String.fromCodePoint(bar3Codepoint(styleId, variant, a, b, c)));
  }
  return out.join("");
}

function renderDonut(pct, styleId) {
  const level = Math.round((clampPct(pct) / 100) * DONUT_LEVELS);
  if (styleId.endsWith("n") && level === 0) return "  ";
  const left = String.fromCodePoint(donutCodepoint(styleId, "l", level));
  const right = String.fromCodePoint(donutCodepoint(styleId, "r", level));
  return `${left}${right}`;
}

function usage() {
  return [
    "usage: cellgauge [percent ...] [options]",
    "",
    "options:",
    "  --width N        bar width (default: 8)",
    "  --gapped         use gapped style (default: no-gap)",
    "  --full           use full-height style (default: H-height)",
    "  --boarder        bordered style (typo alias kept intentionally)",
    "  --border         bordered style",
    "  --no-boarder     no-border style",
    "  --no-border      no-border style",
    "  --donut          render 2-cell donut (single percent only)",
    "  --seam-space     append one trailing ASCII space (optional seam workaround)",
    "",
    "examples:",
    "  cellgauge 42 --gapped --full --boarder",
    "  cellgauge 42 --donut --full --boarder",
    "  cellgauge 30 70 --gapped",
    "  cellgauge 30 50 90 --gapped",
  ].join("\n");
}

function isNumericLiteral(value) {
  return /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(String(value));
}

function parseArgs(argv) {
  const out = {
    donut: false,
    width: 8,
    gapped: false,
    full: false,
    border: false,
    seamSpace: false,
    values: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }
    if (a === "--donut") {
      out.donut = true;
      continue;
    }
    if (a === "--gapped") {
      out.gapped = true;
      continue;
    }
    if (a === "--full") {
      out.full = true;
      continue;
    }
    if (a === "--boarder" || a === "--border") {
      out.border = true;
      continue;
    }
    if (a === "--no-boarder" || a === "--no-border") {
      out.border = false;
      continue;
    }
    if (a === "--seam-space") {
      out.seamSpace = true;
      continue;
    }
    // Deprecated compatibility: ignore explicit lanes and always infer.
    if (a.startsWith("--lanes=")) {
      continue;
    }
    if (a === "--lanes" && i + 1 < argv.length) {
      i += 1;
      continue;
    }
    if (a.startsWith("--width=")) {
      out.width = Number.parseInt(a.slice("--width=".length), 10);
      continue;
    }
    if (a === "--width" && i + 1 < argv.length) {
      out.width = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
    if (a.startsWith("-")) {
      const parts = String(a)
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p !== "");
      if (parts.length > 0 && parts.every((p) => isNumericLiteral(p))) {
        throw new Error("negative percent values are not allowed");
      }
      throw new Error(`unknown option: ${a}`);
    }

    // positional value(s); supports comma-separated list too
    for (const piece of String(a).split(",")) {
      const token = piece.trim();
      if (token === "") continue;
      if (isNumericLiteral(token) && Number(token) < 0) {
        throw new Error("negative percent values are not allowed");
      }
      out.values.push(token);
    }
  }

  return out;
}

function takeLaneValues(values, lanes) {
  const nums = values.map((v) => clampPct(v));
  if (nums.length === 0) return Array.from({ length: lanes }, () => 0);
  if (nums.length >= lanes) return nums.slice(0, lanes);
  const out = nums.slice();
  while (out.length < lanes) out.push(0);
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!Number.isFinite(args.width) || args.width <= 0) {
    throw new Error("--width must be a positive integer");
  }

  if (args.donut) {
    if (args.values.length > 1) {
      throw new Error("--donut accepts a single percent value");
    }
    const pct = clampPct(args.values[0] ?? 0);
    const style = buildDonutStyle(args.full, args.border);
    const glyph = renderDonut(pct, style);
    if ([...glyph].length !== 2) throw new Error("donut output width mismatch");
    const out = args.seamSpace ? `${glyph} ` : glyph;
    process.stdout.write(`${out}\n`);
    return;
  }

  const width = Math.max(1, Math.trunc(args.width));
  const lanes = Math.max(1, Math.min(3, args.values.length || 1));

  let glyph = "";
  let style = "";

  if (lanes === 1) {
    // Single-lane bars have no inter-lane gap, so treat --gapped as a no-op.
    style = buildBarStyle(false, args.full, args.border);
    const [p] = takeLaneValues(args.values, 1);
    glyph = renderBar1(p, width, style);
  } else if (lanes === 2) {
    style = buildBarStyle(args.gapped, args.full, args.border);
    const [a, b] = takeLaneValues(args.values, 2);
    glyph = renderBar2(a, b, width, style);
  } else {
    style = buildBarStyle(args.gapped, args.full, args.border);
    const [a, b, c] = takeLaneValues(args.values, 3);
    glyph = renderBar3(a, b, c, width, style);
  }

  if ([...glyph].length !== width) throw new Error("bar output width mismatch");

  const out = args.seamSpace ? `${glyph} ` : glyph;
  process.stdout.write(`${out}\n`);
}

try {
  main();
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  process.stderr.write(`cellgauge: ${msg}\n`);
  process.exit(2);
}
