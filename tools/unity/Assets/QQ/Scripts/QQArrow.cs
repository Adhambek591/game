// Arrow on a shallow arc toward where the target is; hits whoever of the target's foes' team is near the landing point.
using UnityEngine;

public class QQArrow : MonoBehaviour
{
    Unit from, target; float dmg, t, dur, delay; Vector3 a, b; int team;
    static Mesh mesh; static Material mat;

    public static void Shoot(Unit from, Unit target, float dmg, float delay = 0)
    {
        if (!from || !target) return;
        if (!mesh) { var tmp = GameObject.CreatePrimitive(PrimitiveType.Cube); mesh = tmp.GetComponent<MeshFilter>().sharedMesh; Destroy(tmp); }
        if (!mat) { mat = new Material(Shader.Find("Universal Render Pipeline/Unlit")); mat.SetColor("_BaseColor", new Color(.25f, .18f, .1f)); }
        var go = new GameObject("arrow"); var mf = go.AddComponent<MeshFilter>(); mf.sharedMesh = mesh; go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        go.transform.localScale = new Vector3(.03f, .03f, .8f);
        var ar = go.AddComponent<QQArrow>(); ar.from = from; ar.target = target; ar.dmg = dmg; ar.team = from.team; ar.delay = delay;
        ar.a = from.transform.position + Vector3.up * 1.4f + from.transform.forward * .5f;
        go.transform.position = ar.a; go.SetActive(true);
    }

    void Update()
    {
        if (delay > 0) { delay -= Time.deltaTime; if (delay <= 0 && from) a = from.transform.position + Vector3.up * 1.4f + from.transform.forward * .5f; return; }
        if (t == 0) { b = target ? target.transform.position + Vector3.up * 1.1f : a + Vector3.forward * 10f; dur = Mathf.Max(.25f, (b - a).magnitude / 26f); }
        t += Time.deltaTime; float u = Mathf.Clamp01(t / dur);
        Vector3 p = Vector3.Lerp(a, b, u) + Vector3.up * Mathf.Sin(u * Mathf.PI) * (b - a).magnitude * .08f;
        var dir = p - transform.position; if (dir.sqrMagnitude > 1e-6f) transform.rotation = Quaternion.LookRotation(dir);
        transform.position = p;
        if (u >= 1f)
        {
            var hit = Unit.Nearest(b, 1 - team, 1.3f);
            if (hit) hit.Hit(dmg, from);
            Destroy(gameObject);
        }
    }
}
