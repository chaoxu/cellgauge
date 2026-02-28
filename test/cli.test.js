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

