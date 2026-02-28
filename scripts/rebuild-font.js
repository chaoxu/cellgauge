#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT_DIR, ".font-build");
const ICONS_DIR = path.join(BUILD_DIR, "icons");
const DIST_DIR = path.join(BUILD_DIR, "dist");
const FONT_DIR = path.join(ROOT_DIR, "fonts");
const TARGET_TTF = path.join(FONT_DIR, "CellGaugeSymbols.ttf");
const BUILT_TTF = path.join(DIST_DIR, "CellGaugeSymbols.ttf");
const PY_GENERATOR = path.join(ROOT_DIR, "scripts", "font", "generate_stacked_bar_svgs.py");
const PY_ALIGN = path.join(ROOT_DIR, "scripts", "font", "align_to_menlo_capheight.py");
const FANTASTICON_CONFIG = path.join("scripts", "font", "fantasticon.config.js");

function fail(message) {
  process.stderr.write(`font:rebuild: ${message}\n`);
  process.exit(1);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function resolvePython() {
  if (process.env.CELLGAUGE_PYTHON) {
    return process.env.CELLGAUGE_PYTHON;
  }
  const repoVenvPython = path.join(ROOT_DIR, ".venv", "bin", "python");
  if (fs.existsSync(repoVenvPython)) {
    return repoVenvPython;
  }
  return "python3";
}

function resolveFantasticonCommand() {
  const localBin = path.join(ROOT_DIR, "node_modules", ".bin", "fantasticon");
  if (fs.existsSync(localBin)) {
    return { cmd: localBin, args: ["-c", FANTASTICON_CONFIG] };
  }
  return {
    cmd: "npx",
    args: ["--yes", "fantasticon@4.1.0", "-c", FANTASTICON_CONFIG],
  };
}

function ensurePythonModule(python, moduleName, helpText) {
  const result = spawnSync(python, ["-c", `import ${moduleName}`], {
    stdio: "ignore",
  });
  if (result.status !== 0) {
    fail(helpText);
  }
}

function main() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(FONT_DIR, { recursive: true });

  const python = resolvePython();
  ensurePythonModule(
    python,
    "fontTools",
    "python module 'fontTools' is required; run `pip install -r scripts/font/requirements.txt`",
  );
  run(python, [PY_GENERATOR, "--out-dir", ICONS_DIR], { cwd: ROOT_DIR });

  const fantasticon = resolveFantasticonCommand();
  const env = {
    ...process.env,
    CELLGAUGE_FONT_INPUT_DIR: ICONS_DIR,
    CELLGAUGE_FONT_OUTPUT_DIR: DIST_DIR,
  };
  run(fantasticon.cmd, fantasticon.args, { cwd: ROOT_DIR, env });

  if (!fs.existsSync(BUILT_TTF)) {
    fail(`missing built TTF: ${BUILT_TTF}`);
  }

  run(python, [PY_ALIGN, BUILT_TTF], { cwd: ROOT_DIR });
  fs.copyFileSync(BUILT_TTF, TARGET_TTF);

  process.stdout.write(`${TARGET_TTF}\n`);
}

main();
