// Mocap library shared by every humanoid (all R_*.glb models use one rig). Loaded from Resources/qq_anims.txt
// (made by tools/unity/conv_anims.py from the browser build's anims.json). Values are raw glTF space; QQRig retargets.
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

public static class QQAnimLib
{
    public class Track { public float[] t; public float[] v; }          // v: 4 floats per key (rotation) or 3 (translation)
    public class Clip { public string name; public float dur; public Dictionary<string, Track> rot = new Dictionary<string, Track>(); public Track hipsT; public Dictionary<string, Quaternion> rest; public float hipsY; }   // rest / hipsY: the library this clip came from
    public static Dictionary<string, Quaternion> restR = new Dictionary<string, Quaternion>();
    public static float hipsY = 100f;
    public static Dictionary<string, Clip> clips;

    // Standard humanoid reference pose (what Mecanim / Mixamo retargeting expects): legs straight down, arms out level, FEET POINTING
    // STRAIGHT FORWARD. Meshy auto-rigs bind the feet toed-out and not symmetric (Guloyim: left -28 deg, right +7 deg), which made
    // every character limp with one foot turned out. Mixamo clips are retargeted relative to this pose on both sides.
    public static void TPose(Dictionary<string, Transform> B)
    {
        Transform lu, ru; if (!B.TryGetValue("LeftUpLeg", out lu) || !B.TryGetValue("RightUpLeg", out ru)) return;
        Vector3 right = ru.position - lu.position; right.y = 0; right.Normalize(); Vector3 fwd = Vector3.Cross(right, Vector3.up);
        System.Action<string, string, Vector3> aim = (b, c, dir) => { Transform t, tc; if (!B.TryGetValue(b, out t) || !B.TryGetValue(c, out tc)) return; var d = tc.position - t.position; t.rotation = Quaternion.FromToRotation(d, dir) * t.rotation; };
        aim("LeftArm", "LeftForeArm", -right); aim("LeftForeArm", "LeftHand", -right); aim("RightArm", "RightForeArm", right); aim("RightForeArm", "RightHand", right);
        aim("LeftUpLeg", "LeftLeg", Vector3.down); aim("LeftLeg", "LeftFoot", Vector3.down); aim("RightUpLeg", "RightLeg", Vector3.down); aim("RightLeg", "RightFoot", Vector3.down);
        foreach (var s in new[] { "Left", "Right" })
        {
            Transform f, toe; if (!B.TryGetValue(s + "Foot", out f) || !B.TryGetValue(s + "ToeBase", out toe)) continue;
            var d = toe.position - f.position; var h = new Vector3(d.x, 0, d.z); if (h.sqrMagnitude < 1e-8f) continue;
            f.rotation = Quaternion.FromToRotation(h, fwd * h.magnitude) * f.rotation;   // yaw only: the foot keeps its own pitch
        }
    }

    public static void Load()
    {
        if (clips != null) return;
        clips = new Dictionary<string, Clip>();
        // qq_anims = the browser build's mocap; qq_anims2 = Mixamo retargeted onto our rig (tools: QQMixamo.Bake), its clips replace same-named ones
        foreach (var file in new[] { "qq_anims", "qq_anims2" })
        {
            var ta = Resources.Load<TextAsset>(file); if (!ta) { if (file == "qq_anims") Debug.LogError("qq_anims.txt missing"); continue; }
            ParseLib(ta.text, file == "qq_anims2");
        }
    }

    static void ParseLib(string text, bool own)
    {
        var ci = CultureInfo.InvariantCulture; Clip cur = null; var rest = own ? new Dictionary<string, Quaternion>() : restR; float hy = hipsY;
        foreach (var raw in text.Split('\n'))
        {
            var line = raw.Trim(); if (line.Length == 0) continue;
            var sp = line.Split(' ');
            switch (sp[0])
            {
                case "HIPSY": hy = float.Parse(sp[1], ci); if (!own) hipsY = hy; break;
                case "REST": rest[sp[1]] = new Quaternion(float.Parse(sp[2], ci), float.Parse(sp[3], ci), float.Parse(sp[4], ci), float.Parse(sp[5], ci)); break;
                case "CLIP": cur = new Clip { name = sp[1], dur = float.Parse(sp[2], ci), rest = own ? rest : null, hipsY = own ? hy : 0 }; clips[cur.name] = cur; if (own) seg.Remove(cur.name); break;
                case "SEG": seg[sp[1]] = new Seg(float.Parse(sp[2], ci), float.Parse(sp[3], ci), float.Parse(sp[4], ci)); break;
                case "R":
                case "T":
                    {
                        int n = int.Parse(sp[2]); var tr = new Track { t = new float[n] };
                        for (int i = 0; i < n; i++) tr.t[i] = float.Parse(sp[3 + i], ci);
                        int bar = 3 + n; int m = sp.Length - bar - 1; tr.v = new float[m];
                        for (int i = 0; i < m; i++) tr.v[i] = float.Parse(sp[bar + 1 + i], ci);
                        if (sp[0] == "R") cur.rot[sp[1]] = tr; else if (sp[1] == "Hips") cur.hipsT = tr;
                        break;
                    }
            }
        }
    }

    // Measured timing of every action clip (QQSetup.ClipTiming: speed of the right hand): t0 = where the move starts (the idle
    // lead-in before it is skipped), hit = impact frame (peak hand speed), end = recovered. Gameplay plays only this segment and
    // lands damage exactly on the impact frame (animation principle 9, timing).
    public struct Seg { public float t0, hit, end; public Seg(float a, float b, float c) { t0 = a; hit = b; end = c; } }
    public static readonly Dictionary<string, Seg> seg = new Dictionary<string, Seg> {   // old mocap timings; Mixamo clips bring their own SEG lines
        { "slash", new Seg(.35f, .73f, 1.25f) }, { "attack", new Seg(.45f, 1.10f, 1.45f) }, { "triple", new Seg(.5f, .82f, 1.15f) },
        { "heavy", new Seg(.6f, 1.57f, 1.85f) }, { "spin", new Seg(.6f, .88f, 1.8f) }, { "slam", new Seg(.8f, 1.68f, 2.05f) },
        { "judg", new Seg(.6f, 1.03f, 1.3f) }, { "cast", new Seg(.1f, .68f, 1.05f) }, { "roll", new Seg(.35f, 1.0f, 1.65f) },
        { "taunt", new Seg(1.5f, 2.12f, 2.9f) } };

    // glTF (right-handed) -> Unity (left-handed): the same mirror glTFast applies on import (X axis flipped)
    public static Quaternion Conv(Quaternion q) { return new Quaternion(q.x, -q.y, -q.z, q.w); }
}
