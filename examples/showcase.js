#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const TOOL = path.join(__dirname, "..", "bin", "cellgauge.js");

function run(args) {
  return execFileSync(TOOL, args, { encoding: "utf8" }).replace(/\n$/, "");
}

function row(label, args) {
  const text = run(args);
  const padded = `${label}:`.padEnd(24, " ");
  process.stdout.write(`${padded}${text}\n`);
}

function section(title) {
  process.stdout.write(`\n${title}\n`);
}

section("Bar1 (single lane)");
row("h+border", ["13", "--border"]);
row("h no-border", ["29"]);
row("full+border", ["44", "--full", "--border"]);
row("full no-border", ["58", "--full"]);
row("gapped h+border", ["71", "--gapped", "--border"]);
row("gapped h no-border", ["83", "--gapped"]);
row("gapped full+border", ["92", "--gapped", "--full", "--border"]);
row("gapped full no-border", ["36", "--gapped", "--full"]);

section("Bar2 (two lanes)");
row("h+border", ["22", "68", "--border"]);
row("gapped h+border", ["41", "79", "--gapped", "--border"]);
row("gapped full no-border", ["63", "17", "--gapped", "--full"]);

section("Bar3 (three lanes)");
row("h+border", ["14", "47", "86", "--border"]);
row("gapped h+border", ["28", "66", "91", "--gapped", "--border"]);
row("gapped full no-border", ["73", "39", "55", "--gapped", "--full"]);

section("Donut (single only)");
row("h+border", ["12", "--donut", "--border"]);
row("h no-border", ["34", "--donut"]);
row("full+border", ["67", "--donut", "--full", "--border"]);
row("full no-border", ["89", "--donut", "--full"]);
