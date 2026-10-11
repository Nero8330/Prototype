#!/usr/bin/env python3
"""Split the commander illustration into Live2D-ready parts.

  python3 tools/build_parts.py

Reads source/commander.psd and writes
  build/parts/*.png      one cropped PNG per part (straight alpha)
  build/parts.json       part list: bbox, draw order, group, kind
  build/check_*.png      verification images

The source PSD keeps colours per material and a single line-art layer, which
cannot be rigged. This script
  * bakes clipped shading into each base colour layer,
  * splits hair into strands using the line art as cut lines,
  * splits skin into face / neck / shirt and pulls the aiguillette off the coat,
  * hands each line-art pixel to the top-most part it outlines,
  * paints hidden areas (face and hidden eye under the fringe, neck under the
    chin, back hair, coat under the aiguillette) that only show when parts move,
  * draws expression variants (closed / smiling eyes, mouths, blush, sweat).
At rest the parts recomposite to the original illustration.
"""
import json
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

import srcpsd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "source", "commander.psd")
OUT = os.path.join(ROOT, "build")

psd, (W, H), B = srcpsd.load(SRC)
YY, XX = np.mgrid[0:H, 0:W]
F32 = np.float32


# ------------------------------------------------------------------ helpers
def polymask(pts):
    im = Image.new("L", (W, H), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    return np.asarray(im) > 127


def disk(r):
    y, x = np.mgrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r + 0.5


def dilate(m, r):
    return ndi.binary_dilation(m, structure=disk(r)) if r > 0 else m


def erode(m, r):
    return ndi.binary_erosion(m, structure=disk(r)) if r > 0 else m


def masked(img, m):
    out = img.copy()
    out[..., 3] *= m.astype(F32) if m.dtype == bool else m
    return out


def solid(m, rgb, alpha=1.0):
    out = np.zeros((H, W, 4), F32)
    out[..., :3] = np.array(rgb, F32) / 255.0
    out[..., 3] = (m.astype(F32) if m.dtype == bool else m) * alpha
    return out


def over(*layers):
    acc = np.zeros((H, W, 4), F32)
    for l in layers:
        acc = srcpsd.over(acc, l)
    return acc


def median_rgb(img, m):
    return np.median(img[..., :3][m], axis=0) * 255.0


def mirror_x(img, axis):
    """Mirror a full-canvas layer about the vertical line x = axis."""
    out = np.zeros_like(img)
    src_x = np.round(2 * axis - np.arange(W)).astype(int)
    ok = (src_x >= 0) & (src_x < W)
    out[:, ok] = img[:, src_x[ok]]
    return out


def transform(img, M):
    """Affine warp (2x3 matrix mapping source -> destination) with straight alpha."""
    prem = img.copy()
    prem[..., :3] *= prem[..., 3:4]
    w = cv2.warpAffine(prem, M, (W, H), flags=cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    a = w[..., 3:4]
    w[..., :3] = np.where(a > 1e-4, w[..., :3] / np.maximum(a, 1e-4), 0)
    return w


class Pen:
    """Anti-aliased vector drawing (4x supersampled) onto a full-size RGBA layer."""
    S = 4

    def __init__(self):
        self.im = Image.new("RGBA", (W * self.S, H * self.S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def _p(self, pts):
        return [(x * self.S, y * self.S) for x, y in pts]

    def stroke(self, pts, widths, rgba, steps=6):
        """Tapered stroke: discs swept along a polyline, width interpolated per vertex."""
        s = self.S
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            w0, w1 = widths[i], widths[i + 1]
            n = max(2, int(math.hypot(x1 - x0, y1 - y0) * steps))
            for k in range(n + 1):
                t = k / n
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                r = (w0 + (w1 - w0) * t) * s / 2
                self.d.ellipse((x * s - r, y * s - r, x * s + r, y * s + r), fill=rgba)

    def poly(self, pts, rgba):
        self.d.polygon(self._p(pts), fill=rgba)

    def ellipse(self, cx, cy, rx, ry, rgba):
        s = self.S
        self.d.ellipse(((cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s), fill=rgba)

    def layer(self):
        im = self.im.resize((W, H), Image.LANCZOS)
        return np.asarray(im, F32) / 255.0


def bezier(p0, p1, p2, n=24):
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]))
    return pts


def taper(n, w_mid, w_end0, w_end1):
    out = []
    for i in range(n):
        t = i / (n - 1)
        w = w_end0 + (w_mid - w_end0) * min(1, t * 2.5) if t < 0.5 else \
            w_end1 + (w_mid - w_end1) * min(1, (1 - t) * 2.5)
        out.append(w)
    return out


# ------------------------------------------------------------------ source layers
HAT = B["レイヤー 10"]
HAIR = B["レイヤー 5"]
SKIN = B["レイヤー 6"]
COAT = B["レイヤー 7"]
HEM = B["レイヤー 8"]
PANTS = B["レイヤー 9"]
LINE = B["レイヤー 1"]
BROW = B["レイヤー 2"]
EYE_WHITE = B["レイヤー 19"]
IRIS = over(B["レイヤー 20"], B["レイヤー 22"], B["レイヤー 21"])
HIGHLIGHT = B["レイヤー 24"]
EYE_LINE = B["レイヤー 3"]
NOSE_MOUTH = B["レイヤー 4"]

INK = (0, 0, 0)
FACE_AXIS = 417.0          # vertical centre line of the face (nose / chin)
NECK_PIVOT = (418.0, 352.0)

# ------------------------------------------------------------------ hair strands
line_m = LINE[..., 3] > 0.25
hair_m = HAIR[..., 3] > 0.02
reg = (HAIR[..., 3] > 0.5) & ~line_m
lab, n = ndi.label(reg)
sizes = ndi.sum(reg, lab, range(1, n + 1))
cents = ndi.center_of_mass(reg, lab, range(1, n + 1))


def hair_part_of(cx, cy):
    if cy > 300:
        return "後ろ髪_房"
    if cx < 315:
        return "横髪_向かって左_外"
    if cx < 345:
        return "横髪_向かって左_内"
    if cx < 465:
        return "前髪"
    if cx < 515:
        return "横髪_向かって右_内"
    return "横髪_向かって右_外"


HAIR_PARTS = ["前髪", "横髪_向かって左_内", "横髪_向かって左_外",
              "横髪_向かって右_内", "横髪_向かって右_外", "後ろ髪_房"]
seed = np.zeros((H, W), np.int32)
for i in range(n):
    if sizes[i] > 150:
        cy, cx = cents[i]
        seed[lab == i + 1] = HAIR_PARTS.index(hair_part_of(cx, cy)) + 1
# every hair pixel (small slivers, colour under the ink) joins its nearest strand
_, (iy, ix) = ndi.distance_transform_edt(seed == 0, return_indices=True)
hair_owner = np.where(hair_m, seed[iy, ix], 0)

# ------------------------------------------------------------------ skin split
face_poly = polymask([(300, 150), (540, 150), (540, 300), (470, 322), (453, 331),
                      (418, 354), (380, 331), (300, 300)])
skin_m = SKIN[..., 3] > 0.02
rgb255 = SKIN[..., :3] * 255
skinlike = ((rgb255[..., 0] - rgb255[..., 2]) > 22) & (rgb255[..., 1] > 120) & (rgb255[..., 0] > 170)
face_m = skin_m & face_poly
neck_m = skin_m & ~face_poly & skinlike & (YY < 400)
neck_m = ndi.binary_opening(neck_m, structure=disk(1)) & skin_m
shirt_m = skin_m & ~face_m & ~neck_m

# ------------------------------------------------------------------ aiguillette
crgb = COAT[..., :3] * 255
gold = (crgb[..., 0] > 185) & (crgb[..., 1] > 145) & (crgb[..., 2] < 180) & \
       ((crgb[..., 0] - crgb[..., 2]) > 40)
aig_region = polymask([(170, 433), (284, 433), (284, 470), (264, 560), (234, 652), (170, 652)])
cords = (COAT[..., 3] > 0.5) & gold & aig_region & ~line_m
lab_c, nc = ndi.label(cords)
keep = np.zeros_like(cords)
for i, s in enumerate(ndi.sum(cords, lab_c, range(1, nc + 1))):
    if s > 30:
        keep |= lab_c == i + 1
aig_m = dilate(keep, 1) & (COAT[..., 3] > 0.02) & aig_region
coat_m = (COAT[..., 3] > 0.02) & ~aig_m

# ------------------------------------------------------------------ colour masks per part
color_parts = {
    "帽子": (HAT, HAT[..., 3] > 0.02),
    "顔": (SKIN, face_m),
    "首": (SKIN, neck_m),
    "襟_シャツ_ネクタイ": (SKIN, shirt_m),
    "飾緒": (COAT, aig_m),
    "上半身": (COAT, coat_m),
    "裾裏": (HEM, HEM[..., 3] > 0.02),
    "脚": (PANTS, PANTS[..., 3] > 0.02),
}
for i, name in enumerate(HAIR_PARTS):
    color_parts[name] = (HAIR, hair_owner == i + 1)

# Z rank used to decide which part owns an outline (higher = in front)
Z = {"帽子": 100, "前髪": 90, "横髪_向かって左_内": 86, "横髪_向かって左_外": 85,
     "横髪_向かって右_内": 84, "横髪_向かって右_外": 83, "顔": 70,
     "襟_シャツ_ネクタイ": 62, "首": 60, "後ろ髪_房": 55, "飾緒": 50,
     "上半身": 40, "裾裏": 35, "脚": 30}

# ------------------------------------------------------------------ line art ownership
ink = LINE[..., 3] > 0.0
best = np.full((H, W), -1, np.int32)
owner = np.full((H, W), "", object)
names = sorted(color_parts, key=lambda k: Z[k])
# reach of each part's outline beyond its colour fill (hair is kept tight so that
# collar lines crossing a strand tip stay on the collar)
REACH = {"帽子": 4, **{k: 2 for k in HAIR_PARTS}}
for name in names:  # ascending: later (higher Z) overwrite
    near = dilate(color_parts[name][1], REACH.get(name, 3)) & ink
    owner[near] = name
    best[near] = Z[name]
# ink far from every colour region -> nearest region
lab_all = np.zeros((H, W), np.int32)
for i, name in enumerate(names):
    lab_all[color_parts[name][1]] = i + 1
_, (jy, jx) = ndi.distance_transform_edt(lab_all == 0, return_indices=True)
lost = ink & (best < 0)
for i, name in enumerate(names):
    owner[lost & (lab_all[jy, jx] == i + 1)] = name

parts = {}
for name, (src, m) in color_parts.items():
    parts[name] = over(masked(src, m), masked(LINE, owner == name))

# ------------------------------------------------------------------ hidden areas
def cover_of(*layer_names, solid_only=True):
    """Combined coverage of the given parts stacked together at rest."""
    clear = np.ones((H, W), F32)
    for k in layer_names:
        clear *= 1 - parts[k][..., 3]
    a = 1 - clear
    return a > 0.99 if solid_only else a


hair_front = ["前髪", "横髪_向かって左_内", "横髪_向かって左_外",
              "横髪_向かって右_内", "横髪_向かって右_外"]

# face skin under the fringe / side hair / hat brim
head_oval = polymask([(342, 185), (492, 185), (497, 215), (492, 245), (486, 280), (474, 318),
                      (452, 329), (418, 348), (383, 329), (362, 318), (344, 292), (337, 240)])
lum = SKIN[..., :3].sum(-1)
face_rgb = median_rgb(SKIN, face_m & (lum >= np.percentile(lum[face_m], 70)))
hidden_face = head_oval & (cover_of("帽子", *hair_front, solid_only=False) > 0.5) & \
    (parts["顔"][..., 3] < 0.99)
parts["顔"] = over(solid(hidden_face, face_rgb), parts["顔"])

# neck under the chin
neck_rgb = median_rgb(SKIN, neck_m & (YY < 362))
under_chin = polymask([(382, 292), (452, 292), (452, 362), (382, 362)])
parts["首"] = over(solid(under_chin & cover_of("顔"), neck_rgb), parts["首"])

# back hair silhouette: shows only when the side hair swings away
head_sil = cover_of("帽子", *hair_front, "顔", solid_only=False) > 0.5
head_sil = ndi.binary_closing(head_sil, structure=disk(12)) & (YY > 150) & (YY < 352)
head_sil = ndi.binary_fill_holes(head_sil)
back_rgb = (74, 64, 64)
rest_cover = cover_of("帽子", *hair_front, "顔", "首", "襟_シャツ_ネクタイ", "上半身")
back_fill = erode(head_sil, 3) & rest_cover
parts["後ろ髪"] = over(solid(back_fill, back_rgb), parts.pop("後ろ髪_房"))
Z["後ろ髪"] = 55

# coat under the aiguillette: rebuild the sleeve silhouette, colour and outline
cord_any = parts["飾緒"][..., 3] > 0.05
hole = dilate(cord_any, 1) & aig_region
body = parts["上半身"]
sleeve = (body[..., 3] > 0.5) & ~hole
# the sleeve's outer (left) edge: measured on rows the cords leave intact,
# interpolated across rows where a cord loop hides it
rows = np.arange(H)
edge = np.full(H, np.nan)
known = np.zeros(H, bool)
for y in range(420, 660):
    xs = np.nonzero(sleeve[y, 150:320])[0]
    if len(xs) == 0:
        continue
    left = xs[0] + 150
    hx = np.nonzero(hole[y, 150:320])[0]
    if len(hx) and hx[0] + 150 <= left + 1:
        continue
    edge[y], known[y] = left, True
edge = np.interp(rows, rows[known], edge[known])
edge = ndi.uniform_filter1d(edge, 9)
inside = XX >= edge[:, None] - 0.5
sil = sleeve | (hole & inside)
valid = (COAT[..., 3] > 0.5) & ~hole & ~gold
_, (vy, vx) = ndi.distance_transform_edt(~valid, return_indices=True)
base = (COAT[..., :3][vy, vx] * 255).astype(np.uint8)        # nearest coat colour everywhere
base = cv2.inpaint(base, hole.astype(np.uint8) * 255, 5, cv2.INPAINT_NS)
fill = np.concatenate([base.astype(F32) / 255, np.ones((H, W, 1), F32)], -1)
outline = hole & inside & (XX < edge[:, None] + 2.0) & (parts["飾緒"][..., 3] > 0.9)
rebuilt = over(masked(fill, sil & hole), solid(outline, INK, 0.92))
# keep the cord's soft outer fringe see-through, as it was in the illustration
apply = hole & ((parts["飾緒"][..., 3] > 0.9) | (COAT[..., 3] > 0.95))
parts["上半身"] = np.where(apply[..., None], rebuilt, body)

# ------------------------------------------------------------------ face details
# eye line art = three strokes: crease (thin, top), upper lash (largest), lower lash
core, n3 = ndi.label(EYE_LINE[..., 3] > 0.15, structure=np.ones((3, 3)))
_, (ey, ex) = ndi.distance_transform_edt(core == 0, return_indices=True)
lab3 = np.where(EYE_LINE[..., 3] > 0, core[ey, ex], 0)
boxes = ndi.find_objects(core)
areas = ndi.sum(core > 0, core, range(1, n3 + 1))
lash_id = int(np.argmax(areas)) + 1
crease_id = min((i + 1 for i in range(n3) if i + 1 != lash_id), key=lambda i: boxes[i - 1][0].start)
lower_ids = [i + 1 for i in range(n3) if i + 1 not in (lash_id, crease_id)]
crease = masked(EYE_LINE, lab3 == crease_id)
# the iris outline is drawn in the same stroke as the lash; it has to travel with
# the iris when the eyes look around
iris_ring = (lab3 == lash_id) & dilate(IRIS[..., 3] > 0.3, 2) & (YY >= 247)
upper_lash = masked(EYE_LINE, (lab3 == lash_id) & ~iris_ring)
IRIS = over(IRIS, masked(EYE_LINE, iris_ring))
lower_lash = masked(EYE_LINE, np.isin(lab3, lower_ids))

nm_lab, _ = ndi.label(NOSE_MOUTH[..., 3] > 0.0, structure=np.ones((3, 3)))
nose = masked(NOSE_MOUTH, (nm_lab > 0) & (YY < 300))
mouth = masked(NOSE_MOUTH, (nm_lab > 0) & (YY >= 300))
mouth_rgb = (88, 58, 58)

eye = {
    "白目": EYE_WHITE,
    "瞳": IRIS,
    "ハイライト": HIGHLIGHT,
    "下まつげ": lower_lash,
    "二重線": crease,
    "上まつげ": upper_lash,
}
EYE_C = (459.0, 251.0)

# closed eye (blink) and smiling eye lines, drawn in the lash style
pen = Pen()
pts = bezier((437.5, 252.5), (465, 263.5), (495.5, 249.0))
pen.stroke(pts, taper(len(pts), 3.2, 1.0, 2.2), (0, 0, 0, 255))
pen.stroke([(493.5, 250.0), (499.0, 247.0)], [2.0, 0.8], (0, 0, 0, 255))
pen.stroke([(491.0, 251.5), (495.5, 251.0)], [1.4, 0.6], (0, 0, 0, 255))
eye["目閉じ"] = pen.layer()
pen = Pen()
pts = bezier((439.0, 258.0), (466, 241.0), (495.0, 255.0))
pen.stroke(pts, taper(len(pts), 3.2, 1.0, 2.0), (0, 0, 0, 255))
pen.stroke([(492.0, 253.5), (498.5, 255.5)], [1.8, 0.7], (0, 0, 0, 255))
eye["笑い目"] = pen.layer()
# shrunken iris for surprise
ic = (460.5, 250.5)
M = cv2.getRotationMatrix2D(ic, 0, 0.72)
eye["瞳_縮小"] = transform(IRIS, M)

# hidden eye + brow under the fringe: mirror of the visible one. The hair covers
# it completely at rest; it peeks out only when the fringe moves.
hidden = {k: mirror_x(v, FACE_AXIS) for k, v in list(eye.items()) + [("眉", BROW)]}

# ------------------------------------------------------------------ mouths
def mouth_line(pts, wmid=1.7, w0=0.9, w1=0.9):
    pen = Pen()
    pen.stroke(pts, taper(len(pts), wmid, w0, w1), mouth_rgb + (255,))
    return pen.layer()


mouths = {"口_通常": mouth}
mouths["口_微笑み"] = mouth_line(bezier((405.5, 317.0), (418.5, 324.0), (432.0, 316.0)))
mouths["口_への字"] = mouth_line(bezier((407.0, 321.5), (418.5, 314.5), (430.0, 321.5)))
wave = [(408 + i * 0.5, 320 + 1.3 * math.sin(i * 0.5 / 20 * 2 * math.pi * 1.5)) for i in range(41)]
mouths["口_照れ"] = mouth_line(wave, 1.5, 0.8, 0.8)
pen = Pen()
open_shape = bezier((407.5, 316.5), (418.5, 314.5), (429.5, 316.5)) + \
    bezier((429.5, 316.5), (420, 336), (407.5, 316.5))[1:]
pen.poly(open_shape, (96, 38, 46, 255))
pen.poly(bezier((410.5, 324.5), (418.5, 320.5), (426.5, 324.5)) +
         bezier((426.5, 324.5), (420, 333), (410.5, 324.5))[1:], (200, 104, 110, 255))
pen.stroke(open_shape, [1.4] * len(open_shape), mouth_rgb + (255,))
mouths["口_あ"] = pen.layer()
pen = Pen()
pen.ellipse(418.5, 322.5, 5.4, 6.6, mouth_rgb + (255,))
pen.ellipse(418.5, 322.5, 4.1, 5.3, (110, 44, 54, 255))
pen.ellipse(418.5, 325.6, 2.6, 1.8, (178, 92, 100, 255))
mouths["口_お"] = pen.layer()

# ------------------------------------------------------------------ extras
pen = Pen()
for cx, cy in ((468.0, 292.0), (366.0, 293.0)):
    for k in range(12, 0, -1):
        a = int(10 + 6 * (12 - k))
        pen.ellipse(cx, cy, 1.3 * k, 0.55 * k, (238, 132, 140, min(a, 70)))
    for dx in (-6, 0, 6):
        pen.stroke([(cx + dx - 2.0, cy + 3.0), (cx + dx + 2.0, cy - 3.0)], [1.0, 1.0],
                   (214, 92, 104, 210))
blush = pen.layer()

pen = Pen()
drop = [(503.0, 219.0)] + [(503 + 4.2 * math.sin(t), 230 + 4.2 * math.cos(t))
                            for t in np.linspace(-2.2, 2.2, 24)] + [(503.0, 219.0)]
pen.poly(drop, (96, 150, 200, 255))
inner = [(503.0, 221.5)] + [(503 + 3.0 * math.sin(t), 230 + 3.0 * math.cos(t))
                            for t in np.linspace(-2.2, 2.2, 24)]
pen.poly(inner, (214, 238, 252, 255))
pen.ellipse(501.6, 230.5, 0.9, 1.4, (255, 255, 255, 255))
sweat = pen.layer()

# ------------------------------------------------------------------ assemble
LAYERS = []  # (name, group, image, visible_at_rest, kind) in draw order, back -> front


def add(name, group, img, visible=True, kind="art"):
    LAYERS.append((name, group, img, visible, kind))


# Folders must be contiguous in a PSD, so they follow the draw order:
#   体 < 後ろ髪 < 首・襟 < 頭 (face, hidden eye, mouth, hair, hat, visible eye)
add("脚", "体", parts["脚"])
add("裾裏", "体", parts["裾裏"])
add("上半身", "体", parts["上半身"])
add("飾緒", "体", parts["飾緒"])
add("後ろ髪", "後ろ髪", parts["後ろ髪"])
add("首", "首・襟", parts["首"])
add("襟_シャツ_ネクタイ", "首・襟", parts["襟_シャツ_ネクタイ"])
add("顔", "頭", parts["顔"])
EYE_KEYS = ("白目", "瞳", "瞳_縮小", "ハイライト", "下まつげ", "二重線", "上まつげ", "目閉じ", "笑い目")
VARIANT_EYE = ("瞳_縮小", "目閉じ", "笑い目")
for k in EYE_KEYS:
    add(f"左目_{k}", "頭/目_向かって左(前髪下)", hidden[k], visible=k not in VARIANT_EYE,
        kind="variant" if k in VARIANT_EYE else "hidden")
add("左眉", "頭/目_向かって左(前髪下)", hidden["眉"], kind="hidden")
add("鼻", "頭", nose)
for k, img in mouths.items():
    add(k, "頭/口", img, visible=(k == "口_通常"),
        kind="art" if k == "口_通常" else "variant")
add("頬染め", "頭", blush, visible=False, kind="variant")
add("横髪_向かって左_外", "頭/髪", parts["横髪_向かって左_外"])
add("横髪_向かって右_外", "頭/髪", parts["横髪_向かって右_外"])
add("横髪_向かって左_内", "頭/髪", parts["横髪_向かって左_内"])
add("横髪_向かって右_内", "頭/髪", parts["横髪_向かって右_内"])
add("前髪", "頭/髪", parts["前髪"])
add("帽子", "頭", parts["帽子"])
for k in EYE_KEYS:
    vis = k not in VARIANT_EYE
    add(f"右目_{k}", "頭/目_向かって右", eye[k], visible=vis,
        kind="art" if vis else "variant")
add("右眉", "頭/目_向かって右", BROW)
add("汗", "頭", sweat, visible=False, kind="variant")


def main():
    os.makedirs(os.path.join(OUT, "parts"), exist_ok=True)
    meta = []
    rest = np.zeros((H, W, 4), F32)
    for i, (name, group, img, vis, kind) in enumerate(LAYERS):
        a = img[..., 3]
        ys, xs = np.nonzero(a > 1 / 255)
        if len(xs) == 0:
            raise SystemExit(f"empty part: {name}")
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = np.clip(img[y0:y1, x0:x1] * 255 + 0.5, 0, 255).astype(np.uint8)
        crop[crop[..., 3] == 0, :3] = 0
        fname = f"{i:02d}_{name}.png"
        Image.fromarray(crop, "RGBA").save(os.path.join(OUT, "parts", fname), optimize=True)
        meta.append(dict(id=f"p{i:02d}", name=name, group=group, file=fname, kind=kind,
                         visible=vis, x=int(x0), y=int(y0), w=int(x1 - x0), h=int(y1 - y0)))
        if vis:
            rest = srcpsd.over(rest, np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)
                               .astype(F32) / 255)
    with open(os.path.join(OUT, "parts.json"), "w", encoding="utf-8") as f:
        json.dump(dict(width=W, height=H, face_axis=FACE_AXIS, neck_pivot=NECK_PIVOT,
                       eye_center=EYE_C, parts=meta), f, ensure_ascii=False, indent=1)

    ref = np.asarray(psd.composite().convert("RGBA"), F32) / 255

    def onwhite(x):
        return x[..., :3] * x[..., 3:4] + (1 - x[..., 3:4])
    d = np.abs(onwhite(rest) - onwhite(ref)) * 255
    print(f"rest pose vs original: max {d.max():.1f}, mean {d.mean():.3f}, "
          f"pixels >16: {(d.max(-1) > 16).sum()}")
    dm = (d.max(-1) > 16)
    vis = (onwhite(rest) * 255).astype(np.uint8)
    vis[dm] = (255, 0, 255)
    Image.fromarray(vis).save(os.path.join(OUT, "check_rest.png"))
    print(len(LAYERS), "layers")


if __name__ == "__main__":
    main()
