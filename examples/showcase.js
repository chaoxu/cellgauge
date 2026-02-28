#!/usr/bin/env node

const { execFileSync } = require("child_process");
const path = require("path");

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
row("h+border", ["42", "--boarder"]);
row("h no-border", ["42"]);
row("full+border", ["42", "--full", "--boarder"]);
row("full no-border", ["42", "--full"]);
row("gapped h+border", ["42", "--gapped", "--boarder"]);
row("gapped h no-border", ["42", "--gapped"]);
row("gapped full+border", ["42", "--gapped", "--full", "--boarder"]);
row("gapped full no-border", ["42", "--gapped", "--full"]);

section("Bar2 (two lanes)");
row("h+border", ["20", "65", "--boarder"]);
row("gapped full no-border", ["20", "65", "--gapped", "--full"]);

section("Bar3 (three lanes)");
row("h+border", ["20", "45", "70", "--boarder"]);
row("gapped full no-border", ["20", "45", "70", "--gapped", "--full"]);

section("Donut (single only)");
row("h+border", ["42", "--donut", "--boarder"]);
row("h no-border", ["42", "--donut"]);
row("full+border", ["42", "--donut", "--full", "--boarder"]);
row("full no-border", ["42", "--donut", "--full"]);
