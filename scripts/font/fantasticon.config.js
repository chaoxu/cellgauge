const path = require("node:path");

const LEVELS = 8;
const STRIDE = LEVELS + 1;
const BAR1_LEVELS = 8;
const BAR1_STRIDE = BAR1_LEVELS + 1;
const DONUT_LEVELS = 32;
const DONUT_STATES = DONUT_LEVELS + 1;

const BAR_VARIANTS = ["l", "m", "r", "s"];
const BAR_STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"];
const DONUT_STYLES = ["hb", "fb", "hn", "fn"];
const DONUT_SIDES = ["l", "r"];

const TMP_BAR3_BASE = 0x1000;
const TMP_BAR2_BASE = 0x7000;
const TMP_BAR1_BASE = 0x7b00;
const TMP_DONUT2_BASE = 0x7e20;

const BAR1_STYLE_BLOCK = BAR_VARIANTS.length * BAR1_STRIDE;
const BAR2_STYLE_BLOCK = BAR_VARIANTS.length * STRIDE * STRIDE;
const BAR3_STYLE_BLOCK = BAR_VARIANTS.length * STRIDE * STRIDE * STRIDE;
const DONUT2_STYLE_BLOCK = DONUT_SIDES.length * DONUT_STATES;

function hasLeftCap(variant) {
  return variant === "l" || variant === "s";
}

function leftCapHidden(noBorder, levels) {
  if (noBorder) return true;
  return levels.every((l) => l > 0);
}

function buildCodepoints() {
  const out = {};

  for (let styleIdx = 0; styleIdx < BAR_STYLE_IDS.length; styleIdx += 1) {
    const style = BAR_STYLE_IDS[styleIdx];
    const noBorder = style.endsWith("n");
    const bar3StyleBase = TMP_BAR3_BASE + styleIdx * BAR3_STYLE_BLOCK;
    const bar2StyleBase = TMP_BAR2_BASE + styleIdx * BAR2_STYLE_BLOCK;
    const bar1StyleBase = TMP_BAR1_BASE + styleIdx * BAR1_STYLE_BLOCK;
    const bar3VariantBlock = STRIDE * STRIDE * STRIDE;
    const bar2VariantBlock = STRIDE * STRIDE;

    for (let variantIdx = 0; variantIdx < BAR_VARIANTS.length; variantIdx += 1) {
      const variant = BAR_VARIANTS[variantIdx];
      const bar3VariantBase = bar3StyleBase + variantIdx * bar3VariantBlock;
      const bar2VariantBase = bar2StyleBase + variantIdx * bar2VariantBlock;
      const bar1VariantBase = bar1StyleBase + variantIdx * BAR1_STRIDE;

      for (let a = 0; a <= LEVELS; a += 1) {
        for (let b = 0; b <= LEVELS; b += 1) {
          for (let c = 0; c <= LEVELS; c += 1) {
            if (noBorder && a === 0 && b === 0 && c === 0) continue;
            if (hasLeftCap(variant) && leftCapHidden(noBorder, [a, b, c])) continue;
            const state = a * STRIDE * STRIDE + b * STRIDE + c;
            out[`bar3_${style}_${variant}_${a}${b}${c}`] = bar3VariantBase + state;
          }
        }
      }

      for (let a = 0; a <= LEVELS; a += 1) {
        for (let b = 0; b <= LEVELS; b += 1) {
          if (noBorder && a === 0 && b === 0) continue;
          if (hasLeftCap(variant) && leftCapHidden(noBorder, [a, b])) continue;
          const state = a * STRIDE + b;
          out[`bar2_${style}_${variant}_${a}${b}`] = bar2VariantBase + state;
        }
      }

      for (let level = 0; level <= BAR1_LEVELS; level += 1) {
        if (noBorder && level === 0) continue;
        if (hasLeftCap(variant) && leftCapHidden(noBorder, [level])) continue;
        const state = level.toString().padStart(2, "0");
        out[`bar1_${style}_${variant}_${state}`] = bar1VariantBase + level;
      }
    }
  }

  for (let styleIdx = 0; styleIdx < DONUT_STYLES.length; styleIdx += 1) {
    const style = DONUT_STYLES[styleIdx];
    const noBorder = style.endsWith("n");
    const styleBase = TMP_DONUT2_BASE + styleIdx * DONUT2_STYLE_BLOCK;
    for (let sideIdx = 0; sideIdx < DONUT_SIDES.length; sideIdx += 1) {
      const side = DONUT_SIDES[sideIdx];
      const sideBase = styleBase + sideIdx * DONUT_STATES;
      for (let level = 0; level <= DONUT_LEVELS; level += 1) {
        if (noBorder && level === 0) continue;
        const state = level.toString().padStart(2, "0");
        out[`donut2_${style}_${side}_${state}`] = sideBase + level;
      }
    }
  }

  return out;
}

module.exports = {
  name: "CellGaugeSymbols",
  inputDir: process.env.CELLGAUGE_FONT_INPUT_DIR || path.resolve(__dirname, "..", "..", ".font-build", "icons"),
  outputDir: process.env.CELLGAUGE_FONT_OUTPUT_DIR || path.resolve(__dirname, "..", "..", ".font-build", "dist"),
  fontTypes: ["ttf", "woff2"],
  assetTypes: ["json"],
  normalize: true,
  fontHeight: 1000,
  descent: 200,
  round: 10e12,
  codepoints: buildCodepoints(),
};
