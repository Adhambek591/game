// The big crescent sword arc every reference ARPG shows on a swing (Dynasty Legends 2, Call of Dragons, Epic Conquest):
// a curved ribbon mesh sweeping around the attacker at blade height, bright core fading to the edges, growing open over ~0.12 s
// and fading out by 0.3 s. Additive, coloured per move (white-blue slash, gold finisher, cyan spin, red for bosses).
using UnityEngine;

public class QQSlash : MonoBehaviour
{
    static Mesh[] cache = new Mesh[4]; Material mat; float t, life = .3f, sweep; Color col;
    // arc: angle span in degrees, radius, tilt (roll of the swing plane), side +1 = right-to-left
    public static void Spawn(Transform who, Color c, float span, float radius, float tilt, int side, float h = 1.15f)
    {
        var go = new GameObject("slash"); go.transform.position = who.position + Vector3.up * h;
        go.transform.rotation = Quaternion.LookRotation(who.forward) * Quaternion.Euler(0, 0, tilt);   // mirrored by the -1 X scale for left-to-right swings, always in front
        go.transform.localScale = new Vector3(side < 0 ? -1 : 1, 1, 1) * radius;
        var s = go.AddComponent<QQSlash>(); s.col = c; s.sweep = span;
        go.AddComponent<MeshFilter>().sharedMesh = Arc(span);
        var mr = go.AddComponent<MeshRenderer>(); var src = QQArena.I ? QQArena.I.fxMat : null; if (src) { s.mat = new Material(src); s.mat.SetFloat("_Cull", 0); s.mat.SetInt("_Cull", 0); mr.sharedMaterial = s.mat; }   // double-sided: seen from the high camera
        mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        if (s.mat) s.mat.SetColor("_BaseColor", new Color(c.r, c.g, c.b, 0));
    }
    // a flat crescent in the XZ plane centred on the attacker, from -span/2 to +span/2 in front; vertex alpha: bright leading
    // edge (outer rim, newest part of the sweep) fading to transparent at the inner rim and the trailing end
    static Mesh Arc(float span)
    {
        int key = span < 140 ? 0 : span < 200 ? 1 : span < 300 ? 2 : 3; if (cache[key]) return cache[key];
        const int N = 32; var m = new Mesh(); var v = new Vector3[(N + 1) * 3]; var c = new Color[(N + 1) * 3]; var tr = new int[N * 12];
        float sp = key == 0 ? 120 : key == 1 ? 170 : key == 2 ? 240 : 340;
        for (int i = 0; i <= N; i++)
        {
            float u = i / (float)N, a = Mathf.Deg2Rad * Mathf.Lerp(-sp / 2, sp / 2, u); var d = new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a));
            float w = Mathf.Sin(u * Mathf.PI) * .7f + .12f;   // thickest in the middle of the sweep
            float lead = Mathf.Pow(u, 1.6f);                 // later part of the sweep brighter
            v[i * 3] = d * (1f - w * .55f); v[i * 3 + 1] = d * (1f - w * .12f); v[i * 3 + 2] = d * 1.04f;
            c[i * 3] = new Color(1, 1, 1, 0); c[i * 3 + 1] = new Color(1, 1, 1, lead); c[i * 3 + 2] = new Color(1, 1, 1, lead * .3f);
            if (i < N) for (int k = 0; k < 2; k++) { int b = i * 3 + k, o = i * 12 + k * 6; tr[o] = b; tr[o + 1] = b + 3; tr[o + 2] = b + 1; tr[o + 3] = b + 1; tr[o + 4] = b + 3; tr[o + 5] = b + 4; }
        }
        m.vertices = v; m.colors = c; m.triangles = tr; m.RecalculateNormals(); m.RecalculateBounds();
        return cache[key] = m;
    }
    void Update()
    {
        t += Time.deltaTime; float u = t / life; if (u >= 1) { Destroy(gameObject); if (mat) Destroy(mat); return; }
        float a = u < .25f ? u / .25f : 1f - (u - .25f) / .75f;
        if (mat) mat.SetColor("_BaseColor", new Color(col.r * 2.6f, col.g * 2.6f, col.b * 2.6f, a));
        transform.localScale = transform.localScale.normalized.x > 0 ? Vector3.one * transform.localScale.y * (1f + Time.deltaTime * .6f) : new Vector3(-1, 1, 1) * transform.localScale.y * (1f + Time.deltaTime * .6f);
    }
}
