#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_SOURCE_DIR = ROOT_DIR;
const TARGET_DIR = path.join(ROOT_DIR, "fonts");

const SOURCE_TTF = path.join("fonts", "CellGaugeSymbols.ttf");
const TARGET_TTF = "CellGaugeSymbols.ttf";

function fail(message) {
  process.stderr.write(`sync-font: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    sourceDir: process.env.CELLGAUGE_FONT_SOURCE_DIR || DEFAULT_SOURCE_DIR,
    skipBuild: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--skip-build") {
      out.skipBuild = true;
      continue;
    }
    if (a.startsWith("--source-dir=")) {
      out.sourceDir = a.slice("--source-dir=".length);
      continue;
    }
    if (a === "--source-dir" && i + 1 < argv.length) {
      out.sourceDir = argv[i + 1];
      i += 1;
      continue;
    }
    fail(`unknown option: ${a}`);
  }

  return out;
}

function runRebuild(sourceDir) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCmd, ["run", "rebuild"], {
    cwd: sourceDir,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceDir = path.resolve(args.sourceDir);

  if (!fs.existsSync(sourceDir)) {
    fail(`source directory does not exist: ${sourceDir}`);
  }

  if (!args.skipBuild) {
    runRebuild(sourceDir);
  }

  const sourceDistDir = path.join(sourceDir, "dist");
  const sourceTtfPath = fs.existsSync(path.join(sourceDistDir, SOURCE_TTF))
    ? path.join(sourceDistDir, SOURCE_TTF)
    : path.join(sourceDir, SOURCE_TTF);

  if (!fs.existsSync(sourceTtfPath)) {
    fail(`missing source TTF: ${sourceTtfPath}`);
  }

  fs.mkdirSync(TARGET_DIR, { recursive: true });
  const targetTtfPath = path.join(TARGET_DIR, TARGET_TTF);
  if (path.resolve(sourceTtfPath) === path.resolve(targetTtfPath)) {
    process.stdout.write(`already synced ${targetTtfPath}\n`);
    return;
  }
  fs.copyFileSync(sourceTtfPath, targetTtfPath);

  process.stdout.write(`synced ${targetTtfPath}\n`);
}

main();
