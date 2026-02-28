const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const CLI = path.resolve(__dirname, "..", "bin", "cellgauge.js");

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
  });
}

test("prints packaged font path", () => {
  const result = run(["font-path"]);
  assert.equal(result.status, 0);
  const printed = result.stdout.trim();
  assert.ok(printed.length > 0);
  assert.ok(path.isAbsolute(printed));
});

test("rejects removed --font-path alias", () => {
  const result = run(["--font-path"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option: --font-path/);
});

test("installs packaged font into explicit directory", () => {
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), "cellgauge-font-"));
  const result = run(["install-font", "--font-dir", installDir]);
  assert.equal(result.status, 0);
  const files = fs.readdirSync(installDir);
  assert.ok(files.some((name) => name.toLowerCase().endsWith(".ttf")));
});

test("no-border bars use non-bleeding last-cell variant", () => {
  const result = run(["100", "--width", "3", "--no-border"]);
  assert.equal(result.status, 0);
  const glyphs = Array.from(result.stdout.trimEnd());
  assert.equal(glyphs.length, 3);

  const cps = glyphs.map((g) => g.codePointAt(0));
  assert.equal(cps[0], cps[1]);
  assert.notEqual(cps[1], cps[2]);
});

test("no-border right bleed is used only for internal full cells", () => {
  const result = run(["70", "--width", "4", "--no-border"]);
  assert.equal(result.status, 0);

  const line = result.stdout.endsWith("\n") ? result.stdout.slice(0, -1) : result.stdout;
  const glyphs = Array.from(line);
  assert.equal(glyphs.length, 4);
  assert.equal(glyphs[3], " ");

  const BAR1_BASE = 0x10fa20;
  const BAR1_STRIDE = 9;
  const BAR1_STYLE_BLOCK = BAR1_STRIDE * 4;
  const BAR_STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"];
  const BAR_VARIANTS = ["l", "m", "r", "s"];
  const styleBase = BAR1_BASE + BAR_STYLE_IDS.indexOf("nhn") * BAR1_STYLE_BLOCK;

  function decodeVariant(ch) {
    const cp = ch.codePointAt(0);
    const variantIndex = Math.floor((cp - styleBase) / BAR1_STRIDE);
    return BAR_VARIANTS[variantIndex];
  }

  assert.equal(decodeVariant(glyphs[0]), "m");
  assert.equal(decodeVariant(glyphs[1]), "r");
  assert.equal(decodeVariant(glyphs[2]), "r");
});

test("bordered width=1 at 100% redirects s to r (left cap hidden by fill)", () => {
  const result = run(["100", "--width", "1", "--border"]);
  assert.equal(result.status, 0);
  const glyphs = Array.from(result.stdout.trimEnd());
  assert.equal(glyphs.length, 1);

  // nhb style: --border without --gapped or --full = buildBarStyle(false,false,true) = "nhb"
  // Redirected from s to r because level 8 (100%) fills the left cap.
  const BAR1_BASE = 0x10fa20;
  const BAR1_STRIDE = 9;
  const BAR1_STYLE_BLOCK = BAR1_STRIDE * 4;
  const STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"];
  const VARIANTS = ["l", "m", "r", "s"];
  const nhbBase = BAR1_BASE + STYLE_IDS.indexOf("nhb") * BAR1_STYLE_BLOCK;
  const expectedR8 = nhbBase + VARIANTS.indexOf("r") * BAR1_STRIDE + 8;
  assert.equal(glyphs[0].codePointAt(0), expectedR8);
});

test("bordered width=1 at 0% keeps s variant (left cap visible)", () => {
  const result = run(["0", "--width", "1", "--border"]);
  assert.equal(result.status, 0);
  const glyphs = Array.from(result.stdout.trimEnd());
  assert.equal(glyphs.length, 1);

  // nhb style, s variant, level 0: left border is visible so s is kept.
  const BAR1_BASE = 0x10fa20;
  const BAR1_STRIDE = 9;
  const BAR1_STYLE_BLOCK = BAR1_STRIDE * 4;
  const STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"];
  const VARIANTS = ["l", "m", "r", "s"];
  const nhbBase = BAR1_BASE + STYLE_IDS.indexOf("nhb") * BAR1_STYLE_BLOCK;
  const expectedS0 = nhbBase + VARIANTS.indexOf("s") * BAR1_STRIDE + 0;
  assert.equal(glyphs[0].codePointAt(0), expectedS0);
});

test("bordered 2-lane keeps l when any lane is 0, redirects when all positive", () => {
  const BAR2_BASE = 0x10f000;
  const STRIDE = 9;
  const STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"];
  const VARIANTS = ["l", "m", "r", "s"];
  const variantBlock = STRIDE * STRIDE;
  const nhbBase = BAR2_BASE + STYLE_IDS.indexOf("nhb") * VARIANTS.length * variantBlock;

  // 100%,0% width=2: cell[0] levels=[8,0], not all >0 => l kept
  const kept = run(["100", "0", "--width", "2", "--border"]);
  assert.equal(kept.status, 0);
  const keptGlyphs = Array.from(kept.stdout.trimEnd());
  assert.equal(keptGlyphs.length, 2);
  const expectedL80 = nhbBase + VARIANTS.indexOf("l") * variantBlock + 8 * STRIDE + 0;
  assert.equal(keptGlyphs[0].codePointAt(0), expectedL80);

  // 100%,100% width=2: cell[0] levels=[8,8], all >0 => l→m
  const redirected = run(["100", "100", "--width", "2", "--border"]);
  assert.equal(redirected.status, 0);
  const redirGlyphs = Array.from(redirected.stdout.trimEnd());
  assert.equal(redirGlyphs.length, 2);
  const expectedM88 = nhbBase + VARIANTS.indexOf("m") * variantBlock + 8 * STRIDE + 8;
  assert.equal(redirGlyphs[0].codePointAt(0), expectedM88);
});
