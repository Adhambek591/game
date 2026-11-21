// The R_* models have no finger bones: the right hand is modelled open. Like the browser build (engine.js fistify), bend the
// hand-skinned vertices past the knuckles into a fist (once per mesh, on a copy), and return the fist's centre as the grip.
// Vertices are mapped to world through the hand bone (bone matrix * bind pose), so the current pose does not matter.
using System.Collections.Generic;
using UnityEngine;

public static class QQFist
{
    static readonly Dictionary<Mesh, Mesh> done = new Dictionary<Mesh, Mesh>();

    public static Vector3? Apply(GameObject model, QQRig rig, float height)
    {
        var hand = rig.Bone("RightHand"); var fore = rig.Bone("RightForeArm"); if (!hand || !fore) return null;
        SkinnedMeshRenderer smr = null; int hi = -1;
        foreach (var s in model.GetComponentsInChildren<SkinnedMeshRenderer>()) { int i = System.Array.IndexOf(s.bones, hand); if (i >= 0) { smr = s; hi = i; break; } }
        if (!smr || !smr.sharedMesh) return null;
        var M = hand.localToWorldMatrix * smr.sharedMesh.bindposes[hi]; var Mi = M.inverse;   // skin by the hand bone alone, as the browser fistify does
        var src = smr.sharedMesh; Mesh mesh;
        bool fresh = !done.TryGetValue(src, out mesh);
        if (fresh) { mesh = Object.Instantiate(src); mesh.name = src.name + "_fist"; done[src] = mesh; }
        var verts = mesh.vertices; var srcV = src.vertices; var bw = src.boneWeights;
        float S = height / 1.75f;   // world units: the model is already scaled to its height
        Vector3 hp = hand.position, fp = fore.position, d = (hp - fp).normalized;
        Vector3 rootLocalHand = model.transform.InverseTransformPoint(hp);
        Vector3 n = model.transform.TransformDirection(new Vector3(-rootLocalHand.x, 0, 0)); n -= d * Vector3.Dot(n, d); n.Normalize();
        Vector3 ax = Vector3.Cross(d, n).normalized;
        Vector3 k1 = hp + d * .085f * S; float L = .04f * S;
        Vector3 sum = Vector3.zero; int cnt = 0;
        for (int i = 0; i < verts.Length; i++)
        {
            var w = bw[i]; float wh = (w.boneIndex0 == hi ? w.weight0 : 0) + (w.boneIndex1 == hi ? w.weight1 : 0) + (w.boneIndex2 == hi ? w.weight2 : 0) + (w.boneIndex3 == hi ? w.weight3 : 0);
            if (wh < .5f) continue;
            Vector3 v = M.MultiplyPoint3x4(srcV[i]);
            if (fresh)
            {
                float t = Vector3.Dot(v - k1, d);
                if (t > 0)
                {
                    float a1 = Mathf.Min(1f, t / (.02f * S)) * 1.5f; var q = Quaternion.AngleAxis(a1 * Mathf.Rad2Deg, ax);
                    v = k1 + q * (v - k1);
                    if (t > L) { Vector3 k2 = k1 + q * (d * L); var q2 = Quaternion.AngleAxis(1.4f * Mathf.Rad2Deg, ax); v = k2 + q2 * (v - k2); }
                    verts[i] = Mi.MultiplyPoint3x4(v);
                }
            }
            else v = M.MultiplyPoint3x4(verts[i]);
            sum += v; cnt++;
        }
        if (fresh) { mesh.vertices = verts; mesh.RecalculateBounds(); }
        smr.sharedMesh = mesh;
        if (cnt == 0) return null;
        var c = sum / cnt; return (c - hp).magnitude < .2f * S ? c : (Vector3?)null;
    }
}
