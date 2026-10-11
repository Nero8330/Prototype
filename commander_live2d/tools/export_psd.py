#!/usr/bin/env python3
"""Write build/parts/* into a layered PSD for Live2D Cubism Editor.

  python3 tools/export_psd.py  ->  commander_live2d.psd

Every part is a plain normal-blend pixel layer (no clipping, no masks, no
blend modes) with its line art merged in, grouped into folders that become
Cubism parts. Expression variants are included as hidden layers.
"""
import json
import os

import numpy as np
from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import Group, PixelLayer


def set_name(layer, name, ascii_name):
    """Japanese name in the Unicode block, ASCII fallback in the legacy field."""
    layer.name = name
    layer._record.name = ascii_name


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUILD = os.path.join(ROOT, "build")
OUT = os.path.join(ROOT, "commander_live2d.psd")


def main():
    meta = json.load(open(os.path.join(BUILD, "parts.json"), encoding="utf-8"))
    W, H = meta["width"], meta["height"]
    psd = PSDImage.new("RGBA", (W, H))
    stack = []  # [(path tuple, Group)]
    seen_groups = []

    def container_for(path):
        # close groups that are not a prefix of the new path
        while stack and stack[-1][0] != path[:len(stack[-1][0])]:
            stack.pop()
        while len(stack) < len(path):
            parent = stack[-1][1] if stack else psd
            sub = path[:len(stack) + 1]
            g = Group.new(parent, name="group", open_folder=True)
            set_name(g, sub[-1], f"group{len(seen_groups):02d}")
            seen_groups.append(sub)
            stack.append((sub, g))
        return stack[-1][1] if stack else psd

    seen = set()
    for p in meta["parts"]:
        path = tuple(p["group"].split("/")) if p["group"] else ()
        for i in range(1, len(path) + 1):
            if path[:i] in seen and not any(s[0] == path[:i] for s in stack):
                raise SystemExit(f"group {'/'.join(path[:i])} is not contiguous")
        parent = container_for(path)
        for i in range(1, len(path) + 1):
            seen.add(path[:i])
        im = Image.open(os.path.join(BUILD, "parts", p["file"])).convert("RGBA")
        layer = PixelLayer.frompil(im, parent, name=p["id"], top=p["y"], left=p["x"])
        set_name(layer, p["name"], p["id"])
        layer.visible = bool(p["visible"])
    # merged preview (thumbnails / apps that read the flattened image)
    flat = np.asarray(psd.composite(ignore_preview=True).convert("RGBA"))
    psd._record.image_data.set_data([flat[..., c].tobytes() for c in range(4)],
                                    psd._record.header)
    # the 4th merged channel is transparency: PSD flags that with a negative layer count
    info = psd._record._get_layer_info()
    info.layer_count = -abs(info.layer_count)
    psd._merged_alpha = True
    psd.save(OUT)

    # verify: read back and compare with the rest-pose composite
    back = PSDImage.open(OUT)
    names = [l.name for l in back.descendants() if not l.is_group()]
    assert names == [p["name"] for p in meta["parts"]], "layer order changed"
    ref = np.asarray(Image.open(os.path.join(BUILD, "check_rest.png")).convert("RGB"), np.float32) / 255
    magenta = (ref[..., 0] > 0.99) & (ref[..., 1] < 0.01) & (ref[..., 2] > 0.99)
    diffs = []
    for preview in (False, True):  # layers, then the stored merged image
        comp = np.asarray(back.composite(ignore_preview=not preview).convert("RGBA"),
                          np.float32) / 255
        rgb = comp[..., :3] * comp[..., 3:4] + (1 - comp[..., 3:4])
        diffs.append(np.abs(rgb - ref).max(-1)[~magenta].max() * 255)
    print(f"{OUT}: {len(names)} layers, {os.path.getsize(OUT) / 1e6:.1f} MB, "
          f"max diff vs parts: layers {diffs[0]:.1f}, merged image {diffs[1]:.1f}")


if __name__ == "__main__":
    main()
