// Small runtime effects: hit sparks, ground shock rings, amulet flash. No assets needed.
using UnityEngine;

public class QQFx : MonoBehaviour
{
    static ParticleSystem sparks; static Material ringMat; static Mesh ringMesh;
    static UnityEngine.UI.Image flashImg; static float flashA;

    static Material AddMat(Color c)
    {
        var src = QQArena.I ? QQArena.I.fxMat : null;
        var m = src ? new Material(src) : new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")); m.SetColor("_BaseColor", c);
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
            var main = sparks.main; main.startLifetime = new ParticleSystem.MinMaxCurve(.18f, .4f); main.startSpeed = new ParticleSystem.MinMaxCurve(4f, 9f); main.startSize = new ParticleSystem.MinMaxCurve(.03f, .07f); main.gravityModifier = 1.2f; main.maxParticles = 600; main.simulationSpace = ParticleSystemSimulationSpace.World; main.playOnAwake = false;
            var em = sparks.emission; em.rateOverTime = 0;
            var sh = sparks.shape; sh.shapeType = ParticleSystemShapeType.Sphere; sh.radius = .1f;
            var r = go.GetComponent<ParticleSystemRenderer>(); var sm = AddMat(Color.white); sm.SetTexture("_BaseMap", Dot()); r.material = sm;
            r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = .035f; r.lengthScale = 1.2f;   // streaks, not squares
            var col = sparks.colorOverLifetime; col.enabled = true; col.color = new Gradient { colorKeys = new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(new Color(1f, .5f, .15f), 1) }, alphaKeys = new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(0, 1) } };
            var sz = sparks.sizeOverLifetime; sz.enabled = true; sz.size = new ParticleSystem.MinMaxCurve(1f, new AnimationCurve(new Keyframe(0, 1), new Keyframe(1, .2f)));
        }
        var ep = new ParticleSystem.EmitParams { position = p, startColor = c, applyShapeToPosition = true };
        sparks.Emit(ep, 14);
    }

    static Texture2D dot;
    static Texture2D Dot()   // soft round sprite for particles
    {
        if (dot) return dot; const int S = 32; dot = new Texture2D(S, S, TextureFormat.RGBA32, false);
        for (int y = 0; y < S; y++) for (int x = 0; x < S; x++) { float d = Vector2.Distance(new Vector2(x + .5f, y + .5f), new Vector2(S / 2f, S / 2f)) / (S / 2f); float a = Mathf.Clamp01(1 - d); dot.SetPixel(x, y, new Color(1, 1, 1, a * a)); }
        dot.Apply(); return dot;
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
        flashA = .28f; flashImg.color = new Color(1f, .85f, .45f, flashA);
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

    // ground warning for an area attack: a full-size ring that pulses and brightens until the blow lands
    public static void Warn(Vector3 p, Color c, float radius, float dur)
    {
        if (!ringMesh) ringMesh = BuildRing();
        var go = new GameObject("warn"); go.AddComponent<MeshFilter>().sharedMesh = ringMesh; var mr = go.AddComponent<MeshRenderer>();
        mr.sharedMaterial = AddMat(c); go.transform.position = p + Vector3.up * .05f; go.transform.localScale = Vector3.one * radius;
        var f = go.AddComponent<QQFx>(); f.Init(radius, mr.sharedMaterial, c); f.warnDur = dur;
    }

    float R, t, warnDur; Material mt; Color col;
    void Init(float r, Material m, Color c) { R = r; mt = m; col = c; }
    void Update()
    {
        if (warnDur > 0)
        {
            t += Time.deltaTime; if (t >= warnDur) { Destroy(gameObject); Destroy(mt); return; }
            float k = t / warnDur; transform.localScale = Vector3.one * R * (1f + .04f * Mathf.Sin(t * 25f));
            mt.SetColor("_BaseColor", new Color(col.r, col.g, col.b, .25f + .75f * k * (.6f + .4f * Mathf.Sin(t * 30f)))); return;
        }
        t += Time.deltaTime; float u = t / .45f; if (u >= 1) { Destroy(gameObject); Destroy(mt); return; }
        transform.localScale = Vector3.one * Mathf.Lerp(.3f, R, 1 - (1 - u) * (1 - u));
        mt.SetColor("_BaseColor", new Color(col.r, col.g, col.b, 1 - u));
    }

    public static void Tick()
    {
        if (flashImg && flashA > 0) { flashA -= Time.deltaTime * 1.4f; flashImg.color = new Color(1f, .85f, .45f, Mathf.Max(0, flashA)); }
    }
}
