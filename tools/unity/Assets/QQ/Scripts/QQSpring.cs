// Spring bones for the layered characters (tools/blender/layered.py): the coat skirt (Skirt<k>_1..3, 8 chains round the hips)
// and the braids (BraidL1..5 / BraidR1..5). Verlet tails with inertia, a pull back to the animated rest pose, gravity, and
// capsule colliders on the thighs / shins / spine so the coat opens over a raised knee and braids stay off the back
// (animation principles 5 "follow-through & overlapping action" and 8 "secondary action").
// Runs after QQRig has posed the skeleton (called from QQRig.Apply), so it reacts to the mocap and to the root moving.
using System.Collections.Generic;
using UnityEngine;

public class QQSpring : MonoBehaviour
{
    class Joint { public Transform t; public Quaternion restLocal; public Vector3 boneAxis; public float len; public Vector3 tail, prevTail; }
    class Chain { public List<Joint> j = new List<Joint>(); public float stiff, drag, grav; public bool skirt; }
    struct Capsule { public Transform a, b; public float r; }
    readonly List<Chain> chains = new List<Chain>(); readonly List<Capsule> cols = new List<Capsule>();
    float scale = 1f; bool ready;

    public static bool Wants(GameObject root)
    {
        foreach (var t in root.GetComponentsInChildren<Transform>()) if (t.name.StartsWith("Skirt") || t.name.StartsWith("Braid")) return true;
        return false;
    }

    void Init()
    {
        if (ready) return; ready = true;
        var map = new Dictionary<string, Transform>(); foreach (var t in GetComponentsInChildren<Transform>()) if (!map.ContainsKey(t.name)) map[t.name] = t;
        Transform hips; map.TryGetValue("Hips", out hips);
        Transform head; map.TryGetValue("Head", out head);
        Transform foot; map.TryGetValue("LeftFoot", out foot);
        scale = hips && foot ? Vector3.Distance(hips.position, foot.position) / .87f : 1f;   // ~1 for a 1.75 m character
        for (int k = 0; k < 16; k++) Add(map, "Skirt" + k + "_", 1, 3, true, .55f, .35f, .25f);
        foreach (var s in new[] { "L", "R", "FL", "FR" }) Add(map, "Braid" + s, 1, 5, false, .3f, .3f, .7f);
        System.Action<string, string, float> cap = (a, b, r) => { Transform ta, tb; if (map.TryGetValue(a, out ta) && map.TryGetValue(b, out tb)) cols.Add(new Capsule { a = ta, b = tb, r = r * scale }); };
        cap("LeftUpLeg", "LeftLeg", .095f); cap("RightUpLeg", "RightLeg", .095f);
        cap("LeftLeg", "LeftFoot", .075f); cap("RightLeg", "RightFoot", .075f);
        cap("Hips", "Spine02", .135f); cap("Spine02", "neck", .14f);
    }

    void Add(Dictionary<string, Transform> map, string prefix, int from, int to, bool skirt, float stiff, float drag, float grav)
    {
        var c = new Chain { stiff = stiff, drag = drag, grav = grav, skirt = skirt };
        for (int i = from; i <= to; i++)
        {
            Transform t; if (!map.TryGetValue(prefix + i, out t)) break;
            Transform next; map.TryGetValue(prefix + (i + 1), out next);
            // tail: the next joint, or the bone continued by its own length for the last one
            Vector3 tailW = next ? next.position : t.position + (t.position - t.parent.position).normalized * (c.j.Count > 0 ? c.j[c.j.Count - 1].len : .1f * scale);
            var jn = new Joint { t = t, restLocal = t.localRotation, len = Vector3.Distance(t.position, tailW) };
            jn.boneAxis = t.InverseTransformDirection(tailW - t.position).normalized; jn.tail = jn.prevTail = tailW; c.j.Add(jn);
        }
        if (c.j.Count > 0) chains.Add(c);
    }

    public void Step(float dt)
    {
        Init(); if (dt <= 0) { foreach (var c in chains) foreach (var j in c.j) { j.t.localRotation = j.restLocal; j.tail = j.prevTail = j.t.position + j.t.rotation * j.boneAxis * j.len; } return; }
        dt = Mathf.Min(dt, 1f / 30f);
        float k60 = dt * 60f;
        foreach (var c in chains)
            foreach (var j in c.j)
            {
                // where the animation would put the tail (rest local rotation under the animated parent)
                Quaternion restW = j.t.parent.rotation * j.restLocal; Vector3 head = j.t.position;
                Vector3 restTail = head + restW * j.boneAxis * j.len;
                Vector3 vel = (j.tail - j.prevTail) * (1f - c.drag);
                Vector3 next = j.tail + vel + (restTail - j.tail) * Mathf.Clamp01(c.stiff * k60) + Vector3.down * c.grav * 9.81f * dt * dt * 3f;
                next = head + (next - head).normalized * j.len;
                // keep off the body
                for (int i = 0; i < cols.Count; i++)
                {
                    var cl = cols[i]; Vector3 a = cl.a.position, b = cl.b.position, ab = b - a;
                    float t = Mathf.Clamp01(Vector3.Dot(next - a, ab) / Mathf.Max(1e-6f, ab.sqrMagnitude)); Vector3 p = a + ab * t, d = next - p;
                    if (d.sqrMagnitude < cl.r * cl.r) next = p + (d.sqrMagnitude > 1e-8f ? d.normalized : -transform.forward) * cl.r;
                }
                next = head + (next - head).normalized * j.len;
                j.prevTail = j.tail; j.tail = next;
                j.t.rotation = Quaternion.FromToRotation(restW * j.boneAxis, next - head) * restW;
            }
    }
}
