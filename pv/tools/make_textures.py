"""Generate background / overlay textures for the PV (deterministic, seeded)."""
import sys, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]
W, H = 1920, 1080
rng = np.random.default_rng(2080)


def fbm(w, h, octaves=6, base=4):
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        small = rng.random((n * h // w + 2, n + 2)).astype(np.float32)
        img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += np.asarray(img, np.float32) / 255 * amp
        tot += amp
        amp *= 0.55
    return acc / tot


def save(arr, name, mode="L"):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode).save(os.path.join(OUT, name), optimize=True)


# 1) film grain frames (luminance noise, used with overlay blend)
for i in range(6):
    g = rng.normal(128, 38, (540, 960))
    save(g, f"grain{i}.png")

# 2) grunge: dark stains + scratches as alpha (white specks) – used on dark backgrounds
f = fbm(W, H, 7, 3)
stain = (f - f.min()) / (f.max() - f.min())
alpha = np.clip((stain - 0.45) * 220, 0, 90)
im = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(im)
for _ in range(900):  # specks
    x, y = rng.integers(0, W), rng.integers(0, H)
    r = rng.random() * 1.8 + 0.3
    d.ellipse([x - r, y - r, x + r, y + r], fill=int(rng.integers(40, 140)))
for _ in range(140):  # scratches
    x, y = rng.integers(0, W), rng.integers(0, H)
    ang = rng.normal(1.45, 0.5)
    ln = rng.integers(20, 260)
    pts = [(x, y)]
    for k in range(6):
        x += math.cos(ang) * ln / 6 + rng.normal(0, 2)
        y += math.sin(ang) * ln / 6 + rng.normal(0, 2)
        pts.append((x, y))
    d.line(pts, fill=int(rng.integers(30, 110)), width=1)
a = np.maximum(alpha, np.asarray(im, np.float32))
rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., :3] = 235
rgba[..., 3] = np.clip(a, 0, 255)
Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "grunge_light.png"), optimize=True)
rgba[..., :3] = 10
rgba[..., 3] = np.clip(a * 0.9, 0, 255)
Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "grunge_dark.png"), optimize=True)

# 3) map lines (ruined city plan) – thin lines alpha
im = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(im)
# coastline
pts = []
x = 0
y0 = 760
while x < W + 40:
    y0 += rng.normal(0, 18)
    y0 = min(max(y0, 560), 980)
    pts.append((x, y0))
    x += 24
d.line(pts, fill=150, width=2)
# road network: jittered grid + diagonals
for gx in range(-200, W + 200, 120):
    x = gx + rng.normal(0, 25)
    pts = []
    for y in range(-20, H + 40, 60):
        x += rng.normal(0, 7)
        pts.append((x, y))
    d.line(pts, fill=int(rng.integers(60, 120)), width=1)
for gy in range(-100, H + 100, 95):
    y = gy + rng.normal(0, 25)
    pts = []
    for xx in range(-20, W + 40, 60):
        y += rng.normal(0, 6)
        pts.append((xx, y))
    d.line(pts, fill=int(rng.integers(60, 120)), width=1)
for _ in range(14):
    x, y = rng.integers(0, W), rng.integers(0, H)
    ang = rng.random() * math.pi
    d.line([(x - math.cos(ang) * 900, y - math.sin(ang) * 900), (x + math.cos(ang) * 900, y + math.sin(ang) * 900)], fill=110, width=2)
# district blocks
for _ in range(220):
    x, y = rng.integers(0, W), rng.integers(0, H)
    w, h = rng.integers(8, 60), rng.integers(8, 50)
    d.rectangle([x, y, x + w, y + h], outline=int(rng.integers(40, 90)))
# city wall ring (Frontier)
cx, cy, R = 1380, 470, 330
d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=150, width=2)
d.ellipse([cx - R - 14, cy - R - 14, cx + R + 14, cy + R + 14], outline=90, width=1)
for k in range(9):
    a0 = k * 2 * math.pi / 9
    d.line([(cx, cy), (cx + math.cos(a0) * R, cy + math.sin(a0) * R)], fill=100, width=1)
d.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], outline=120, width=1)
im = im.filter(ImageFilter.GaussianBlur(0.6))
rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., :3] = 40
rgba[..., 3] = np.asarray(im)
Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "map_dark.png"), optimize=True)
rgba[..., :3] = 240
Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "map_light.png"), optimize=True)

# 4) mosaic blocks (for flat colour backgrounds) – white/black low alpha rects
im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im, "RGBA")
for _ in range(420):
    w = int(rng.choice([20, 30, 40, 60, 80, 120, 160, 240]))
    h = int(rng.choice([20, 30, 40, 60, 80, 120, 200]))
    x = int(rng.integers(0, W // 10)) * 10
    y = int(rng.integers(0, H // 10)) * 10
    if rng.random() < 0.5:
        d.rectangle([x, y, x + w, y + h], fill=(255, 255, 255, int(rng.integers(6, 20))))
    else:
        d.rectangle([x, y, x + w, y + h], fill=(0, 0, 0, int(rng.integers(6, 22))))
for _ in range(60):  # thin L-shaped strokes like circuitry
    x = int(rng.integers(0, W // 10)) * 10
    y = int(rng.integers(0, H // 10)) * 10
    ln = int(rng.integers(40, 300))
    if rng.random() < 0.5:
        d.line([(x, y), (x + ln, y), (x + ln, y + ln // 3)], fill=(255, 255, 255, 22), width=3)
    else:
        d.line([(x, y), (x, y + ln), (x + ln // 2, y + ln)], fill=(0, 0, 0, 22), width=3)
im.save(os.path.join(OUT, "mosaic.png"), optimize=True)

# 6) vignette
yy, xx = np.mgrid[0:H, 0:W]
r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
v = np.clip((r - 0.55) / 0.9, 0, 1) ** 1.6 * 200
rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., 3] = v.astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "vignette.png"), optimize=True)
print("textures done")
