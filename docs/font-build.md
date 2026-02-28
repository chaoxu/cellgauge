# Font Build Notes

`cellgauge` ships a prebuilt `fonts/CellGaugeSymbols.ttf`, but the generator
pipeline is kept in-repo for maintainers.

## Source Files

- `scripts/font/generate_stacked_bar_svgs.py`: emits bar/donut SVG glyph set
- `scripts/font/fantasticon.config.js`: deterministic temporary BMP codepoints
- `scripts/font/align_to_menlo_capheight.py`: aligns to Menlo metrics and remaps
  to final Plane-16 CellGauge codepoints
- `scripts/rebuild-font.js`: orchestrates the full local rebuild

## Rebuild

```bash
pip install -r scripts/font/requirements.txt
npm run font:rebuild
```

This writes intermediate artifacts to `.font-build/` and updates:

- `fonts/CellGaugeSymbols.ttf`

## Syncing External Builds

If you still build the font in another directory, you can copy it in:

```bash
npm run sync-font -- --source-dir /path/to/source --skip-build
```

`sync-font` checks these source candidates in order:

1. `<source>/dist/fonts/CellGaugeSymbols.ttf`
2. `<source>/fonts/CellGaugeSymbols.ttf`
3. `<source>/.font-build/dist/CellGaugeSymbols.ttf`
4. `<source>/dist/CellGaugeSymbols.ttf`
