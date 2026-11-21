// Solid scenery for units and the camera: yurts, towers, carts, the palisade. Read once from the "Sarkop" props at start as
// circles on the ground (long things such as fences become a row of circles). Units are pushed out of them; the camera
// rises over a yurt that would hide Gúlayım (Ghost of Tsushima's camera complaint).
using System.Collections.Generic;
using UnityEngine;

public static class QQObstacles
{
    public struct C { public Vector2 p; public float r, h; }
    public static readonly List<C> All = new List<C>();

    public static void Collect()
    {
        All.Clear(); var root = GameObject.Find("Sarkop"); if (!root) return;
        foreach (Transform t in root.transform)
        {
            var rs = t.GetComponentsInChildren<Renderer>(); if (rs.Length == 0) continue;
            if (rs[0] is ParticleSystemRenderer) continue;
            Bounds b = rs[0].bounds; foreach (var r in rs) if (!(r is ParticleSystemRenderer)) b.Encapsulate(r.bounds);
            if (b.size.y < 1.1f || Mathf.Min(b.size.x, b.size.z) < .5f) continue;   // grass, stones, decals, branches: walk over them
            float sx = b.extents.x, sz = b.extents.z;
            if (Mathf.Max(sx, sz) / Mathf.Max(.01f, Mathf.Min(sx, sz)) < 2f) { All.Add(new C { p = new Vector2(b.center.x, b.center.z), r = Mathf.Min(sx, sz) * .92f, h = b.size.y }); continue; }
            // long object: a row of circles along its long axis
            bool alongX = sx > sz; float half = alongX ? sx : sz, rad = Mathf.Max(.35f, alongX ? sz : sx);
            for (float s = -half + rad; s <= half - rad + .01f; s += rad * 1.2f)
                All.Add(new C { p = new Vector2(b.center.x + (alongX ? s : 0), b.center.z + (alongX ? 0 : s)), r = rad, h = b.size.y });
        }
    }

    public static Vector3 PushOut(Vector3 pos, float radius)
    {
        for (int i = 0; i < All.Count; i++)
        {
            var c = All[i]; float dx = pos.x - c.p.x, dz = pos.z - c.p.y, rr = c.r + radius, m = dx * dx + dz * dz;
            if (m < rr * rr) { float d = Mathf.Sqrt(Mathf.Max(1e-6f, m)); if (d < 1e-3f) { dx = 1; d = 1; } pos.x = c.p.x + dx / d * rr; pos.z = c.p.y + dz / d * rr; }
        }
        return pos;
    }

    // is a tall obstacle between the camera and the target (on the ground plane)?
    public static bool Blocks(Vector3 from, Vector3 to)
    {
        Vector2 a = new Vector2(from.x, from.z), b = new Vector2(to.x, to.z), ab = b - a; float L = ab.sqrMagnitude; if (L < 1e-4f) return false;
        for (int i = 0; i < All.Count; i++)
        {
            var c = All[i]; if (c.h < 2.2f) continue;
            float t = Mathf.Clamp01(Vector2.Dot(c.p - a, ab) / L); if (t < .02f) continue;
            if ((a + ab * t - c.p).sqrMagnitude < (c.r + .3f) * (c.r + .3f)) return true;
        }
        return false;
    }
}
