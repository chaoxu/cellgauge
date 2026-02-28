# cellgauge

Terminal progress bar and donut chart glyphs.

`cellgauge` renders compact chart glyphs for terminal status lines. All numeric inputs are interpreted as percentages (`0` to `100`).

<img width="273" height="394" alt="image" src="https://github.com/user-attachments/assets/2993f36c-7f97-45f5-b405-ac79c5ec0049" />

## Install

```bash
npm i -g cellgauge
```

## Quick Start

```bash
# Single-lane progress bar (42%)
cellgauge 42

# Two-lane stacked bar (gapped, non-full, bordered)
cellgauge 20 65 --gapped --border --width 6

# Three-lane stacked bar (gapped, non-full, bordered)
cellgauge 20 45 70 --gapped --border

# Donut chart (42%)
cellgauge 42 --donut --full --border
```

## Percentage Inputs

- Every number is a percentage.
- Valid range is `0` to `100`.
- Values above `100` are clamped to `100`.
- Negative values are rejected with an error.

## Chart Modes

- `1` value: single-lane progress bar
- `2` values: stacked 2-lane bar
- `3+` values: stacked 3-lane bar (first 3 are used)
- `--donut`: 2-cell donut chart (single value only)

## Main Usage

```bash
cellgauge [percent ...] [options]
```

Options:

- `--width N`: output width in character cells (default `8`)
- `--gapped`: use gapped lane style (no-op for single-lane bars)
- `--full`: use full-height style (default is cap-height style)
- `--border`: border on
- `--no-border`: border off
- `--donut`: render donut chart (single percentage only)
- `--seam-space`: append one trailing ASCII space

## Font Commands

### `cellgauge install-font [--font-dir PATH]`

Installs the packaged `CellGauge Symbols` TTF into a font directory.

```bash
# Install to default user font dir for your OS
cellgauge install-font

# Install to a custom directory
cellgauge install-font --font-dir /path/to/fonts
```

### `cellgauge font-path`

Prints the full path to the packaged TTF file.

Use this when you want to install/copy the font yourself or script around it.

```bash
cellgauge font-path
```

## Font Requirement

Default chart output uses Private Use Area Unicode glyphs from the bundled terminal font. To render correctly, install the font and configure your terminal profile to use it (or include it in fallback).

## More Documentation

- [Usage Guide](docs/usage.md)
- [Font Build Notes](docs/font-build.md)

## Font Generation (Maintainers)

Font generation is now in-repo under `scripts/font/`.

```bash
# Rebuild chart glyph font from source SVG generator + aligner
npm run font:rebuild
```

Requirements:

- Python 3 with `fonttools` installed (`pip install -r scripts/font/requirements.txt`)
- `fantasticon` (auto-used from local `node_modules` or via `npx fantasticon@4.1.0`)

This generator code is not part of the published npm payload. The package
publish allowlist only includes `bin/`, `fonts/`, `README.md`, and `LICENSE`.

## Notes

- Unknown flags fail fast with an error.
- Output is glyph-only and intended for terminal status bars.
- Font asset in this package: `fonts/CellGaugeSymbols.ttf`.
