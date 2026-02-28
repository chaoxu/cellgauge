#!/usr/bin/env python3
"""
Align CellGauge chart glyphs to Menlo metrics and remap glyph cmap entries.

Usage:
  python align_to_menlo_capheight.py <chart_font_ttf>
"""

import re
import sys
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

LEVELS = 8
STRIDE = LEVELS + 1
BAR1_LEVELS = 16
BAR1_STRIDE = BAR1_LEVELS + 1
DONUT_LEVELS = 32

BAR_VARIANTS = ["l", "m", "r", "s"]
BAR_VARIANT_INDEX = {v: i for i, v in enumerate(BAR_VARIANTS)}
BAR_STYLE_IDS = ["ghb", "gfb", "nhb", "nfb", "ghn", "gfn", "nhn", "nfn"]
BAR_STYLE_INDEX = {s: i for i, s in enumerate(BAR_STYLE_IDS)}

DONUT_STYLES = ["hb", "fb", "hn", "fn"]
DONUT_STYLE_INDEX = {s: i for i, s in enumerate(DONUT_STYLES)}
DONUT_SIDES = ["l", "r"]
DONUT_SIDE_INDEX = {s: i for i, s in enumerate(DONUT_SIDES)}

BAR1_BASE = 0x10FA20
BAR1_STYLE_BLOCK = len(BAR_VARIANTS) * BAR1_STRIDE  # 68
BAR2_BASE = 0x10F000
BAR2_STYLE_BLOCK = len(BAR_VARIANTS) * (STRIDE * STRIDE)  # 324
BAR3_BASE = 0x100000
BAR3_STYLE_BLOCK = len(BAR_VARIANTS) * (STRIDE * STRIDE * STRIDE)  # 2916

DONUT_STATES = DONUT_LEVELS + 1  # 33
DONUT2_BASE = 0x10FE20
DONUT2_STYLE_BLOCK = len(DONUT_SIDES) * DONUT_STATES  # 66

# Keep a small horizontal overlap between adjacent glyph cells to reduce
# subpixel hairline seams in terminal rendering.
BAR_JOIN_OVERLAP_RATIO = 0.06
DONUT_JOIN_OVERLAP_RATIO = 0.04
# Expand internal/right bar glyph outlines slightly so adjacent cells
# overlap instead of merely touching (or gapping) after placement.
BAR_JOIN_X_STRETCH_MIN = 1.0 + BAR_JOIN_OVERLAP_RATIO

# Temporary BMP codepoints used during fantasticon compile.
TMP_BAR1_BASE = 0x7B00
TMP_BAR2_BASE = 0x7000
TMP_BAR3_BASE = 0x1000
TMP_DONUT2_BASE = 0x7E20

FONT_FAMILY = "CellGauge Symbols"
FONT_SUBFAMILY = "Regular"
FONT_FULL_NAME = f"{FONT_FAMILY} {FONT_SUBFAMILY}"
FONT_PS_NAME = "CellGaugeSymbols-Regular"
FONT_UNIQUE_ID = f"{FONT_FULL_NAME};{FONT_PS_NAME}"


def apply_transform(glyf_table, glyph_name, transform):
    src = glyf_table[glyph_name]
    pen = TTGlyphPen(glyf_table)
    tpen = TransformPen(pen, transform)
    src.draw(tpen, glyf_table)
    glyf_table[glyph_name] = pen.glyph()


def recalc_bounds(glyf_table, glyph_name):
    g = glyf_table[glyph_name]
    g.recalcBounds(glyf_table)
    return g


def fit_x_bounds(glyf_table, glyph_name, x_min_target, x_max_target):
    g = recalc_bounds(glyf_table, glyph_name)
    old_min = float(g.xMin)
    old_max = float(g.xMax)
    old_w = old_max - old_min
    new_w = float(x_max_target) - float(x_min_target)
    if old_w <= 0 or new_w <= 0:
        return
    sx = new_w / old_w
    tx = float(x_min_target) - (sx * old_min)
    apply_transform(glyf_table, glyph_name, (sx, 0, 0, 1, tx, 0))


def set_font_names(ttfont):
    name_table = ttfont["name"]
    records = (
        (1, FONT_FAMILY),
        (2, FONT_SUBFAMILY),
        (3, FONT_UNIQUE_ID),
        (4, FONT_FULL_NAME),
        (6, FONT_PS_NAME),
        (16, FONT_FAMILY),
        (17, FONT_SUBFAMILY),
    )
    # Write both Windows and Mac name records for broad compatibility.
    for name_id, value in records:
        name_table.setName(value, name_id, 3, 1, 0x409)
        name_table.setName(value, name_id, 1, 0, 0)


def parse_shape_name(name):
    m = re.match(r"^bar1_([gn][hf][bn])_([lmrs])_([0-9]{2})$", name)
    if m:
        level = int(m.group(3))
        if level > BAR1_LEVELS:
            return None
        return {
            "family": "bar1",
            "style": m.group(1),
            "variant": m.group(2),
            "levels": (level,),
        }

    m = re.match(r"^bar2_([gn][hf][bn])_([lmrs])_([0-8])([0-8])$", name)
    if m:
        return {
            "family": "bar2",
            "style": m.group(1),
            "variant": m.group(2),
            "levels": (int(m.group(3)), int(m.group(4))),
        }

    m = re.match(r"^bar3_([gn][hf][bn])_([lmrs])_([0-8])([0-8])([0-8])$", name)
    if m:
        return {
            "family": "bar3",
            "style": m.group(1),
            "variant": m.group(2),
            "levels": (int(m.group(3)), int(m.group(4)), int(m.group(5))),
        }

    m = re.match(r"^donut2_([hf][bn])_([lr])_([0-9]{2})$", name)
    if m:
        return {
            "family": "donut2",
            "style": m.group(1),
            "variant": m.group(2),
            "levels": (int(m.group(3)),),
        }

    return None


def codepoint_for_info(info):
    family = info["family"]

    if family == "bar1":
        style_idx = BAR_STYLE_INDEX[info["style"]]
        variant_idx = BAR_VARIANT_INDEX[info["variant"]]
        style_base = BAR1_BASE + style_idx * BAR1_STYLE_BLOCK
        state_idx = info["levels"][0]
        return style_base + variant_idx * BAR1_STRIDE + state_idx

    if family == "bar2":
        style_idx = BAR_STYLE_INDEX[info["style"]]
        variant_idx = BAR_VARIANT_INDEX[info["variant"]]
        states = STRIDE * STRIDE
        style_base = BAR2_BASE + style_idx * BAR2_STYLE_BLOCK
        state_idx = info["levels"][0] * STRIDE + info["levels"][1]
        return style_base + variant_idx * states + state_idx

    if family == "bar3":
        style_idx = BAR_STYLE_INDEX[info["style"]]
        variant_idx = BAR_VARIANT_INDEX[info["variant"]]
        states = STRIDE * STRIDE * STRIDE
        style_base = BAR3_BASE + style_idx * BAR3_STYLE_BLOCK
        state_idx = info["levels"][0] * STRIDE * STRIDE + info["levels"][1] * STRIDE + info["levels"][2]
        return style_base + variant_idx * states + state_idx

    # donut2
    style_idx = DONUT_STYLE_INDEX[info["style"]]
    side_idx = DONUT_SIDE_INDEX[info["variant"]]
    style_base = DONUT2_BASE + style_idx * DONUT2_STYLE_BLOCK
    return style_base + side_idx * DONUT_STATES + info["levels"][0]


def info_from_temp_codepoint(cp):
    bar3_span = len(BAR_STYLE_IDS) * BAR3_STYLE_BLOCK
    if TMP_BAR3_BASE <= cp < TMP_BAR3_BASE + bar3_span:
        off = cp - TMP_BAR3_BASE
        style_idx = off // BAR3_STYLE_BLOCK
        rem = off % BAR3_STYLE_BLOCK
        states = STRIDE * STRIDE * STRIDE
        variant_idx = rem // states
        state_idx = rem % states
        a = state_idx // (STRIDE * STRIDE)
        b = (state_idx // STRIDE) % STRIDE
        c = state_idx % STRIDE
        return {
            "family": "bar3",
            "style": BAR_STYLE_IDS[style_idx],
            "variant": BAR_VARIANTS[variant_idx],
            "levels": (a, b, c),
        }

    bar2_span = len(BAR_STYLE_IDS) * BAR2_STYLE_BLOCK
    if TMP_BAR2_BASE <= cp < TMP_BAR2_BASE + bar2_span:
        off = cp - TMP_BAR2_BASE
        style_idx = off // BAR2_STYLE_BLOCK
        rem = off % BAR2_STYLE_BLOCK
        states = STRIDE * STRIDE
        variant_idx = rem // states
        state_idx = rem % states
        a = state_idx // STRIDE
        b = state_idx % STRIDE
        return {
            "family": "bar2",
            "style": BAR_STYLE_IDS[style_idx],
            "variant": BAR_VARIANTS[variant_idx],
            "levels": (a, b),
        }

    bar1_span = len(BAR_STYLE_IDS) * BAR1_STYLE_BLOCK
    if TMP_BAR1_BASE <= cp < TMP_BAR1_BASE + bar1_span:
        off = cp - TMP_BAR1_BASE
        style_idx = off // BAR1_STYLE_BLOCK
        rem = off % BAR1_STYLE_BLOCK
        variant_idx = rem // BAR1_STRIDE
        level = rem % BAR1_STRIDE
        return {
            "family": "bar1",
            "style": BAR_STYLE_IDS[style_idx],
            "variant": BAR_VARIANTS[variant_idx],
            "levels": (level,),
        }

    donut_span = len(DONUT_STYLES) * DONUT2_STYLE_BLOCK
    if TMP_DONUT2_BASE <= cp < TMP_DONUT2_BASE + donut_span:
        off = cp - TMP_DONUT2_BASE
        style_idx = off // DONUT2_STYLE_BLOCK
        rem = off % DONUT2_STYLE_BLOCK
        side_idx = rem // DONUT_STATES
        level = rem % DONUT_STATES
        return {
            "family": "donut2",
            "style": DONUT_STYLES[style_idx],
            "variant": DONUT_SIDES[side_idx],
            "levels": (level,),
        }

    return None


def level_maxima(names, info_by_name):
    if not names:
        return ()
    dims = len(info_by_name[names[0]]["levels"])
    out = [0] * dims
    for name in names:
        levels = info_by_name[name]["levels"]
        for i, value in enumerate(levels):
            if value > out[i]:
                out[i] = value
    return tuple(out)


def pick_representative(names, info_by_name, variant):
    if not names:
        return None
    hi = level_maxima(names, info_by_name)
    lo = tuple(0 for _ in hi)
    for levels in (hi, lo):
        for name in names:
            info = info_by_name[name]
            if info["variant"] == variant and info["levels"] == levels:
                return name
    for name in names:
        if info_by_name[name]["variant"] == variant:
            return name
    return None


def align_group(glyf, hmtx, names, info_by_name, target_y_min, target_h, target_aw, family):
    if not names:
        return

    preferred_variant = "m" if family.startswith("bar") else "l"
    ref_name = pick_representative(names, info_by_name, preferred_variant) or names[0]

    ref = recalc_bounds(glyf, ref_name)
    cur_h = float(ref.yMax - ref.yMin)
    if cur_h <= 0:
        return

    sy = target_h / cur_h
    if family.startswith("bar"):
        for name in names:
            apply_transform(glyf, name, (1, 0, 0, sy, 0, 0))
    else:
        # Donuts must preserve circular shape; use uniform scaling.
        for name in names:
            apply_transform(glyf, name, (sy, 0, 0, sy, 0, 0))

    ref = recalc_bounds(glyf, ref_name)
    dy = target_y_min - ref.yMin
    for name in names:
        apply_transform(glyf, name, (1, 0, 0, 1, 0, dy))
        aw, _ = hmtx[name]
        if family.startswith("bar"):
            g = recalc_bounds(glyf, name)
            hmtx[name] = (aw, int(round(g.xMin)))
        else:
            hmtx[name] = (aw, 0)

    aw_i = int(round(target_aw))
    bar_join_overlap = max(1, int(round(target_aw * BAR_JOIN_OVERLAP_RATIO)))
    donut_join_overlap = max(1, int(round(target_aw * DONUT_JOIN_OVERLAP_RATIO)))

    if family.startswith("bar"):
        ref_aw, _ = hmtx[ref_name]
        if ref_aw > 0:
            sx = target_aw / float(ref_aw)
            for name in names:
                apply_transform(glyf, name, (sx, 0, 0, 1, 0, 0))
                g = recalc_bounds(glyf, name)
                hmtx[name] = (int(round(target_aw)), int(round(g.xMin)))

        # Increase x-span for join-bearing variants; this creates true overlap
        # at m->m and m->r boundaries after the translation step below.
        stretch = BAR_JOIN_X_STRETCH_MIN
        rep_m = pick_representative(names, info_by_name, "m")
        if rep_m:
            rg = recalc_bounds(glyf, rep_m)
            rw = float(rg.xMax - rg.xMin)
            desired_w = float(aw_i + bar_join_overlap)
            if rw > 0 and desired_w > 0:
                stretch = max(stretch, desired_w / rw)
        for name in names:
            v = info_by_name[name]["variant"]
            if v not in ("m", "r"):
                continue
            g = recalc_bounds(glyf, name)
            if getattr(g, "numberOfContours", 0) == 0:
                continue
            apply_transform(glyf, name, (stretch, 0, 0, 1, 0, 0))
            g = recalc_bounds(glyf, name)
            hmtx[name] = (aw_i, int(round(g.xMin)))

        rep_l = pick_representative(names, info_by_name, "l")
        rep_r = pick_representative(names, info_by_name, "r")
        left_pad = 0
        right_pad = 0
        if rep_l:
            g = recalc_bounds(glyf, rep_l)
            left_pad = max(0, int(round(g.xMin)))
        if rep_r:
            g = recalc_bounds(glyf, rep_r)
            right_pad = max(0, aw_i - int(round(g.xMax)))

        for name in names:
            v = info_by_name[name]["variant"]
            g = recalc_bounds(glyf, name)
            if getattr(g, "numberOfContours", 0) == 0:
                hmtx[name] = (aw_i, 0)
                continue

            if v == "m":
                dx = -bar_join_overlap - g.xMin
            elif v == "l":
                dx = left_pad - g.xMin
            elif v == "r":
                dx = (aw_i - right_pad) - g.xMax
            else:  # s
                dx = left_pad - g.xMin

            apply_transform(glyf, name, (1, 0, 0, 1, dx, 0))
            g = recalc_bounds(glyf, name)
            hmtx[name] = (aw_i, int(round(g.xMin)))
        return

    # Donut: normalize horizontal size so full two-cell width ~= target height.
    rep_l = pick_representative(names, info_by_name, "l")
    rep_r = pick_representative(names, info_by_name, "r")
    widths = []
    for rep in (rep_l, rep_r):
        if rep:
            rg = recalc_bounds(glyf, rep)
            if getattr(rg, "numberOfContours", 0) > 0:
                widths.append(float(rg.xMax - rg.xMin))
    if widths:
        cur_half = max(widths)
        desired_half = target_h / 2.0
        if cur_half > 0 and desired_half > 0:
            sx = desired_half / cur_half
            for name in names:
                apply_transform(glyf, name, (sx, 0, 0, 1, 0, 0))

    # donut2: translate only (no x-scaling) so tiny segments don't stretch.
    for name in names:
        g = recalc_bounds(glyf, name)
        if getattr(g, "numberOfContours", 0) == 0:
            hmtx[name] = (aw_i, 0)
            continue

        v = info_by_name[name]["variant"]
        if v == "l":
            dx = (aw_i + donut_join_overlap) - g.xMax
        else:  # r
            dx = -donut_join_overlap - g.xMin

        apply_transform(glyf, name, (1, 0, 0, 1, dx, 0))
        g = recalc_bounds(glyf, name)
        hmtx[name] = (aw_i, int(round(g.xMin)))


def main():
    if len(sys.argv) != 2:
        print("usage: align_to_menlo_capheight.py <icon_font_ttf>", file=sys.stderr)
        return 2

    icon_path = sys.argv[1]
    menlo_path = "/System/Library/Fonts/Menlo.ttc"
    icon_font = TTFont(icon_path)
    menlo_font = TTFont(menlo_path, fontNumber=0)

    menlo_glyf = menlo_font["glyf"]
    menlo_cmap = menlo_font["cmap"].getBestCmap()
    menlo_h_name = menlo_cmap.get(ord("H"))
    if not menlo_h_name:
        print("Menlo 'H' glyph not found", file=sys.stderr)
        return 1

    menlo_h = menlo_glyf[menlo_h_name]
    menlo_h.recalcBounds(menlo_glyf)
    menlo_advance, _ = menlo_font["hmtx"][menlo_h_name]

    icon_upm = float(icon_font["head"].unitsPerEm)
    menlo_upm = float(menlo_font["head"].unitsPerEm)

    h_y_min = (menlo_h.yMin / menlo_upm) * icon_upm
    h_y_max = (menlo_h.yMax / menlo_upm) * icon_upm
    h_target_h = h_y_max - h_y_min

    menlo_block_name = menlo_cmap.get(0x2588)
    if menlo_block_name:
        menlo_block = menlo_glyf[menlo_block_name]
        menlo_block.recalcBounds(menlo_glyf)
        full_y_min = (menlo_block.yMin / menlo_upm) * icon_upm
        full_y_max = (menlo_block.yMax / menlo_upm) * icon_upm
    else:
        full_y_min = h_y_min
        full_y_max = h_y_max
    full_target_h = full_y_max - full_y_min

    os2 = icon_font["OS/2"]
    if hasattr(os2, "sCapHeight"):
        os2.sCapHeight = int(round(h_y_max))
    if hasattr(os2, "sxHeight"):
        os2.sxHeight = int(round(h_y_max * 0.75))

    glyf = icon_font["glyf"]
    hmtx = icon_font["hmtx"]
    old_cmap = icon_font["cmap"].getBestCmap()

    # Normalize user-facing font naming.
    set_font_names(icon_font)

    info_by_name = {}
    for name in glyf.keys():
        info = parse_shape_name(name)
        if info:
            info_by_name[name] = info

    shape_names = list(info_by_name.keys())
    if shape_names:
        target_aw = (float(menlo_advance) / menlo_upm) * icon_upm
        grouped = {}
        for name, info in info_by_name.items():
            grouped.setdefault((info["family"], info["style"]), []).append(name)

        for (family, style), names in grouped.items():
            if family == "donut2":
                is_full = style[0] == "f"
            else:
                is_full = style[1] == "f"

            if is_full:
                align_group(glyf, hmtx, names, info_by_name, full_y_min, full_target_h, target_aw, family)
            else:
                align_group(glyf, hmtx, names, info_by_name, h_y_min, h_target_h, target_aw, family)

    full_cmap = {}
    for cp, gname in old_cmap.items():
        info = info_from_temp_codepoint(cp)
        if info:
            full_cmap[codepoint_for_info(info)] = gname
            continue
        full_cmap[cp] = gname
    full_cmap = dict(sorted(full_cmap.items(), key=lambda item: item[0]))

    cmap_table = newTable("cmap")
    cmap_table.tableVersion = 0
    cmap_table.tables = []

    subtable_12 = CmapSubtable.newSubtable(12)
    subtable_12.platformID = 3
    subtable_12.platEncID = 10
    subtable_12.language = 0
    subtable_12.cmap = full_cmap
    cmap_table.tables.append(subtable_12)

    bmp_cmap = {cp: gname for cp, gname in full_cmap.items() if cp <= 0xFFFF}
    if bmp_cmap:
        subtable_4 = CmapSubtable.newSubtable(4)
        subtable_4.platformID = 3
        subtable_4.platEncID = 1
        subtable_4.language = 0
        subtable_4.cmap = bmp_cmap
        cmap_table.tables.append(subtable_4)

    icon_font["cmap"] = cmap_table

    icon_font.save(icon_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
