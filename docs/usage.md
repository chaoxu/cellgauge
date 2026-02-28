# cellgauge Usage Guide

## What cellgauge Does

`cellgauge` creates compact terminal chart glyphs from percentage values.

Supported chart types:

- progress bars (1, 2, or 3 lanes)
- donut charts (2-cell output)

All numeric inputs are percentages in the range `0..100`.

## Command Forms

```bash
cellgauge [percent ...] [options]
cellgauge install-font [--font-dir PATH]
cellgauge font-path
```

## Percentage Rules

- `0` means empty.
- `100` means full.
- Non-numeric inputs are treated as `0` by the renderer.
- Values above `100` are clamped to `100`.
- Negative values are rejected.

## Bar Charts

### Single-lane bar

```bash
cellgauge 42
```

### Two-lane bar

```bash
cellgauge 20 65 --gapped --border --width 6
```

### Three-lane bar

```bash
cellgauge 20 45 70 --gapped --border
```

If you pass more than 3 values, only the first 3 are used.

## Donut Charts

```bash
cellgauge 42 --donut
```

Donut mode accepts one percentage value.

## Options Reference

- `--width N`: width of bar output (default `8`)
- `--gapped`: gap between lanes for multi-lane bars
- `--full`: full-height style
- `--border`: enable border
- `--no-border`: disable border
- `--donut`: switch to donut renderer
- `--seam-space`: append trailing space

## Font Setup

Default rendering expects the bundled font (`CellGauge Symbols`) to be available to your terminal.

Install it automatically:

```bash
cellgauge install-font
```

Install to custom directory:

```bash
cellgauge install-font --font-dir /path/to/fonts
```

Find packaged font path:

```bash
cellgauge font-path
```

Then set your terminal font (or fallback font) to include this font.

## Exit Behavior

- success: exit code `0`
- argument/usage errors: exit code `2`

## Examples for Status Bars

```bash
# CPU usage percent from some script
cellgauge "$CPU_PERCENT" --width 10

# Memory + swap usage stacked
cellgauge "$MEM_PERCENT" "$SWAP_PERCENT" --gapped --border --width 8

# RX + TX + error rate stacked (gapped, non-full, bordered)
cellgauge "$RX_PERCENT" "$TX_PERCENT" "$ERR_PERCENT" --gapped --border --width 8

# Donut in a compact prompt segment
cellgauge "$BATTERY_PERCENT" --donut --full --border
```
