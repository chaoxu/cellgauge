#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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

const BAR_CONFIGS = [
  null, // index 0 unused
  { base: BAR1_BASE, levels: BAR1_LEVELS, stride: BAR1_STRIDE, styleBlock: BAR1_STYLE_BLOCK },
  { base: BAR2_BASE, levels: BAR_LEVELS, stride: BAR_STRIDE, styleBlock: BAR2_STYLE_BLOCK },
  { base: BAR3_BASE, levels: BAR_LEVELS, stride: BAR_STRIDE, styleBlock: BAR3_STYLE_BLOCK },
];

const PACKAGED_FONT_FILE = "CellGaugeSymbols.ttf";
const PACKAGED_FONT_PATH = path.resolve(__dirname, "..", "fonts", PACKAGED_FONT_FILE);

const BOOL_FLAGS = {
  "--help": "help", "-h": "help",
  "--donut": "donut", "--gapped": "gapped", "--full": "full",
  "--border": "border", "--seam-space": "seamSpace",
};

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

function isNoBorderStyle(styleId) {
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

function barCellCodepoint(config, styleId, variant, laneLevels) {
  const styleIdx = BAR_STYLE_IDS.indexOf(styleId);
  const variantIdx = BAR_VARIANTS.indexOf(variant);
  let state = 0;
  for (const l of laneLevels) state = state * config.stride + l;
  const variantBlock = config.styleBlock / BAR_VARIANTS.length;
  return config.base + styleIdx * config.styleBlock + variantIdx * variantBlock + state;
}

function donutCodepoint(styleId, side, level) {
  const styleIdx = DONUT_STYLE_IDS.indexOf(styleId);
  const sideOffset = side === "l" ? 0 : DONUT_STATES;
  const base = DONUT2_BASE + styleIdx * DONUT2_STYLE_BLOCK + sideOffset;
  return base + level;
}

function renderBar(pcts, width, styleId) {
  const lanes = pcts.length;
  const config = BAR_CONFIGS[lanes];
  const allUnits = pcts.map((p) => pctToUnits(p, width, config.levels));
  const noBorder = isNoBorderStyle(styleId);
  const out = [];
  for (let i = 0; i < width; i += 1) {
    const laneLevels = allUnits.map((u) => laneLevel(u, i, config.levels));
    if (noBorder && laneLevels.every((l) => l === 0)) {
      out.push(" ");
      continue;
    }
    const variant = variantForIndex(i, width);
    out.push(String.fromCodePoint(barCellCodepoint(config, styleId, variant, laneLevels)));
  }
  return out.join("");
}

function renderDonut(pct, styleId) {
  const level = Math.round((clampPct(pct) / 100) * DONUT_LEVELS);
  if (isNoBorderStyle(styleId) && level === 0) return "  ";
  return String.fromCodePoint(donutCodepoint(styleId, "l", level))
       + String.fromCodePoint(donutCodepoint(styleId, "r", level));
}

function usage() {
  return `\
usage: cellgauge [percent ...] [options]
       cellgauge font-path
       cellgauge install-font [--font-dir PATH]

note:
  all numeric inputs are treated as percentages (0..100)

options:
  --width N        bar width (default: 8)
  --gapped         use gapped style (default: no-gap)
  --full           use full-height style (default: H-height)
  --border         bordered style
  --no-border      no-border style
  --donut          render 2-cell donut (single percent only)
  --seam-space     append one trailing ASCII space (optional seam workaround)

examples:
  cellgauge 42 --gapped --full --border
  cellgauge 42 --donut --full --border
  cellgauge 30 70 --gapped
  cellgauge 30 50 90 --gapped
  cellgauge font-path
  cellgauge install-font`;
}

function installUsage() {
  return `\
usage: cellgauge install-font [--font-dir PATH]

options:
  --font-dir PATH  target directory for CellGaugeSymbols.ttf`;
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
    if (BOOL_FLAGS[a]) {
      out[BOOL_FLAGS[a]] = true;
      continue;
    }
    if (a === "--no-border") {
      out.border = false;
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
      const parts = a.split(",").map((p) => p.trim()).filter((p) => p !== "");
      if (parts.length > 0 && parts.every((p) => isNumericLiteral(p))) {
        throw new Error("negative percent values are not allowed");
      }
      throw new Error(`unknown option: ${a}`);
    }

    // positional value(s); supports comma-separated list too
    for (const piece of a.split(",")) {
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

function defaultFontDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Fonts");
  }
  if (process.platform === "linux") {
    return path.join(os.homedir(), ".local", "share", "fonts");
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Microsoft", "Windows", "Fonts");
  }
  return null;
}

function parseInstallFontArgs(argv) {
  const out = {
    help: false,
    fontDir: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }
    if (a.startsWith("--font-dir=")) {
      out.fontDir = a.slice("--font-dir=".length);
      continue;
    }
    if (a === "--font-dir" && i + 1 < argv.length) {
      out.fontDir = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`unknown option for install-font: ${a}`);
  }

  if (out.help) {
    return out;
  }

  out.fontDir = out.fontDir || defaultFontDir();
  if (!out.fontDir) {
    throw new Error("unable to infer default font directory on this platform; use --font-dir");
  }

  return out;
}

function refreshLinuxFontCache(fontDir) {
  if (process.platform !== "linux") return;
  spawnSync("fc-cache", ["-f", fontDir], { stdio: "ignore" });
}

function installPackagedFont(fontDir) {
  if (!fs.existsSync(PACKAGED_FONT_PATH)) {
    throw new Error(`packaged font missing: ${PACKAGED_FONT_PATH}`);
  }
  const resolvedDir = path.resolve(fontDir);
  fs.mkdirSync(resolvedDir, { recursive: true });
  const outPath = path.join(resolvedDir, PACKAGED_FONT_FILE);
  fs.copyFileSync(PACKAGED_FONT_PATH, outPath);
  refreshLinuxFontCache(resolvedDir);
  return outPath;
}

function takeLaneValues(values, lanes) {
  return Array.from({ length: lanes }, (_, i) => clampPct(values[i] ?? 0));
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "font-path") {
    process.stdout.write(`${PACKAGED_FONT_PATH}\n`);
    return;
  }

  if (argv[0] === "install-font") {
    const installArgs = parseInstallFontArgs(argv.slice(1));
    if (installArgs.help) {
      process.stdout.write(`${installUsage()}\n`);
      return;
    }
    const installedPath = installPackagedFont(installArgs.fontDir);
    process.stdout.write(`${installedPath}\n`);
    return;
  }

  const args = parseArgs(argv);
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
  const laneValues = takeLaneValues(args.values, lanes);

  // Single-lane bars have no inter-lane gap, so treat --gapped as a no-op.
  const gapped = lanes === 1 ? false : args.gapped;
  const glyph = renderBar(laneValues, width, buildBarStyle(gapped, args.full, args.border));

  if ([...glyph].length !== width) throw new Error("bar output width mismatch");

  const out = args.seamSpace ? `${glyph} ` : glyph;
  process.stdout.write(`${out}\n`);
}

process.stdout.on("error", (err) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

try {
  main();
} catch (err) {
  process.stderr.write(`cellgauge: ${err.message || err}\n`);
  process.exit(2);
}
