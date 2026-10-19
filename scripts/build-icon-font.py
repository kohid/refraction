#!/usr/bin/env python3
"""
Rebuilds the Refraction icon font brand glyphs and writes the font files.

    python3 scripts/build-icon-font.py            (needs: pip install fonttools brotli shapely)

Input and output: assets/lib/rficons/fonts/rficons.{ttf,woff,woff2} and assets/lib/rficons/rficons.json.

The icon set is the third-party icon font that the upstream project shipped (GPL-3.0-or-later). Only the
brand glyphs are replaced here by an original Refraction mark (a prism splitting a beam into three rays):

    refraction         the bare mark
    refraction-circle  the mark knocked out of a disc   (the circle glyph also serves refraction-square)
    refraction-square  same codepoint as the circle glyph, the CSS draws it in a rounded square

The upstream company-logo glyph ("pojome") is emptied. The script is re-runnable: it renames the old glyph names if it
still finds them and always redraws the brand glyphs from the geometry below.
"""
import json
import os
import sys

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from shapely.geometry import LineString, Point, Polygon, box
from shapely.affinity import scale as shp_scale, translate
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIR = os.path.join(ROOT, 'assets', 'lib', 'rficons')
TTF = os.path.join(DIR, 'fonts', 'rficons.ttf')
JSON_PATH = os.path.join(DIR, 'rficons.json')
FAMILY = 'rficons'

ASCENT = 850   # font units: the 1000 x 1000 design box runs from y = 850 (top) to y = -150
SIZE = 1000

# ---------------------------------------------------------------------------------------------- geometry
# Design grid is 100 x 100 (y down): an equilateral prism, one beam in on the left, three rays out on the right.
PRISM = [(40, 12), (66, 57), (14, 57)]
BEAM_IN = [(2, 50), (24.6, 39.4)]
RAYS_OUT = [[(52.1, 33), (90, 16)], [(57.6, 42.5), (92, 42.5)], [(63.1, 52), (90, 69)]]
RING_W = 8.0
RAY_W = 6.0


def mark(res=16):
    tri = Polygon(PRISM)
    ring = tri.buffer(RING_W / 2, join_style=1, resolution=res).difference(tri.buffer(-RING_W / 2, join_style=1, resolution=res))
    lines = [LineString(BEAM_IN)] + [LineString(r) for r in RAYS_OUT]
    parts = [ring] + [l.buffer(RAY_W / 2, cap_style=1, resolution=res) for l in lines]
    return unary_union(parts)


def fit(geom, size, cx, cy):
    """Scale geometry (y down) so its bounding box fits `size` wide/tall, centred at (cx, cy)."""
    minx, miny, maxx, maxy = geom.bounds
    s = size / max(maxx - minx, maxy - miny)
    g = translate(geom, -(minx + maxx) / 2, -(miny + maxy) / 2)
    g = shp_scale(g, s, s, origin=(0, 0))
    return translate(g, cx, cy)


def glyph_shapes():
    bare = fit(mark(), 960, SIZE / 2, SIZE / 2)
    knock = fit(mark(), 700, SIZE / 2, SIZE / 2)
    disc = Point(SIZE / 2, SIZE / 2).buffer(SIZE / 2, resolution=48).difference(knock)
    sq = box(0, 0, SIZE, SIZE).buffer(-190).buffer(190, resolution=24).difference(knock)
    return {'refraction': bare, 'refraction-circle': disc, 'refraction-square': sq}


def polys(g):
    return list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]


def svg_path(g):
    """SVG path data in y-down design box coordinates (the format rficons.json uses)."""
    out = []
    for p in polys(g):
        for ring in [p.exterior] + list(p.interiors):
            pts = list(ring.coords)[:-1]
            out.append('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z')
    return ''.join(out)


def draw(g):
    pen = TTGlyphPen(None)
    for p in polys(g):
        p = orient(p, sign=1.0)  # y-up after the flip below: exterior counter-clockwise becomes clockwise (TrueType outer)
        for ring_i, ring in enumerate([p.exterior] + list(p.interiors)):
            pts = [(round(x), round(ASCENT - y)) for x, y in list(ring.coords)[:-1]]
            pen.moveTo(pts[0])
            for pt in pts[1:]:
                pen.lineTo(pt)
            pen.closePath()
    return pen.glyph()


def main():
    font = TTFont(TTF)
    cmap = font.getBestCmap()
    # The glyphs are located by codepoint, not by name: the post table is written without glyph names (format 3), so the
    # upstream product name is not embedded in the font and the script keeps working on its own output.
    codepoints = {'refraction': 0xE812, 'refraction-circle': 0xE813}
    shapes = glyph_shapes()
    glyf, hmtx = font['glyf'], font['hmtx']
    for name, cp in codepoints.items():
        gname = cmap[cp]
        glyf[gname] = draw(shapes[name])
        glyf[gname].recalcBounds(glyf)
        hmtx[gname] = (SIZE, glyf[gname].xMin)
    # empty the upstream company-logo glyph (U+E814)
    if 0xE814 in cmap:
        glyf[cmap[0xE814]] = TTGlyphPen(None).glyph()
        hmtx[cmap[0xE814]] = (SIZE, 0)
    font['post'].formatType = 3.0
    # names
    for rec in font['name'].names:
        if rec.nameID in (1, 3, 4, 6):
            rec.string = FAMILY
        elif rec.nameID == 10:
            rec.string = 'Icon font for Refraction. Generated by scripts/build-icon-font.py from the upstream icon glyph set (GPL-3.0-or-later).'
    font['head'].fontRevision = 1.0
    font.save(TTF)

    base = TTF[:-4]
    for flavor, ext in (('woff', 'woff'), ('woff2', 'woff2')):
        f = TTFont(TTF)
        f.flavor = flavor
        f.save(f'{base}.{ext}')

    # manifest used by the front-end icon generator and the editor icon picker
    data = json.load(open(JSON_PATH))
    data.pop('pojome', None)
    for name, g in shapes.items():
        if name in data:  # refraction-square has no manifest entry of its own
            data[name] = {'path': svg_path(g), 'width': SIZE, 'height': SIZE}
    json.dump(data, open(JSON_PATH, 'w'), separators=(',', ':'))
    print('ok:', ', '.join(shapes))


if __name__ == '__main__':
    sys.exit(main())
