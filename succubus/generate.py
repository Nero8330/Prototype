#!/usr/bin/env python3
"""64x64 RPG succubus sprite (4-frame idle) -> Dotcraft C++ header + previews.

Usage: python3 generate.py [out_dir]
Writes succubus.h (Dotcraft C++ export v1), preview.png and preview.gif.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

W = H = 64
YY, XX = np.mgrid[0:H, 0:W]


def hexc(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


# ---------------------------------------------------------------- palette
OUT = hexc("140A1C")
SKIN = [hexc(c) for c in ("6E2E44", "C46F78", "EBA593", "FBD0BC", "FFEDE2")]
HAIR = [hexc(c) for c in ("1E0B36", "43197A", "6C2FB0", "9654D8", "C792F2")]
HORN = [hexc(c) for c in ("120C18", "2E2538", "4A3E58", "7A6C8C", "B4A8C4")]
WING = [hexc(c) for c in ("16050F", "3A0C2C", "561642", "78245C", "9C3A7C")]
BONE = [hexc(c) for c in ("12060F", "2C1028", "4C2348")]
DRESS = [hexc(c) for c in ("0E0716", "21122F", "3A2152", "583679", "7E56A6")]
PINK = [hexc(c) for c in ("5E0A2E", "A8164E", "E2357A", "FF7AAE", "FFD0E2")]
GOLD = [hexc(c) for c in ("5C3A0E", "A8741E", "E2B040", "FFE08A")]
EYE_D, EYE, EYE_L = hexc("8C0A2E"), hexc("F0245A"), hexc("FF9AB4")
WHITE = hexc("FFFFFF")
LIPS = hexc("C23A5C")
BLUSH = hexc("F5958E")
LIGHT = np.array([-0.55, -0.65, 0.55])
LIGHT = LIGHT / np.linalg.norm(LIGHT)


# ---------------------------------------------------------------- shapes
def ellipse(cx, cy, rx, ry):
    return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1.0


def poly(points):
    img = Image.new("L", (W, H), 0)
    ImageDraw.Draw(img).polygon([(float(x), float(y)) for x, y in points], fill=1)
    return np.array(img).astype(bool)


def mirror(m):
    return m[:, ::-1]


def mirror_pts(pts):
    return [(63 - x, y) for x, y in pts]


def shift(m, dx, dy):
    """out[y, x] = m[y - dy, x - dx] (moves content by dx, dy)."""
    out = np.zeros_like(m)
    ys = slice(max(dy, 0), H + min(dy, 0))
    yd = slice(max(-dy, 0), H + min(-dy, 0))
    xs = slice(max(dx, 0), W + min(dx, 0))
    xd = slice(max(-dx, 0), W + min(-dx, 0))
    out[ys, xs] = m[yd, xd]
    return out


def dilate4(m):
    return m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)


def tube(points, radii):
    """Capsule chain. Returns (mask, normal_x, normal_y) for cylinder shading."""
    best = np.full((H, W), np.inf)
    nx = np.zeros((H, W))
    ny = np.zeros((H, W))
    inside = np.zeros((H, W), bool)
    for i in range(len(points) - 1):
        (x0, y0), (x1, y1) = points[i], points[i + 1]
        r0, r1 = radii[i], radii[i + 1]
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy or 1e-9
        t = np.clip(((XX - x0) * dx + (YY - y0) * dy) / L2, 0, 1)
        px, py = x0 + t * dx, y0 + t * dy
        r = r0 + (r1 - r0) * t
        vx, vy = XX - px, YY - py
        d = np.hypot(vx, vy)
        rel = d / r
        hit = rel <= 1.0
        better = hit & (rel < best)
        best = np.where(better, rel, best)
        nx = np.where(better, vx / np.maximum(r, 1e-6), nx)
        ny = np.where(better, vy / np.maximum(r, 1e-6), ny)
        inside |= hit
    return inside, nx, ny


def lambert(nx, ny):
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    return nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]


def sphere_light(cx, cy, rx, ry):
    nx = np.clip((XX - cx) / rx, -1, 1)
    ny = np.clip((YY - cy) / ry, -1, 1)
    s = np.hypot(nx, ny)
    k = np.where(s > 1, 1 / np.maximum(s, 1e-6), 1)
    return lambert(nx * k, ny * k)


def column_light(mask, tilt=0.0):
    """Vertical-cylinder shading computed per row from the mask's extent."""
    lv = np.zeros((H, W))
    for y in range(H):
        xs = np.nonzero(mask[y])[0]
        if len(xs) == 0:
            continue
        a, b = xs.min(), xs.max()
        mid, half = (a + b) / 2, (b - a) / 2 + 0.75
        nx = np.clip((np.arange(W) - mid) / half, -1, 1)
        lv[y] = lambert(nx, np.full(W, tilt))
    return lv


def quantize(light, thresholds):
    """Map light values to ramp indices 1..len(thresholds)+1."""
    idx = np.ones(light.shape, int)
    for t in thresholds:
        idx += light > t
    return idx


# ---------------------------------------------------------------- canvas
class Canvas:
    def __init__(self):
        self.rgb = np.zeros((H, W, 3), np.uint8)
        self.a = np.zeros((H, W), bool)

    def put(self, mask, color):
        self.rgb[mask] = color
        self.a |= mask

    def px(self, x, y, color):
        if 0 <= x < W and 0 <= y < H:
            self.rgb[y, x] = color
            self.a[y, x] = True

    def part(self, mask, ramp, light, thresholds, outline=True, line=None):
        """Shaded part with its own 1px outline (drawn outside the mask)."""
        if outline:
            self.put(dilate4(mask) & ~mask, line or ramp[0])
        idx = quantize(light, thresholds)
        for i in range(1, len(ramp)):
            self.put(mask & (idx == i), ramp[i])

    def finish(self):
        """Selective outline: darkest color on the outer silhouette."""
        edge = self.a & ~(shift(self.a, 1, 0) & shift(self.a, -1, 0)
                          & shift(self.a, 0, 1) & shift(self.a, 0, -1))
        self.rgb[edge] = OUT

    def rgba(self):
        out = np.zeros((H, W, 4), np.uint8)
        out[..., :3] = self.rgb
        out[..., 3] = np.where(self.a, 255, 0)
        return out


def rotate(pts, origin, deg):
    ox, oy = origin
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [(ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c)
            for x, y in pts]


# ---------------------------------------------------------------- parts
def tube_m(points, radii, flip=False):
    m, nx, ny = tube(points, radii)
    if flip:
        return mirror(m), -nx[:, ::-1], ny[:, ::-1]
    return m, nx, ny


def wing_shapes(flap, dy):
    """Left bat wing (viewer's left). flap>0 raises it."""
    root = (27.0, 27.0 + dy)
    wrist = (13.0, 11.0 + dy)
    claw = (12.0, 6.5 + dy)
    tips = [(3.0, 13.5 + dy), (2.5, 24.5 + dy), (6.5, 33.0 + dy), (14.5, 38.0 + dy)]
    tail_end = (25.0, 36.0 + dy)
    pts = rotate([wrist, claw] + tips + [tail_end], root, -flap)
    wrist, claw, tips, tail_end = pts[0], pts[1], pts[2:6], pts[6]

    outline = [root, (wrist[0] + 0.5, wrist[1] - 1.2), wrist]
    edge_pts = list(tips) + [tail_end]
    for i, tp in enumerate(edge_pts):
        if i > 0:
            a = edge_pts[i - 1]
            mx, my = (a[0] + tp[0]) / 2, (a[1] + tp[1]) / 2
            k = 0.42
            outline.append((mx + (wrist[0] - mx) * k, my + (wrist[1] - my) * k))
        outline.append(tp)
    outline.append((27.5, 31.0 + dy))
    membrane = poly(outline)

    arm = tube([root, wrist], [1.4, 0.9])[0]
    fingers = tube([wrist, claw], [0.8, 0.45])[0]
    for tp in tips:
        fingers |= tube([wrist, tp], [0.6, 0.45])[0]
    return membrane, arm, fingers, wrist


def draw_wings(cv, flap, dy):
    for side in (0, 1):
        membrane, arm, fingers, wrist = wing_shapes(flap, dy)
        if side:
            membrane, arm, fingers = mirror(membrane), mirror(arm), mirror(fingers)
        allm = membrane | arm | fingers
        cv.put(dilate4(allm) & ~allm, WING[0])
        rim = membrane & ~(shift(membrane, 1, 0) & shift(membrane, -1, 0)
                           & shift(membrane, 0, 1) & shift(membrane, 0, -1))
        cv.put(membrane, WING[2])
        # translucent glow toward the upper/inner part of each panel
        wx = wrist[0] if side == 0 else 63 - wrist[0]
        d = np.hypot(XX - wx, YY - wrist[1])
        cv.put(membrane & (d > 6) & (d < 15) & ~rim, WING[3])
        cv.put(membrane & (d > 8) & (d < 12) & ~rim & (YY < 26 + dy), WING[4])
        cv.put(rim & ~dilate4(arm), WING[1])
        cv.put(fingers, BONE[1])
        cv.put(arm, BONE[1])
        hl = arm & ~shift(arm, 0, 1)  # top edge of the forearm bone
        cv.put(hl, BONE[2])


def draw_tail(cv, phase, dy):
    sway = math.sin(phase) * 1.5
    pts = [(36.0, 42.0 + dy), (42.0, 46.0 + dy), (47.0, 46.5 + dy),
           (50.5 + sway * 0.4, 43.5 + dy), (52.0 + sway * 0.8, 39.5 + dy),
           (52.5 + sway, 36.0 + dy)]
    m, nx, ny = tube(pts, [1.2, 0.95, 0.85, 0.75, 0.7, 0.6])
    cv.part(m, DRESS, lambert(nx, ny) + 0.15, [0.2, 0.55, 0.85])
    # spade tip (an upside-down heart)
    tx, ty = round(52.5 + sway), round(32 + dy)
    shape = ["..#..", ".###.", "#####", "#####", "##.##"]
    spade = np.zeros((H, W), bool)
    for j, row in enumerate(shape):
        for i, ch in enumerate(row):
            if ch == "#":
                spade[ty - 2 + j, tx - 2 + i] = True
    cv.put(dilate4(spade) & ~spade, PINK[0])
    cv.put(spade, PINK[2])
    cv.put(spade & (YY == ty + 2), PINK[1])
    cv.px(tx + 2, ty + 1, PINK[1])
    cv.px(tx, ty - 1, PINK[3])
    cv.px(tx - 1, ty, PINK[4])


def draw_back_hair(cv, dy, phase):
    s = math.sin(phase)
    left = [(31.5, 5.5), (24.0, 7.0), (20.5, 11.5), (19.5, 18.0), (19.5, 25.0),
            (18.5, 31.0 + s * 0.5), (20.0, 30.5), (20.5, 36.0 + s),
            (22.5, 33.0), (24.0, 37.0 + s * 0.6), (25.5, 32.0), (31.5, 32.0)]
    pts = left + list(reversed(mirror_pts(left)))
    m = poly([(x, y + dy) for x, y in pts])
    lv = column_light(m, tilt=-0.1) - 0.2
    cv.part(m, HAIR, lv, [0.0, 0.35, 0.8])
    for x0 in (21, 23, 40, 42):
        for y in range(20, 34):
            if m[y + dy, x0] and m[y + dy, x0 - 1] and m[y + dy, x0 + 1]:
                cv.px(x0, y + dy, HAIR[1])


def draw_legs(cv, dy):
    legs = [
        # viewer's left: knee bent slightly, foot tucked in
        ([(29.0, 45.0), (28.8, 50.5), (29.8, 55.0), (31.0, 58.0), (31.6, 59.4)],
         [2.3, 1.9, 1.5, 1.1, 0.6]),
        # viewer's right: straight, toe pointed down
        ([(34.0, 45.0), (34.2, 51.0), (34.0, 56.0), (33.8, 59.5), (33.7, 61.2)],
         [2.3, 1.9, 1.5, 1.1, 0.6]),
    ]
    for pts, radii in legs:
        m, nx, ny = tube([(x, y + dy) for x, y in pts], radii)
        lv = lambert(nx, ny)
        skin = m & (YY < 49 + dy)
        boot = m & ~skin
        cv.put(dilate4(m) & ~m, DRESS[0])
        idx = quantize(lv, [0.15, 0.55, 0.9])
        for i in range(1, 5):
            cv.put(skin & (idx == i), SKIN[i])
            cv.put(boot & (idx == i), DRESS[i])
        cuff = m & (YY == 49 + dy)
        cv.put(cuff, PINK[2])
        cv.put(cuff & (lv > 0.7), PINK[3])


def dress_mask(dy):
    xs = [41.5, 39.5, 37.0, 34.5, 31.5, 28.5, 26.0, 23.5, 21.5]
    hem = [(x, (48.5 if i % 2 == 0 else 45.8)) for i, x in enumerate(xs)]
    hem[0] = (41.5, 47.0)
    hem[-1] = (21.5, 47.0)
    pts = [(26.5, 28.0), (36.5, 28.0), (37.6, 31.0), (36.6, 34.5), (35.6, 37.5),
           (37.8, 40.5)] + hem + [(25.2, 40.5), (27.4, 37.5), (26.4, 34.5), (25.4, 31.0)]
    return poly([(x, y + dy) for x, y in pts])


def draw_body(cv, dy):
    neck = poly([(29.6, 21.0 + dy), (33.4, 21.0 + dy), (33.4, 26.0 + dy),
                 (29.6, 26.0 + dy)])
    shoulders = ellipse(31.5, 29.0 + dy, 7.4, 3.2)
    skin = neck | shoulders
    lv = column_light(skin) + 0.1
    cv.part(skin, SKIN, lv, [0.1, 0.5, 0.95])
    for x in range(30, 34):
        cv.px(x, 24 + dy, SKIN[2])
    cv.px(33, 25 + dy, SKIN[2])
    # choker
    for x in range(30, 34):
        cv.px(x, 25 + dy, DRESS[1])
    cv.px(31, 26 + dy, PINK[3])
    cv.px(32, 26 + dy, PINK[2])

    m = dress_mask(dy)
    lv = column_light(m, tilt=-0.05) + 0.1
    cv.part(m, DRESS, lv, [0.1, 0.45, 0.85])
    # corset shading lines
    for y in range(31, 37):
        cv.px(29, y + dy, DRESS[3] if y < 34 else DRESS[2])
        cv.px(34, y + dy, DRESS[1])
    # neckline trim
    for x in range(27, 37):
        cv.px(x, 28 + dy, PINK[2] if x < 34 else PINK[1])
    for x in (28, 29, 30):
        cv.px(x, 28 + dy, PINK[3])
    # waist sash with gold buckle
    for x in range(25, 39):
        if m[37 + dy, x]:
            cv.px(x, 37 + dy, PINK[2] if x < 34 else PINK[1])
        if m[38 + dy, x]:
            cv.px(x, 38 + dy, PINK[1])
    for x, y, c in [(31, 37, GOLD[3]), (32, 37, GOLD[2]), (31, 38, GOLD[2]), (32, 38, GOLD[1])]:
        cv.px(x, y + dy, c)
    # skirt folds
    for x0, y0, y1 in [(28, 41, 46), (31, 40, 47), (35, 41, 46)]:
        for y in range(y0, y1):
            if m[y + dy, x0]:
                cv.px(x0, y + dy, DRESS[1])
    for x0, y0, y1 in [(27, 42, 45), (30, 41, 46)]:
        for y in range(y0, y1):
            if m[y + dy, x0]:
                cv.px(x0, y + dy, DRESS[4] if y < 43 else DRESS[3])
    hem_edge = m & ~shift(m, 0, -1)
    cv.put(hem_edge & (YY > 43 + dy), PINK[1])
    # chest gem
    for x, y, c in [(31, 30, PINK[4]), (32, 30, PINK[2]), (31, 31, PINK[2]), (32, 31, PINK[1]),
                    (31, 29, GOLD[2]), (32, 29, GOLD[1])]:
        cv.px(x, y + dy, c)


def draw_arms(cv, dy):
    # viewer's left: raised, palm up, conjuring a heart
    # viewer's right: hand on hip
    arms = [
        ([(25.6, 28.6), (20.6, 32.4)], [(20.6, 32.4), (18.2, 28.8), (17.2, 26.4)],
         (16.9, 25.4)),
        ([(37.4, 28.6), (42.2, 33.4)], [(42.2, 33.4), (40.6, 36.8), (38.2, 38.6)],
         (37.6, 38.8)),
    ]
    for upper, fore, hand_c in arms:
        upper = [(x, y + dy) for x, y in upper]
        fore = [(x, y + dy) for x, y in fore]
        mu, ux, uy = tube(upper, [1.6, 1.35])
        mf, fx, fy = tube(fore, [1.35, 1.2, 1.15])
        hand = ellipse(hand_c[0], hand_c[1] + dy, 1.5, 1.4)
        both = mu | mf | hand
        cv.put(dilate4(both) & ~both, SKIN[0])
        idx_u = quantize(lambert(ux, uy) + 0.1, [0.15, 0.5, 0.95])
        idx_f = quantize(lambert(fx, fy) + 0.1, [0.15, 0.5, 0.95])
        for i in range(1, 5):
            cv.put(mf & (idx_f == i), SKIN[i])
            cv.put(mu & (idx_u == i), SKIN[i])
        cv.put(hand & ~mf, SKIN[3])
        # bracelet near the wrist
        wx, wy = fore[1][0] * 0.35 + fore[2][0] * 0.65, fore[1][1] * 0.35 + fore[2][1] * 0.65
        cv.put(mf & (np.hypot(XX - wx, YY - wy) < 1.2), GOLD[2])


def draw_heart_magic(cv, dy, t):
    """Floating charm heart above the raised hand, pulsing over the loop."""
    cx, cy = 15, 20 + dy - (1 if t in (1, 2) else 0)
    big = t in (1, 2)
    if big:
        shape = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]
    else:
        shape = [".##.##.", "#######", ".#####.", "..###..", "...#..."]
    pts = np.zeros((H, W), bool)
    for j, row in enumerate(shape):
        for i, ch in enumerate(row):
            x, y = cx - 3 + i, cy - 2 + j
            if ch == "#" and 0 <= x < W and 0 <= y < H:
                pts[y, x] = True
    cv.put(dilate4(pts) & ~pts, PINK[0])
    cv.put(pts, PINK[2])
    cv.put(pts & ~shift(pts, 0, -1) & (YY > cy), PINK[1])
    cv.px(cx - 2, cy - 1, PINK[4])
    cv.px(cx - 2, cy, PINK[3])
    cv.px(cx - 1, cy - 1, PINK[3])
    # sparkles orbiting the heart
    sp = [((cx - 1, cy - 6), (cx - 6, cy + 3)), ((cx + 2, cy - 7), (cx - 7, cy)),
          ((cx - 3, cy - 6), (cx - 5, cy + 5)), ((cx + 1, cy - 5), (cx - 7, cy - 3))][t]
    for k, (sx, sy) in enumerate(sp):
        cv.px(sx, sy, PINK[4] if k == 0 else PINK[3])
        if (t + k) % 2 == 0:
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                cv.px(sx + ox, sy + oy, PINK[2])


def draw_head(cv, dy):
    face = ellipse(31.5, 15.5 + dy, 7.4, 7.6) & poly(
        [(23, 6 + dy), (40, 6 + dy), (40, 18 + dy), (34.6, 23.6 + dy), (28.4, 23.6 + dy),
         (23, 18 + dy)])
    cv.put(dilate4(face) & ~face, SKIN[0])
    cv.put(face, SKIN[3])
    # soft form shadow on the far side of the face and under the jaw
    right = face & ~shift(face, -1, 0) | face & ~shift(face, -2, 0) & (YY > 15 + dy)
    cv.put(right, SKIN[2])
    cv.put(face & ~shift(face, 0, -1) & (XX > 32), SKIN[2])
    cv.put(face & ~shift(face, 1, 0) & (YY > 14 + dy) & (YY < 20 + dy), SKIN[4])


def draw_face(cv, dy, blink):
    def P(x, y, c):
        cv.px(x, y + dy, c)

    # eyes: iris columns 27..29 and 34..36; highlight on the lit (left) side of each
    for lash, (a, b, c), flick in ((range(26, 30), (27, 28, 29), (25, 15)),
                                   (range(34, 38), (34, 35, 36), (38, 15))):
        if blink:
            for x in lash:
                P(x, 17, OUT)
            P(*(flick[0], 16), OUT)
            continue
        for x in lash:
            P(x, 15, OUT)
        P(*flick, OUT)
        P(a, 16, WHITE)
        P(b, 16, EYE_D)
        P(c, 16, EYE_D)
        P(a, 17, EYE)
        P(b, 17, OUT)       # slit pupil
        P(c, 17, EYE_D)
        P(a, 18, EYE_L)
        P(b, 18, EYE)
        P(c, 18, EYE)
    # blush, nose, smirk
    for x in (25, 26, 37, 38):
        P(x, 19 if blink else 20, BLUSH)
    P(32, 19, SKIN[2])
    P(31, 21, LIPS)
    P(32, 21, LIPS)
    P(33, 20, LIPS)


def draw_front_hair(cv, dy):
    crown = ellipse(31.5, 13.0 + dy, 9.6, 8.0) & (YY < 13 + dy)
    bang_pts = [(22.0, 11.0), (41.0, 11.0), (41.0, 15.0), (40.0, 13.0), (38.6, 16.6),
                (37.0, 13.0), (35.0, 14.0), (33.6, 13.0), (31.6, 15.6), (29.6, 13.0),
                (28.0, 14.0), (26.0, 13.0), (24.4, 16.6), (23.0, 13.0), (22.0, 15.0)]
    bangs = poly([(x, y + dy) for x, y in bang_pts])
    lock_l = [(24.0, 9.0), (21.6, 14.0), (21.4, 20.0), (22.0, 25.0), (23.4, 27.5),
              (24.0, 24.0), (24.8, 19.0), (25.4, 14.0), (26.0, 11.0)]
    locks = poly([(x, y + dy) for x, y in lock_l])
    locks |= mirror(locks)
    m = crown | bangs | locks
    lv = sphere_light(29.0, 8.0 + dy, 12.0, 13.0)
    lv = np.where(locks & ~crown & ~bangs, column_light(locks) - 0.05, lv)
    cv.part(m, HAIR, lv, [0.0, 0.4, 0.84])
    # shadow cast by the bangs onto the forehead
    below = shift(bangs, 0, 1) & ~m
    face_px = np.all(cv.rgb == np.array(SKIN[3], np.uint8), axis=-1) | \
        np.all(cv.rgb == np.array(SKIN[4], np.uint8), axis=-1)
    cv.put(below & face_px, SKIN[2])
    # shine band
    for x, y in [(25, 8), (26, 7), (27, 7), (28, 7), (29, 7), (30, 7), (26, 8), (27, 8)]:
        cv.px(x, y + dy, HAIR[4])
    for x, y in [(24, 9), (31, 7), (32, 7), (28, 8)]:
        cv.px(x, y + dy, HAIR[3])
    for y in range(16, 25):
        for x, c in ((23, HAIR[3]), (40, HAIR[1])):
            if m[y + dy, x] and m[y + dy, x - 1] and m[y + dy, x + 1]:
                cv.px(x, y + dy, c)


def draw_horns(cv, dy):
    for side in (0, 1):
        pts = [(26.5, 8.5), (24.0, 5.8), (21.5, 4.4), (19.4, 3.2), (18.4, 1.2)]
        m, nx, ny = tube_m([(x, y + dy) for x, y in pts], [1.9, 1.6, 1.25, 0.9, 0.5],
                           flip=bool(side))
        cv.part(m, HORN, lambert(nx, ny), [0.15, 0.5, 0.85], line=OUT)
        for x, y in [(23, 5), (21, 4)]:
            xx = x if side == 0 else 63 - x
            if m[y + dy, xx]:
                cv.px(xx, y + dy, HORN[1])


# ---------------------------------------------------------------- frames
FRAMES = [
    # flap (deg), body bob, tail phase, blink
    dict(flap=10, dy=0, phase=0.0, blink=False),
    dict(flap=0, dy=1, phase=math.pi / 2, blink=False),
    dict(flap=-10, dy=1, phase=math.pi, blink=False),
    dict(flap=0, dy=0, phase=3 * math.pi / 2, blink=True),
]
DURATIONS = [160, 140, 160, 140]


def render(fr, t):
    cv = Canvas()
    dy = fr["dy"]
    draw_wings(cv, fr["flap"], dy)
    draw_back_hair(cv, dy, fr["phase"])
    draw_tail(cv, fr["phase"], dy)
    draw_legs(cv, dy)
    draw_body(cv, dy)
    draw_head(cv, dy)
    draw_front_hair(cv, dy)
    draw_face(cv, dy, fr["blink"])
    draw_horns(cv, dy)
    draw_arms(cv, dy)
    cv.finish()
    draw_heart_magic(cv, dy, t)
    return cv.rgba()


# ---------------------------------------------------------------- output
def to_header(frames, durations):
    lines = [
        "// Dotcraft C++ export v1 | RGBA: 0xRRGGBBAA | pixels[frame][y][x]",
        "// Alpha: 0 = transparent, 255 = opaque. Durations are milliseconds.",
        "// C++11 or later. Logical channel order is independent of host byte order.",
        "#pragma once",
        "#include <cstdint>",
        "",
        "namespace dotcraft {",
        f"constexpr unsigned width = {W};",
        f"constexpr unsigned height = {H};",
        f"constexpr unsigned frame_count = {len(frames)};",
        "constexpr std::uint16_t durations_ms[frame_count] = { "
        + ", ".join(str(d) for d in durations) + " };",
        "constexpr std::uint32_t pixels[frame_count][height][width] = {",
    ]
    for fi, img in enumerate(frames):
        lines.append("  {")
        for y in range(H):
            row = []
            for x in range(W):
                r, g, b, a = (int(v) for v in img[y, x])
                if a == 0:
                    r = g = b = 0
                row.append(f"0x{r:02X}{g:02X}{b:02X}{a:02X}u")
            lines.append("    { " + ", ".join(row) + (" }," if y < H - 1 else " }"))
        lines.append("  }," if fi < len(frames) - 1 else "  }")
    lines += [
        "};",
        "constexpr std::uint8_t red(std::uint32_t c) { return (c >> 24) & 255; }",
        "constexpr std::uint8_t green(std::uint32_t c) { return (c >> 16) & 255; }",
        "constexpr std::uint8_t blue(std::uint32_t c) { return (c >> 8) & 255; }",
        "constexpr std::uint8_t alpha(std::uint32_t c) { return c & 255; }",
        "} // namespace dotcraft",
    ]
    return "\n".join(lines) + "\n"


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    frames = [render(fr, i) for i, fr in enumerate(FRAMES)]
    with open(os.path.join(out_dir, "succubus.h"), "w", newline="\n") as f:
        f.write(to_header(frames, DURATIONS))

    scale = 6
    bg = (58, 52, 72, 255)
    sheet = Image.new("RGBA", (W * len(frames) * scale + (len(frames) + 1) * 8,
                               H * scale + 16), bg)
    gif = []
    for i, fr in enumerate(frames):
        im = Image.fromarray(fr, "RGBA").resize((W * scale, H * scale), Image.NEAREST)
        sheet.alpha_composite(im, (8 + i * (W * scale + 8), 8))
        g = Image.new("RGBA", (W * scale, H * scale), bg)
        g.alpha_composite(im)
        gif.append(g.convert("RGB"))
    sheet.save(os.path.join(out_dir, "preview.png"))
    gif[0].save(os.path.join(out_dir, "preview.gif"), save_all=True,
                append_images=gif[1:], duration=DURATIONS, loop=0)


if __name__ == "__main__":
    main()
