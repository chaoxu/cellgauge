# cellgauge

Compact Unicode progress glyphs for terminal status bars.

## Install

```bash
npm i -g cellgauge
```

## Usage

```bash
cellgauge [percent ...] [options]
```

- `1` percent -> single bar
- `2` percents -> stacked 2-bar
- `3+` percents -> stacked 3-bar (first 3 used)

### Options

- `--width N` bar width in character cells (default `8`)
- `--gapped` use gapped lane style (no-op for single-lane bars)
- `--full` use full-height style (default is cap-height style)
- `--boarder` bordered style (typo alias kept intentionally)
- `--border` bordered style
- `--no-boarder` no-border style
- `--no-border` no-border style
- `--donut` render a 2-cell donut (single percent only)
- `--seam-space` append one trailing ASCII space for seam-workaround renderers

## Examples

```bash
cellgauge 42 --full --boarder
cellgauge 20 65 --gapped --width 6
cellgauge 20 45 70 --gapped --full
cellgauge 42 --donut --full --boarder
```

## Notes

- Unknown flags fail fast with an error.
- Negative percent values are rejected.
- Output is glyph-only, intended for status bars.
