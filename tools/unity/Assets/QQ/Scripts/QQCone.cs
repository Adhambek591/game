// Vision cone of a sentry (chapter 3 stealth): a translucent fan on the ground in front of him; gone once he is awake or dead.
using UnityEngine;

public class QQCone : MonoBehaviour
{
    Unit u; MeshRenderer mr;
    public void Init(Unit owner, float radius, float halfAngle)
    {
        u = owner; const int N = 24; var m = new Mesh(); var v = new Vector3[N + 2]; var t = new int[N * 3]; var c = new Color[N + 2];
        v[0] = Vector3.zero; c[0] = new Color(1, .25f, .15f, .35f);
        for (int i = 0; i <= N; i++) { float a = Mathf.Deg2Rad * Mathf.Lerp(-halfAngle, halfAngle, i / (float)N); v[i + 1] = new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a)) * radius; c[i + 1] = new Color(1, .25f, .15f, 0f); }
        for (int i = 0; i < N; i++) { t[i * 3] = 0; t[i * 3 + 1] = i + 1; t[i * 3 + 2] = i + 2; }
        m.vertices = v; m.triangles = t; m.colors = c; m.RecalculateNormals();
        gameObject.AddComponent<MeshFilter>().sharedMesh = m; mr = gameObject.AddComponent<MeshRenderer>();
        var src = QQArena.I ? QQArena.I.fxMat : null; if (src) { var mat = new Material(src); mat.SetColor("_BaseColor", new Color(.55f, .12f, .08f, .22f)); mr.sharedMaterial = mat; }
        mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
    }
    void LateUpdate()
    {
        if (!u || u.Dead || !u.asleep) { Destroy(gameObject); return; }
        transform.position = u.transform.position + Vector3.up * .05f; transform.rotation = Quaternion.Euler(0, u.transform.eulerAngles.y, 0);
    }
}
