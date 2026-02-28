# cellgauge

Terminal progress bar and donut chart glyphs.

`cellgauge` renders compact chart glyphs for terminal status lines. All numeric inputs are interpreted as percentages (`0` to `100`).

## Install

```bash
npm i -g cellgauge
```

## Quick Start

```bash
# Single-lane progress bar (42%)
cellgauge 42

# Two-lane stacked bar (20% and 65%)
cellgauge 20 65 --gapped --width 6

# Three-lane stacked bar (20%, 45%, 70%)
cellgauge 20 45 70 --gapped --full

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

## Notes

- Unknown flags fail fast with an error.
- Output is glyph-only and intended for terminal status bars.
- Font asset in this package: `fonts/CellGaugeSymbols.ttf`.
