# CellGauge Font Packaging and Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship CellGauge with bundled font assets and CLI helpers so users can install or locate the font, plus an ASCII fallback mode that works without custom font setup.

**Architecture:** Keep the existing single-file CLI architecture, add a small command dispatcher for font management subcommands, and add self-contained fallback render helpers. Font binaries are versioned in-repo and included in npm publish output; maintainers refresh them from `~/playground/openusage-logos-font` via a sync script.

**Tech Stack:** Node.js (CommonJS), Node built-in test runner (`node:test`), shell copy/build commands, existing CLI renderer.

---

### Task 1: Add failing CLI tests for new behavior

**Files:**
- Create: `test/cli.test.js`
- Modify: `package.json`

**Step 1: Write the failing test**
- Add tests for:
  - `--font-path` returns a filesystem path and exit code 0
  - `install-font --font-dir <tmp>` copies font file into target directory
  - `--ascii` renders bars with requested width
  - `--donut --ascii` emits exactly 2 chars

**Step 2: Run test to verify it fails**
- Run: `node --test`
- Expected: FAIL with unknown options/commands before implementation.

### Task 2: Add packaged font assets and maintainer sync tooling

**Files:**
- Create: `fonts/CellGaugeSymbols.ttf`
- Create: `fonts/CellGaugeSymbols.woff2`
- Create: `fonts/cellgauge-font.css`
- Create: `scripts/sync-font-assets.js`
- Modify: `package.json`

**Step 1: Write minimal implementation**
- Copy current generated font outputs from `~/playground/openusage-logos-font/dist` into `fonts/`.
- Add CSS `@font-face` that references local package font files.
- Add `npm run sync-font` script to refresh assets from source project.
- Add package `files`/`exports` entries for fonts and css.

**Step 2: Run focused verification**
- Run: `npm run sync-font -- --skip-build`
- Expected: files copied and command exits 0.

### Task 3: Implement CLI font commands and ASCII fallback

**Files:**
- Modify: `bin/cellgauge.js`

**Step 1: Write minimal implementation**
- Add top-level command handling for:
  - `--font-path` / `font-path`
  - `install-font [--font-dir PATH]`
- Add OS-aware default font destination when `--font-dir` omitted.
- Add `--ascii` flag to rendering path.
- Implement ASCII bar/donut rendering preserving width invariants.

**Step 2: Run test to verify it passes**
- Run: `node --test`
- Expected: PASS for new CLI behaviors.

### Task 4: Document usage and verify package output

**Files:**
- Modify: `README.md`
- Modify: `package.json`

**Step 1: Write minimal docs**
- Document font commands, install flow, and fallback mode.
- Document source-of-truth generator location (`~/playground/openusage-logos-font`).

**Step 2: Run complete verification**
- Run: `npm run check`
- Run: `node --test`
- Run: `npm pack --dry-run`
- Expected: checks pass and tarball includes `fonts/*` and css.
