"""Download the OFL fonts used by the PV (Google Fonts repo) and subset them to the glyphs the PV uses.
usage: python3 tools/subset_fonts.py   (run from pv/)
"""
import os, re, sys, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
FONTS = {
    "mincho-r": "shipporimincho/ShipporiMincho-Regular.ttf",
    "mincho-m": "shipporimincho/ShipporiMincho-Medium.ttf",
    "mincho-sb": "shipporimincho/ShipporiMincho-SemiBold.ttf",
    "cormorant": "cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf",
    "cormorant-i": "cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf",
    "jost": "jost/Jost%5Bwght%5D.ttf",
    "jost-i": "jost/Jost-Italic%5Bwght%5D.ttf",
}
cache = ".cache/fonts"
out = "assets/fonts"
os.makedirs(cache, exist_ok=True)
os.makedirs(out, exist_ok=True)

text = ""
for f in ["scenes.js", "terms.js", "emblems.js", "index.html", "engine.js"]:
    text += open(f, encoding="utf-8").read()
chars = set(text) | set(chr(c) for c in range(0x20, 0x7F)) | set("、。「」『』！？・―ー…■▍→∞·—〈〉【】（）　")
chars = "".join(sorted(c for c in chars if c >= " "))

for name, path in FONTS.items():
    src = os.path.join(cache, os.path.basename(path).replace("%5B", "[").replace("%5D", "]"))
    if not os.path.exists(src):
        print("download", path)
        urllib.request.urlretrieve(BASE + path, src)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    dst = os.path.join(out, f"{name}.woff2")
    subset.save_font(font, dst, opts)
    print(f"{name:14s} {os.path.getsize(dst)//1024:5d} KB")
