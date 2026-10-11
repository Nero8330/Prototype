#!/usr/bin/env python3
"""Write Cubism runtime settings that go with commander_live2d.psd.

  python3 tools/build_cubism.py

  cubism/expressions/*.exp3.json   one file per expression (tools/expressions.json)
  cubism/commander.physics3.json   hair / aiguillette physics

Both refer to parameter IDs; they take effect once the model built in Cubism
Editor uses the same IDs (listed in README.md).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "cubism")

# preview parameter -> (Cubism parameter IDs, blend)
CUBISM = {
    "ParamEyeOpen": (["ParamEyeLOpen", "ParamEyeROpen"], "Multiply"),
    "ParamEyeSmile": (["ParamEyeLSmile", "ParamEyeRSmile"], "Add"),
    "ParamBrowY": (["ParamBrowLY", "ParamBrowRY"], "Add"),
    "ParamBrowAngle": (["ParamBrowLAngle", "ParamBrowRAngle"], "Add"),
}

# name, output parameter, inputs (id, weight, type), pendulum (length, mobility, delay, acceleration)
PHYSICS = [
    ("前髪", "ParamHairFront", [("ParamAngleX", 60, "X"), ("ParamAngleZ", 60, "Angle"),
                                ("ParamBodyAngleX", 40, "X")], (8, 0.92, 0.85, 1.2)),
    ("横髪 向かって左 外", "ParamHairSideL_Out", [("ParamAngleX", 60, "X"), ("ParamAngleZ", 60, "Angle"),
                                              ("ParamBodyAngleX", 40, "X")], (16, 0.95, 0.8, 1.5)),
    ("横髪 向かって左 内", "ParamHairSideL_In", [("ParamAngleX", 60, "X"), ("ParamAngleZ", 60, "Angle"),
                                             ("ParamBodyAngleX", 40, "X")], (14, 0.95, 0.85, 1.4)),
    ("横髪 向かって右 内", "ParamHairSideR_In", [("ParamAngleX", 60, "X"), ("ParamAngleZ", 60, "Angle"),
                                             ("ParamBodyAngleX", 40, "X")], (12, 0.95, 0.85, 1.4)),
    ("横髪 向かって右 外", "ParamHairSideR_Out", [("ParamAngleX", 60, "X"), ("ParamAngleZ", 60, "Angle"),
                                              ("ParamBodyAngleX", 40, "X")], (15, 0.95, 0.8, 1.5)),
    ("後ろ髪", "ParamHairBack", [("ParamAngleX", 50, "X"), ("ParamAngleZ", 50, "Angle"),
                               ("ParamBodyAngleX", 40, "X")], (15, 0.9, 0.8, 1.0)),
    ("飾緒", "ParamAiguillette", [("ParamBodyAngleX", 100, "X"), ("ParamBodyAngleZ", 60, "Angle")],
     (18, 0.9, 0.75, 1.3)),
]


def expressions():
    exprs = json.load(open(os.path.join(HERE, "expressions.json"), encoding="utf-8"))
    os.makedirs(os.path.join(OUT, "expressions"), exist_ok=True)
    for e in exprs:
        params = []
        for pid, value in e["params"].items():
            ids, blend = CUBISM.get(pid, ([pid], "Add"))
            for cid in ids:
                params.append({"Id": cid, "Value": value, "Blend": blend})
        doc = {"Type": "Live2D Expression", "FadeInTime": 0.3, "FadeOutTime": 0.3, "Parameters": params}
        path = os.path.join(OUT, "expressions", f"{e['file']}.exp3.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
    return exprs


def physics():
    settings, dictionary = [], []
    n_in = n_out = n_vert = 0
    for i, (name, out_id, inputs, (length, mobility, delay, accel)) in enumerate(PHYSICS, 1):
        sid = f"PhysicsSetting{i}"
        dictionary.append({"Id": sid, "Name": name})
        settings.append({
            "Id": sid,
            "Input": [{"Source": {"Target": "Parameter", "Id": pid}, "Weight": w, "Type": t,
                       "Reflect": False} for pid, w, t in inputs],
            "Output": [{"Destination": {"Target": "Parameter", "Id": out_id}, "VertexIndex": 1,
                        "Scale": 1.5, "Weight": 100, "Type": "Angle", "Reflect": False}],
            "Vertices": [
                {"Position": {"X": 0, "Y": 0}, "Mobility": 1, "Delay": 1, "Acceleration": 1, "Radius": 0},
                {"Position": {"X": 0, "Y": length}, "Mobility": mobility, "Delay": delay,
                 "Acceleration": accel, "Radius": length},
            ],
            "Normalization": {"Position": {"Minimum": -10, "Default": 0, "Maximum": 10},
                              "Angle": {"Minimum": -10, "Default": 0, "Maximum": 10}},
        })
        n_in += len(inputs)
        n_out += 1
        n_vert += 2
    doc = {
        "Version": 3,
        "Meta": {"PhysicsSettingCount": len(settings), "TotalInputCount": n_in,
                 "TotalOutputCount": n_out, "VertexCount": n_vert,
                 "EffectiveForces": {"Gravity": {"X": 0, "Y": -1}, "Wind": {"X": 0, "Y": 0}},
                 "PhysicsDictionary": dictionary},
        "PhysicsSettings": settings,
    }
    with open(os.path.join(OUT, "commander.physics3.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)


def main():
    exprs = expressions()
    physics()
    print(f"{OUT}: {len(exprs)} expressions, {len(PHYSICS)} physics groups")


if __name__ == "__main__":
    main()
