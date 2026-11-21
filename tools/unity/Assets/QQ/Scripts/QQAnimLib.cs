// Mocap library shared by every humanoid (all R_*.glb models use one rig). Loaded from Resources/qq_anims.txt
// (made by tools/unity/conv_anims.py from the browser build's anims.json). Values are raw glTF space; QQRig retargets.
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

public static class QQAnimLib
{
    public class Track { public float[] t; public float[] v; }          // v: 4 floats per key (rotation) or 3 (translation)
    public class Clip { public string name; public float dur; public Dictionary<string, Track> rot = new Dictionary<string, Track>(); public Track hipsT; }
    public static Dictionary<string, Quaternion> restR = new Dictionary<string, Quaternion>();
    public static float hipsY = 100f;
    public static Dictionary<string, Clip> clips;

    public static void Load()
    {
        if (clips != null) return;
        clips = new Dictionary<string, Clip>();
        var ta = Resources.Load<TextAsset>("qq_anims");
        if (!ta) { Debug.LogError("qq_anims.txt missing"); return; }
        var ci = CultureInfo.InvariantCulture; Clip cur = null;
        foreach (var raw in ta.text.Split('\n'))
        {
            var line = raw.Trim(); if (line.Length == 0) continue;
            var sp = line.Split(' ');
            switch (sp[0])
            {
                case "HIPSY": hipsY = float.Parse(sp[1], ci); break;
                case "REST": restR[sp[1]] = new Quaternion(float.Parse(sp[2], ci), float.Parse(sp[3], ci), float.Parse(sp[4], ci), float.Parse(sp[5], ci)); break;
                case "CLIP": cur = new Clip { name = sp[1], dur = float.Parse(sp[2], ci) }; clips[cur.name] = cur; break;
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
    public static readonly Dictionary<string, Seg> seg = new Dictionary<string, Seg> {
        { "slash", new Seg(.35f, .73f, 1.25f) }, { "attack", new Seg(.45f, 1.10f, 1.45f) }, { "triple", new Seg(.5f, .82f, 1.15f) },
        { "heavy", new Seg(.6f, 1.57f, 1.85f) }, { "spin", new Seg(.6f, .88f, 1.8f) }, { "slam", new Seg(.8f, 1.68f, 2.05f) },
        { "judg", new Seg(.6f, 1.03f, 1.3f) }, { "cast", new Seg(.1f, .68f, 1.05f) }, { "roll", new Seg(.35f, 1.0f, 1.65f) },
        { "taunt", new Seg(1.5f, 2.12f, 2.9f) } };

    // glTF (right-handed) -> Unity (left-handed): the same mirror glTFast applies on import (X axis flipped)
    public static Quaternion Conv(Quaternion q) { return new Quaternion(q.x, -q.y, -q.z, q.w); }
}
