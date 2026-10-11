"""Load the source illustration PSD and flatten its clipping groups.

The source keeps colours per material (base layer + clipped multiply shading)
and one line-art layer for the whole body. Cubism Editor ignores clipping and
multiply on import, so every base layer is baked together with the layers
clipped to it before the art is split into movable parts.
"""
import numpy as np
from psd_tools import PSDImage


def layer_rgba(layer, size):
    """Layer pixels placed on a full-size float RGBA canvas (0..1)."""
    W, H = size
    out = np.zeros((H, W, 4), np.float32)
    im = layer.topil()
    if im is None:
        return out
    a = np.asarray(im.convert("RGBA"), np.float32) / 255.0
    x0, y0 = layer.left, layer.top
    x1, y1 = min(W, x0 + a.shape[1]), min(H, y0 + a.shape[0])
    sx, sy = max(0, -x0), max(0, -y0)
    out[max(0, y0):y1, max(0, x0):x1] = a[sy:sy + y1 - max(0, y0), sx:sx + x1 - max(0, x0)]
    return out


def bake_clip(base, clips):
    """base: RGBA float; clips: list of (rgba, opacity 0..1, blend name)."""
    rgb = base[..., :3].copy()
    for c, op, mode in clips:
        k = (c[..., 3] * op)[..., None]
        if mode == "MULTIPLY":
            rgb = rgb * (1 - k) + rgb * c[..., :3] * k
        else:
            rgb = rgb * (1 - k) + c[..., :3] * k
    out = base.copy()
    out[..., :3] = rgb
    return out


def over(dst, src):
    """Porter-Duff source-over on straight-alpha float RGBA."""
    sa = src[..., 3:4]
    da = dst[..., 3:4]
    oa = sa + da * (1 - sa)
    with np.errstate(invalid="ignore", divide="ignore"):
        rgb = (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.where(oa > 0, oa, 1)
    return np.concatenate([np.where(oa > 0, rgb, 0), oa], -1)


def load(path):
    """Returns (size, dict name->RGBA) of baked source layers, keyed by layer name."""
    psd = PSDImage.open(path)
    size = psd.size
    baked = {}
    for group in [g for g in psd.descendants() if g.is_group()] + [psd]:
        kids = [l for l in group if not l.is_group()]
        i = 0
        while i < len(kids):
            base = kids[i]
            clips = []
            j = i + 1
            while j < len(kids) and kids[j].clipping:
                c = kids[j]
                clips.append((layer_rgba(c, size), c.opacity / 255.0, c.blend_mode.name))
                j += 1
            if base.visible:
                rgba = bake_clip(layer_rgba(base, size), clips)
                rgba[..., 3] *= base.opacity / 255.0
                baked[base.name] = rgba
            i = j
    return psd, size, baked
