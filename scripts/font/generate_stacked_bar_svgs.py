#!/usr/bin/env python3
"""
Generate bar and donut glyph SVGs.

Bar style IDs (gap/full/border):
  ghb gfb nhb nfb ghn gfn nhn nfn
  g/n: with gap / no gap
  h/f: H-height target / full-block target
  b/n: border / no border

Bar naming:
  bar1_<style>_<variant>_<a>.svg
  bar2_<style>_<variant>_<ab>.svg
  bar3_<style>_<variant>_<abc>.svg
  variant in {l,m,r,s}

Donut naming:
  donut2_<style>_<side>_<ll>.svg
  style in {hb,fb,hn,fn}
  side in {l,r}
  ll in 00..32 (progress levels)
"""

import argparse
import math
from pathlib import Path

DEFAULT_OUT_DIR = Path(__file__).resolve().parent.parent / "icons"
OUT_DIR = DEFAULT_OUT_DIR
LEVELS = 8
BAR1_LEVELS = 16
DONUT_LEVELS = 32

W = 2000
H = 2986
FULL_W = W * 2
STROKE = 160
GAP_2 = 340
GAP_3 = 180
OUTER_PAD = 40

STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"]
DONUT_STYLE_IDS = ["hb", "fb", "hn", "fn"]


def rect(x: float, y: float, w: float, h: float) -> str:
    if w <= 0 or h <= 0:
        return ""
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="currentColor"/>'


def wrap(parts: list[str]) -> str:
    body = "".join(p for p in parts if p)
    return (
        f'<svg width="100" height="100" viewBox="0 0 {W} {H}" fill="none" '
        f'xmlns="http://www.w3.org/2000/svg">{body}</svg>\n'
    )


def polar(cx: float, cy: float, radius: float, deg: float) -> tuple[float, float]:
    rad = math.radians(deg)
    return cx + radius * math.cos(rad), cy + radius * math.sin(rad)


def donut_full_path(cx: float, cy: float, outer_r: float, inner_r: float) -> str:
    d = (
        f"M {cx:g} {cy-outer_r:g} "
        f"A {outer_r:g} {outer_r:g} 0 1 1 {cx:g} {cy+outer_r:g} "
        f"A {outer_r:g} {outer_r:g} 0 1 1 {cx:g} {cy-outer_r:g} Z "
        f"M {cx:g} {cy-inner_r:g} "
        f"A {inner_r:g} {inner_r:g} 0 1 0 {cx:g} {cy+inner_r:g} "
        f"A {inner_r:g} {inner_r:g} 0 1 0 {cx:g} {cy-inner_r:g} Z"
    )
    return f'<path d="{d}" fill="currentColor" fill-rule="evenodd"/>'


def donut_segment_path(cx: float, cy: float, outer_r: float, inner_r: float, start_deg: float, end_deg: float) -> str:
    if end_deg <= start_deg:
        return ""
    span = end_deg - start_deg
    if span >= 359.999:
        return donut_full_path(cx, cy, outer_r, inner_r)

    o0x, o0y = polar(cx, cy, outer_r, start_deg)
    o1x, o1y = polar(cx, cy, outer_r, end_deg)
    i0x, i0y = polar(cx, cy, inner_r, start_deg)
    i1x, i1y = polar(cx, cy, inner_r, end_deg)
    large = 1 if span > 180 else 0

    d = (
        f"M {o0x:g} {o0y:g} "
        f"A {outer_r:g} {outer_r:g} 0 {large} 1 {o1x:g} {o1y:g} "
        f"L {i1x:g} {i1y:g} "
        f"A {inner_r:g} {inner_r:g} 0 {large} 0 {i0x:g} {i0y:g} Z"
    )
    return f'<path d="{d}" fill="currentColor"/>'


def normalize_style_token(token: str) -> str | None:
    value = token.strip().lower()
    aliases = {
        "ghb": "ghb",
        "gfb": "gfb",
        "nhb": "nhb",
        "nfb": "nfb",
        "ghn": "ghn",
        "gfn": "gfn",
        "nhn": "nhn",
        "nfn": "nfn",
        "gap": "ghb",
        "sh": "nhb",
        "sf": "nfb",
        "gf": "gfb",
        "gap-nb": "ghn",
        "gap-full-nb": "gfn",
        "nogap-nb": "nhn",
        "nogap-full-nb": "nfn",
    }
    return aliases.get(value)


def parse_styles_arg(raw: str) -> list[tuple[int, str]]:
    out = []
    seen = set()
    for token in [t.strip() for t in raw.split(",") if t.strip()]:
        t = token.lower()
        if t == "all":
            for lanes in (1, 2, 3):
                for style in STYLE_IDS:
                    key = (lanes, style)
                    if key not in seen:
                        out.append(key)
                        seen.add(key)
            continue
        if t in {"1", "2", "3"}:
            lanes = int(t)
            for style in STYLE_IDS:
                key = (lanes, style)
                if key not in seen:
                    out.append(key)
                    seen.add(key)
            continue

        # explicit "<lanes>-<style>"
        if "-" in t:
            p0, p1 = t.split("-", 1)
            if p0 in {"1", "2", "3"}:
                style = normalize_style_token(p1)
                if not style:
                    raise ValueError(f"unknown style token: {token}")
                key = (int(p0), style)
                if key not in seen:
                    out.append(key)
                    seen.add(key)
                continue

        # default to 1-lane if only style id provided
        style = normalize_style_token(t)
        if style:
            key = (1, style)
            if key not in seen:
                out.append(key)
                seen.add(key)
            continue

        raise ValueError(f"unknown style token: {token}")
    return out


def lane_bounds(lanes: int, with_gap: bool, full_mode: bool) -> list[tuple[int, int]]:
    if lanes == 1:
        if full_mode:
            return [(0, H)]
        return [(1, H - 1)]

    tweak = 2 if full_mode else 0
    bounds = []
    if with_gap:
        if lanes == 2:
            gap = GAP_2
        elif lanes == 3:
            gap = GAP_3
        else:
            raise ValueError(f"unsupported lanes for gap style: {lanes}")
        lane_h = (H - (lanes - 1) * gap) // lanes
        step = lane_h + gap
        for i in range(lanes):
            y0 = i * step + i * tweak
            y1 = y0 + lane_h if i < lanes - 1 else H
            bounds.append((y0, y1))
    else:
        lane_h = (H + (lanes - 1) * STROKE) // lanes
        step = lane_h - STROKE
        for i in range(lanes):
            y0 = i * step + i * tweak
            y1 = y0 + lane_h if i < lanes - 1 else H
            bounds.append((y0, y1))
    return bounds


def draw_h_borders(x0: float, x1: float, bounds: list[tuple[int, int]]) -> list[str]:
    # Draw each horizontal border position once to keep shared/no-gap lines
    # same thickness as non-shared lines.
    ys = set()
    for y0, y1 in bounds:
        ys.add(y0)
        ys.add(y1 - STROKE)
    return [rect(x0, y, x1 - x0, STROKE) for y in sorted(ys)]


def level_width(level: int, available_width: float, levels_max: int) -> float:
    if level <= 0:
        return 0
    if level >= levels_max:
        return available_width
    return (available_width * level) / float(levels_max)


def write_file(name: str, parts: list[str]) -> None:
    (OUT_DIR / name).write_text(wrap(parts), encoding="utf-8")


def state_iter(lanes: int):
    if lanes == 1:
        for a in range(BAR1_LEVELS + 1):
            yield (a,), f"{a:02d}"
        return
    if lanes == 2:
        for a in range(LEVELS + 1):
            for b in range(LEVELS + 1):
                yield (a, b), f"{a}{b}"
        return
    if lanes == 3:
        for a in range(LEVELS + 1):
            for b in range(LEVELS + 1):
                for c in range(LEVELS + 1):
                    yield (a, b, c), f"{a}{b}{c}"
        return
    raise ValueError(f"unsupported lanes: {lanes}")


def style_props(style_id: str):
    with_gap = style_id[0] == "g"
    full_mode = style_id[1] == "f"
    with_border = style_id[2] == "b"
    return with_gap, full_mode, with_border


def generate_donut2() -> None:
    cy = H / 2.0

    # Base progress ring (thick, indicates fill).
    base_fill_outer = 1160
    base_fill_inner = 760
    border_w = 36

    start_deg = -90.0
    right_half = (-90.0, 90.0)
    left_half = (90.0, 270.0)

    def side_fill_interval(side: str, progress_end: float):
        if side == "r":
            s = right_half[0]
            e = min(progress_end, right_half[1])
            if e <= s:
                return None
            return (s, e)
        s = left_half[0]
        e = min(progress_end, left_half[1])
        if e <= s:
            return None
        return (s, e)

    for style in DONUT_STYLE_IDS:
        with_border = style[1] == "b"
        full_mode = style[0] == "f"
        # Tiny full/H difference to prevent SVG dedupe during icon build.
        style_bias = 1 if full_mode else 0
        fill_outer = base_fill_outer + style_bias
        fill_inner = base_fill_inner + style_bias
        outer_border_outer = fill_outer + border_w
        outer_border_inner = fill_outer
        inner_border_outer = fill_inner
        inner_border_inner = max(1, fill_inner - border_w)

        for level in range(DONUT_LEVELS + 1):
            progress_end = start_deg + (360.0 * level / DONUT_LEVELS)
            lvl = f"{level:02d}"

            for side in ("l", "r"):
                cx = W if side == "l" else 0
                parts = []

                if with_border:
                    half = left_half if side == "l" else right_half
                    parts.append(
                        donut_segment_path(
                            cx, cy, outer_border_outer, outer_border_inner, half[0], half[1]
                        )
                    )
                    parts.append(
                        donut_segment_path(
                            cx, cy, inner_border_outer, inner_border_inner, half[0], half[1]
                        )
                    )

                interval = side_fill_interval(side, progress_end)
                if interval:
                    parts.append(
                        donut_segment_path(
                            cx, cy, fill_outer, fill_inner, interval[0], interval[1]
                        )
                    )

                write_file(f"donut2_{style}_{side}_{lvl}.svg", parts)


def main() -> int:
    global OUT_DIR
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--styles",
        default="all",
        help="comma-separated: all,1,2,3,1-ghb,2-nhn,...",
    )
    parser.add_argument(
        "--out-dir",
        default=str(DEFAULT_OUT_DIR),
        help="destination directory for generated SVG glyphs",
    )
    args = parser.parse_args()

    try:
        targets = parse_styles_arg(args.styles)
    except ValueError as exc:
        print(f"error: {exc}")
        return 2

    OUT_DIR = Path(args.out_dir).expanduser().resolve()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("bar*.svg"):
        old.unlink()
    for old in OUT_DIR.glob("donut*.svg"):
        old.unlink()

    variants = {
        "m": {"left_cap": False, "right_cap": False},
        "l": {"left_cap": True, "right_cap": False},
        "r": {"left_cap": False, "right_cap": True},
        "s": {"left_cap": True, "right_cap": True},
    }

    for lanes, style_id in targets:
        with_gap, full_mode, with_border = style_props(style_id)
        bounds = lane_bounds(lanes, with_gap, full_mode)
        prefix = f"bar{lanes}_{style_id}"

        for levels, state in state_iter(lanes):
            for variant, flags in variants.items():
                x0 = OUTER_PAD if flags["left_cap"] else 0
                x1 = W - OUTER_PAD if flags["right_cap"] else W

                parts = []
                if with_border:
                    parts.extend(draw_h_borders(x0, x1, bounds))

                x_fill = x0
                fill_w = x1 - x0
                if with_border and flags["left_cap"]:
                    for y0, y1 in bounds:
                        parts.append(rect(x0, y0, STROKE, y1 - y0))
                    x_fill += STROKE
                    fill_w -= STROKE
                if with_border and flags["right_cap"]:
                    for y0, y1 in bounds:
                        parts.append(rect(x1 - STROKE, y0, STROKE, y1 - y0))
                    fill_w -= STROKE

                full_nb_bias = 1 if (full_mode and not with_border) else 0
                for lane_idx, level in enumerate(levels):
                    lane_levels_max = BAR1_LEVELS if lanes == 1 else LEVELS
                    y0, y1 = bounds[lane_idx]
                    if with_border:
                        fill_y = y0 + STROKE
                        fill_h = (y1 - STROKE) - fill_y
                    else:
                        fill_y = y0
                        fill_h = y1 - y0
                        if full_nb_bias:
                            # Keep full/no-border SVGs distinct from H/no-border
                            # so icon-font dedupe cannot alias style families.
                            fill_h += full_nb_bias
                            max_h = H - fill_y
                            if fill_h > max_h:
                                fill_h = max_h
                    parts.append(rect(x_fill, fill_y, level_width(level, fill_w, lane_levels_max), fill_h))

                write_file(f"{prefix}_{variant}_{state}.svg", parts)

    generate_donut2()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
