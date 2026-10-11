#!/usr/bin/env python3
"""Embed build/parts into viewer/template.html -> viewer/index.html (single file)."""
import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def main():
    meta = json.load(open(os.path.join(ROOT, "build", "parts.json"), encoding="utf-8"))
    parts = []
    for p in meta["parts"]:
        with open(os.path.join(ROOT, "build", "parts", p["file"]), "rb") as f:
            src = "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")
        parts.append({k: p[k] for k in ("id", "name", "group", "x", "y", "w", "h", "visible")} | {"src": src})
    data = {"width": meta["width"], "height": meta["height"], "parts": parts}
    tpl = open(os.path.join(ROOT, "viewer", "template.html"), encoding="utf-8").read()
    expr = json.load(open(os.path.join(HERE, "expressions.json"), encoding="utf-8"))
    out = tpl.replace("/*@@DATA@@*/null", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    out2 = out.replace("/*@@EXPR@@*/[]", json.dumps(expr, ensure_ascii=False))
    assert out != tpl and out2 != out, "placeholder not found"
    out = out2
    path = os.path.join(ROOT, "viewer", "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"{path}: {os.path.getsize(path) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
