// Team read-out like the reference ARPGs: a soft coloured ring under every fighter (blue = ours, red = Qalmaq, gold = Guloyim)
// and a small HP bar over his head while he is hurt or fighting. World-space quads, one shared material per colour.
using UnityEngine;

public class QQBars : MonoBehaviour
{
    Unit u; Transform ring, bar, fill; float shown = 1, seen; static Material mRing0, mRing1, mRingP, mBack, mFill0, mFill1; static Mesh quad;
    static Material M(Color c)   // alpha-blended (not additive: additive vanishes on the bright ground)
    {
        var src = QQArena.I ? QQArena.I.fxMat : null; if (!src) return null; var m = new Material(src);
        m.SetFloat("_Blend", 0); m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha); m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        m.SetColor("_BaseColor", c); m.renderQueue = 2960; return m;
    }
    static Material Solid(Color c)
    {
        var m = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? (QQArena.I ? QQArena.I.arrowMat.shader : null)); m.SetColor("_BaseColor", c); return m;
    }
    void Start()
    {
        u = GetComponent<Unit>(); if (!u) { enabled = false; return; }
        if (!quad) { var t = GameObject.CreatePrimitive(PrimitiveType.Quad); quad = t.GetComponent<MeshFilter>().sharedMesh; Destroy(t); }
        if (mRing0 == null) { mRing0 = M(new Color(.2f, .5f, 1f, .85f)); mRing1 = M(new Color(.95f, .15f, .1f, .85f)); mRingP = M(new Color(1f, .82f, .3f, .95f));
            var am = QQArena.I.arrowMat; mBack = new Material(am); mBack.SetColor("_BaseColor", new Color(.05f, .04f, .04f)); mFill0 = new Material(am); mFill0.SetColor("_BaseColor", new Color(.3f, .85f, .35f)); mFill1 = new Material(am); mFill1.SetColor("_BaseColor", new Color(.95f, .2f, .15f)); }
        ring = Make("ring", u.isPlayer ? mRingP : u.team == 0 ? mRing0 : mRing1, QQFx.DiscMesh());
        ring.localScale = Vector3.one * (u.radius * 2.6f); ring.localRotation = Quaternion.Euler(90, 0, 0);
        if (!u.isPlayer && !u.boss)
        {
            bar = Make("bar", mBack, quad); bar.localScale = new Vector3(1f, .1f, 1); fill = Make("fill", u.team == 0 ? mFill0 : mFill1, quad); fill.localScale = new Vector3(.96f, .07f, 1);
        }
    }
    Transform Make(string n, Material m, Mesh mesh)
    {
        var g = new GameObject(n); g.transform.SetParent(transform, false); g.AddComponent<MeshFilter>().sharedMesh = mesh; var r = g.AddComponent<MeshRenderer>(); r.sharedMaterial = m;
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; r.receiveShadows = false; return g.transform;
    }
    void LateUpdate()
    {
        if (!u || u.Dead || u.isCaptive) { if (ring) ring.gameObject.SetActive(false); if (bar) { bar.gameObject.SetActive(false); fill.gameObject.SetActive(false); } if (u && u.Dead) enabled = false; return; }
        ring.gameObject.SetActive(!u.asleep || u.team == 0); ring.position = new Vector3(transform.position.x, .04f, transform.position.z);
        if (!bar) return;
        float f = Mathf.Clamp01(u.hp / u.maxHp); if (f < shown - .001f) seen = 4f; shown = Mathf.MoveTowards(shown, f, Time.deltaTime);
        seen -= Time.deltaTime; bool on = seen > 0 || f < .999f && !u.asleep;
        bar.gameObject.SetActive(on); fill.gameObject.SetActive(on); if (!on) return;
        var cam = Camera.main; if (!cam) return; float h = (u.boss ? 3.2f : 2.25f) * (transform.lossyScale.y);
        Vector3 top = transform.position + Vector3.up * h; Quaternion face = Quaternion.LookRotation(cam.transform.forward, cam.transform.up);
        bar.position = top; bar.rotation = face;
        fill.rotation = face; fill.localScale = new Vector3(.96f * f, .07f, 1); fill.position = top - cam.transform.right * (.48f * (1 - f)) - cam.transform.forward * .01f;
    }
}
