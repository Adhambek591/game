// Small runtime effects: hit sparks, ground shock rings, amulet flash. No assets needed.
using UnityEngine;

public class QQFx : MonoBehaviour
{
    static ParticleSystem sparks; static Material ringMat; static Mesh ringMesh;
    static UnityEngine.UI.Image flashImg; static float flashA;

    static Material AddMat(Color c)
    {
        var sh = Shader.Find("Universal Render Pipeline/Particles/Unlit");
        var m = new Material(sh); m.SetColor("_BaseColor", c);
        m.SetFloat("_Surface", 1); m.SetFloat("_Blend", 2);   // transparent, additive
        m.SetOverrideTag("RenderType", "Transparent"); m.renderQueue = 3000;
        m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha); m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.One); m.SetInt("_ZWrite", 0);
        m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); return m;
    }

    public static void Spark(Vector3 p, Color c)
    {
        if (!sparks)
        {
            var go = new GameObject("qq_sparks"); sparks = go.AddComponent<ParticleSystem>(); sparks.Stop();
            var main = sparks.main; main.startLifetime = .35f; main.startSpeed = 6f; main.startSize = .08f; main.gravityModifier = 1.2f; main.maxParticles = 600; main.simulationSpace = ParticleSystemSimulationSpace.World; main.playOnAwake = false;
            var em = sparks.emission; em.rateOverTime = 0;
            var sh = sparks.shape; sh.shapeType = ParticleSystemShapeType.Sphere; sh.radius = .1f;
            var r = go.GetComponent<ParticleSystemRenderer>(); r.material = AddMat(Color.white);
        }
        var ep = new ParticleSystem.EmitParams { position = p, startColor = c, applyShapeToPosition = true };
        sparks.Emit(ep, 14);
    }

    public static void Ring(Vector3 p, Color c, float radius)
    {
        if (!ringMesh) ringMesh = BuildRing();
        var go = new GameObject("ring"); go.AddComponent<MeshFilter>().sharedMesh = ringMesh; var mr = go.AddComponent<MeshRenderer>();
        mr.sharedMaterial = AddMat(c); go.transform.position = p + Vector3.up * .06f;
        go.AddComponent<QQFx>().Init(radius, mr.sharedMaterial, c);
    }

    public static void Flash()
    {
        if (!flashImg)
        {
            var cv = Object.FindFirstObjectByType<Canvas>(); if (!cv) return;
            var go = new GameObject("flash", typeof(RectTransform)); go.transform.SetParent(cv.transform, false); flashImg = go.AddComponent<UnityEngine.UI.Image>(); flashImg.raycastTarget = false;
            var rt = (RectTransform)go.transform; rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = rt.offsetMax = Vector2.zero;
        }
        flashA = .55f; flashImg.color = new Color(1f, .85f, .45f, flashA);
    }

    static Mesh BuildRing()
    {
        const int N = 64; var m = new Mesh(); var v = new Vector3[N * 2]; var uv = new Vector2[N * 2]; var tr = new int[N * 6];
        for (int i = 0; i < N; i++)
        {
            float a = i * Mathf.PI * 2 / N; var d = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a));
            v[i * 2] = d * .85f; v[i * 2 + 1] = d; uv[i * 2] = new Vector2(i / (float)N, 0); uv[i * 2 + 1] = new Vector2(i / (float)N, 1);
            int j = (i + 1) % N; tr[i * 6] = i * 2; tr[i * 6 + 1] = j * 2; tr[i * 6 + 2] = i * 2 + 1; tr[i * 6 + 3] = i * 2 + 1; tr[i * 6 + 4] = j * 2; tr[i * 6 + 5] = j * 2 + 1;
        }
        m.vertices = v; m.uv = uv; m.triangles = tr; m.RecalculateNormals(); return m;
    }

    float R, t; Material mt; Color col;
    void Init(float r, Material m, Color c) { R = r; mt = m; col = c; }
    void Update()
    {
        t += Time.deltaTime; float u = t / .45f; if (u >= 1) { Destroy(gameObject); Destroy(mt); return; }
        transform.localScale = Vector3.one * Mathf.Lerp(.3f, R, 1 - (1 - u) * (1 - u));
        mt.SetColor("_BaseColor", new Color(col.r, col.g, col.b, 1 - u));
    }

    public static void Tick()
    {
        if (flashImg && flashA > 0) { flashA -= Time.deltaTime * 1.4f; flashImg.color = new Color(1f, .85f, .45f, Mathf.Max(0, flashA)); }
    }
}
