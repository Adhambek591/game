// Batch entry points (run with: unity run <project> -- -executeMethod QQSetup.Build / QQSetup.Shot / QQSetup.Apk)
//  Build : texture import settings, ground/props materials, the Arena scene (lights, post, burnt Sarkop dressing), build settings, Android player settings.
//  Shot  : render the scene from the game camera with the fighters posed (edit mode) to Builds/shot.png, to check the look headless.
//  Apk   : Android build to Builds/QirqQiz.apk.
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class QQSetup
{
    const string ART = "Assets/QQ/Art/", SCENE = "Assets/QQ/Arena.unity";

    static T Load<T>(string p) where T : Object { var o = AssetDatabase.LoadAssetAtPath<T>(p); if (!o) Debug.LogWarning("QQ missing " + p); return o; }

    static void TexSettings()
    {
        foreach (var g in AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/QQ/Art/tex" }))
        {
            var p = AssetDatabase.GUIDToAssetPath(g); if (p.EndsWith(".png") || p.EndsWith(".hdr")) continue; var ti = AssetImporter.GetAtPath(p) as TextureImporter; if (!ti) continue;
            bool nor = p.Contains("_nor"), lin = nor || p.Contains("_rough");
            ti.textureType = nor ? TextureImporterType.NormalMap : TextureImporterType.Default; ti.sRGBTexture = !lin; ti.wrapMode = TextureWrapMode.Repeat; ti.anisoLevel = 8; ti.maxTextureSize = 2048;
            ti.SaveAndReimport();
        }
    }

    static Material Ground(string n, Color tint, float tile)
    {
        var m = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        m.SetTexture("_BaseMap", Load<Texture2D>(ART + "tex/" + n + "_diff.jpg")); m.SetColor("_BaseColor", tint);
        var nr = Load<Texture2D>(ART + "tex/" + n + "_nor.jpg"); if (nr) { m.SetTexture("_BumpMap", nr); m.SetFloat("_BumpScale", 1.3f); m.EnableKeyword("_NORMALMAP"); }
        m.SetFloat("_Smoothness", .12f); m.SetTextureScale("_BaseMap", new Vector2(tile, tile));
        AssetDatabase.CreateAsset(m, ART + "M_" + n + ".mat"); return m;
    }

    public static void Build()
    {
        AssetDatabase.Refresh(); TexSettings();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // sky + light: the browser build's HDRI (Poly Haven overcast_soil_puresky) as skybox, ambient and reflections; warm low sun
        var hdr = Load<Texture2D>(ART + "hdr/overcast_soil_puresky_1k.hdr");
        var sky = new Material(Shader.Find("Skybox/Panoramic")); sky.SetTexture("_MainTex", hdr); sky.SetFloat("_Exposure", 1.05f); sky.SetColor("_Tint", new Color(.86f, .8f, .74f)); AssetDatabase.CreateAsset(sky, ART + "M_sky.mat");
        RenderSettings.skybox = sky; RenderSettings.ambientMode = AmbientMode.Trilight; RenderSettings.ambientSkyColor = new Color(.78f, .78f, .82f); RenderSettings.ambientEquatorColor = new Color(.6f, .55f, .5f); RenderSettings.ambientGroundColor = new Color(.28f, .24f, .2f);   /* trilight: needs no baked lighting data in the player */ RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox; RenderSettings.reflectionIntensity = .8f;
        var sun = new GameObject("Sun").AddComponent<Light>(); sun.type = LightType.Directional; sun.color = new Color(1f, .86f, .7f); sun.intensity = 2.2f;
        sun.shadows = LightShadows.Soft; sun.shadowStrength = .85f; sun.transform.rotation = Quaternion.Euler(34, -42, 0); RenderSettings.sun = sun;
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = new Color(.66f, .6f, .55f); RenderSettings.fogStartDistance = 34; RenderSettings.fogEndDistance = 120;

        // camera: MSAA from the URP asset (crisp edges), no FXAA blur
        var camGo = new GameObject("Main Camera"); camGo.tag = "MainCamera"; var cam = camGo.AddComponent<Camera>(); cam.clearFlags = CameraClearFlags.Skybox; cam.farClipPlane = 160; cam.nearClipPlane = .5f; cam.allowMSAA = true;
        var acd = camGo.AddComponent<UniversalAdditionalCameraData>(); acd.renderPostProcessing = true; acd.antialiasing = AntialiasingMode.None;
        camGo.AddComponent<QQCam>(); camGo.transform.position = new Vector3(0, 7.4f, -29.4f); camGo.transform.LookAt(new Vector3(0, 1.4f, -14));
        camGo.AddComponent<AudioListener>();

        // post: ACES, modest bloom, light grade, soft vignette
        var vol = new GameObject("Post").AddComponent<Volume>(); vol.isGlobal = true; var prof = ScriptableObject.CreateInstance<VolumeProfile>();
        var tm = prof.Add<Tonemapping>(true); tm.mode.Override(TonemappingMode.ACES);
        var bl = prof.Add<Bloom>(true); bl.intensity.Override(.35f); bl.threshold.Override(1.15f);
        var ca = prof.Add<ColorAdjustments>(true); ca.postExposure.Override(.25f); ca.saturation.Override(4f); ca.contrast.Override(12f);
        var vg = prof.Add<Vignette>(true); vg.intensity.Override(.18f);
        AssetDatabase.CreateAsset(prof, ART + "Post.asset"); vol.sharedProfile = prof;

        // ground: the browser ground shader (trail with ruts and prints, dark lane, large tint patches) on ash
        var gm = new Material(Shader.Find("QQ/Ground"));
        gm.SetTexture("_BaseMap", Load<Texture2D>(ART + "tex/burned_ground_01_diff.jpg")); gm.SetTexture("_BumpMap", Load<Texture2D>(ART + "tex/burned_ground_01_nor.jpg")); gm.SetTexture("_TrailMap", Load<Texture2D>(ART + "tex/trail_det.jpg"));
        gm.SetColor("_Tint", new Color(1f, .95f, .9f)); gm.SetColor("_RoadTint", new Color(.45f, .37f, .28f)); gm.SetFloat("_Tile", 6f); gm.SetVector("_Lane", new Vector4(13f, .88f, .85f, .2f)); gm.SetVector("_Road", new Vector4(1.6f, 2.6f, 1f, 0f));
        AssetDatabase.CreateAsset(gm, ART + "M_ground.mat");
        var g = GameObject.CreatePrimitive(PrimitiveType.Plane); g.name = "Ground"; g.transform.localScale = new Vector3(24, 1, 24); g.GetComponent<Renderer>().sharedMaterial = gm; Object.DestroyImmediate(g.GetComponent<Collider>());

        fireMat = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")); fireMat.SetFloat("_Surface", 1); fireMat.SetFloat("_Blend", 2); fireMat.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); fireMat.renderQueue = 3000;
        fireMat.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha); fireMat.SetInt("_DstBlend", (int)BlendMode.One); fireMat.SetInt("_ZWrite", 0); AssetDatabase.CreateAsset(fireMat, ART + "M_fire.mat");
        Dress();
        var gate = new GameObject("CampGate"); gate.transform.position = new Vector3(0, 0, 26);

        // arena logic
        var ar = new GameObject("Arena").AddComponent<QQArena>();
        ar.gulayim = Load<GameObject>(ART + "models/R_gulayim.glb"); ar.qiz = Load<GameObject>(ART + "models/R_qiz.glb"); ar.askar = Load<GameObject>(ART + "models/R_askar.glb");
        ar.kamonchi = Load<GameObject>(ART + "models/R_kamonchi.glb"); ar.captain = Load<GameObject>(ART + "models/R_qashqir.glb");
        ar.saber = Load<GameObject>(ART + "props/W_saber.glb"); ar.bow = Load<GameObject>(ART + "props/W_bow.glb"); ar.axe = Load<GameObject>(ART + "props/W_axe.glb");
        ar.gulayimBlue = Load<Texture2D>(ART + "tex/gulayim_blue.jpg"); ar.campGate = gate.transform;
        var am = new Material(Shader.Find("Universal Render Pipeline/Unlit")); am.SetColor("_BaseColor", new Color(.25f, .18f, .1f)); AssetDatabase.CreateAsset(am, ART + "M_arrow.mat"); ar.arrowMat = am;
        var fm = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")); fm.SetFloat("_Surface", 1); fm.SetFloat("_Blend", 2); fm.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); fm.renderQueue = 3000;
        fm.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha); fm.SetInt("_DstBlend", (int)BlendMode.One); fm.SetInt("_ZWrite", 0); AssetDatabase.CreateAsset(fm, ART + "M_fx.mat"); ar.fxMat = fm;
        ar.qizVar = Vars("qiz", "o", "r", "v"); ar.askarVar = Vars("askar", "b", "k", "o", "r"); ar.kamonchiVar = Vars("kamonchi", "b", "o", "r");

        EditorSceneManager.SaveScene(scene, SCENE);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(SCENE, true) };

        PlayerSettings.companyName = "Nukus Animation"; PlayerSettings.productName = "Qirq qiz";
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, "com.nukusanimation.qirqqiz");
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation; PlayerSettings.allowedAutorotateToPortrait = false; PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
        PlayerSettings.allowedAutorotateToLandscapeLeft = true; PlayerSettings.allowedAutorotateToLandscapeRight = true;
        PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        AssetDatabase.SaveAssets();
        Debug.Log("QQ BUILD OK");
    }

    // burnt Sarkop around the square: scorch decals, stones, boulders, dead trees, dry brush and grass outside the lane (sparser inside),
    // burnt carts, a tower and a house, irregular yurt clusters (some burnt, some standing), fires. Seeded: same scene every build.
    static void Dress()
    {
        var root = new GameObject("Sarkop").transform; var R = new System.Random(11);
        System.Func<float, float, float> rr = (a, b) => a + (float)R.NextDouble() * (b - a);
        System.Action<string, Vector3, float, float> put = (path, p, s, tilt) =>
        {
            var src = Load<GameObject>(path); if (!src) return; var o = (GameObject)PrefabUtility.InstantiatePrefab(src, root);
            o.transform.position = p; o.transform.rotation = Quaternion.Euler(rr(-tilt, tilt), rr(0, 360), rr(-tilt, tilt)); o.transform.localScale = Vector3.one * s;
            GameObjectUtility.SetStaticEditorFlags(o, StaticEditorFlags.BatchingStatic);
        };
        string E = ART + "env/";
        var scorch = ScorchMat();
        for (int i = 0; i < 22; i++)
        {
            var d = GameObject.CreatePrimitive(PrimitiveType.Quad); Object.DestroyImmediate(d.GetComponent<Collider>()); d.transform.SetParent(root); float s = rr(4, 9);
            d.transform.localScale = new Vector3(s, s, 1); d.transform.position = new Vector3(rr(-34, 34), .02f + i * .0005f, rr(-36, 40)); d.transform.rotation = Quaternion.Euler(90, rr(0, 360), 0);
            var dr = d.GetComponent<Renderer>(); dr.sharedMaterial = scorch; dr.shadowCastingMode = ShadowCastingMode.Off;
        }
        for (float z = -44; z < 50; z += rr(3.5f, 6))
            foreach (int side in new[] { -1, 1 })
            {
                float x = side * rr(15, 40), k = (float)R.NextDouble(); var p = new Vector3(x, 0, z);
                if (k < .16f) put(E + "boulder_01/boulder_01.glb", p, rr(1.2f, 2.6f), 6);
                else if (k < .42f) put(E + "namaqualand_stones_01/namaqualand_stones_01.glb", p, rr(2.5f, 4.5f), 3);
                else if (k < .52f) put(E + "dead_tree_trunk/dead_tree_trunk.glb", p, rr(1f, 1.6f), 4);
                else if (k < .70f) put(E + "dry_branches_medium_01/dry_branches_medium_01.glb", p, rr(1.2f, 2f), 6);
                else if (k < .95f) { for (int g = 0; g < 3; g++) put(E + "grass_medium_01/grass_medium_01.glb", p + new Vector3(rr(-1.5f, 1.5f), 0, rr(-1.5f, 1.5f)), rr(.9f, 1.5f), 4); }
                else put(E + "Barrel_01/Barrel_01.glb", p, rr(.9f, 1.1f), 10);
            }
        for (int i = 0; i < 70; i++)
        {
            var p = new Vector3(rr(-13, 13), 0, rr(-30, 30)); if (Mathf.Abs(p.x - Mathf.Sin(p.z * .045f) * 1.6f) < 2.6f) continue;
            if (i % 3 == 0) put(E + "namaqualand_stones_01/namaqualand_stones_01.glb", p, rr(.8f, 1.4f), 3); else put(E + "grass_medium_01/grass_medium_01.glb", p, rr(.6f, 1.1f), 3);
        }
        for (int i = 0; i < 5; i++) put(ART + "props/R_arava.glb", new Vector3(rr(14, 24) * (i % 2 == 0 ? 1 : -1), 0, rr(-28, 24)), 2.1f, 8);
        var ysrc = Load<GameObject>(ART + "props/B_yurt.glb");
        for (int c = 0; c < 9; c++)
        {
            float a = c / 9f * Mathf.PI * 2 + rr(-.2f, .2f), r = rr(36, 46); var cc = new Vector3(Mathf.Cos(a) * r, 0, Mathf.Sin(a) * r * 1.1f);
            int n = R.Next(2, 5);
            for (int j = 0; j < n && ysrc; j++)
            {
                var p = cc + new Vector3(rr(-7, 7), 0, rr(-7, 7)); bool burnt = R.NextDouble() < .6;
                var y = (GameObject)PrefabUtility.InstantiatePrefab(ysrc, root); y.transform.position = p; y.transform.rotation = Quaternion.Euler(0, rr(0, 360), burnt ? rr(-5, 5) : 0);
                y.transform.localScale = new Vector3(1.2f, burnt ? rr(.7f, .95f) * 1.2f : 1.2f, 1.2f);
                if (burnt) { Burn(y); if (R.NextDouble() < .5) Fire(p + Vector3.up * .5f, root); }
            }
        }
        put(ART + "props/B_tower.glb", new Vector3(-30, 0, 34), 1.4f, 0); put(ART + "props/B_house.glb", new Vector3(32, 0, 30), 1.3f, 0);
    }

    static Material ScorchMat()
    {
        // ash decal: burned_ground colour with a soft noisy radial alpha, baked into a texture asset
        var src = Load<Texture2D>(ART + "tex/burned_ground_01_diff.jpg"); string path = ART + "tex/scorch.png";
        var ti = (TextureImporter)AssetImporter.GetAtPath(AssetDatabase.GetAssetPath(src)); if (!ti.isReadable) { ti.isReadable = true; ti.SaveAndReimport(); src = Load<Texture2D>(ART + "tex/burned_ground_01_diff.jpg"); }
        const int S = 512; var tx = new Texture2D(S, S, TextureFormat.RGBA32, false);
        for (int y = 0; y < S; y++) for (int x = 0; x < S; x++)
            {
                var c = src.GetPixelBilinear(x / (float)S * 1.5f, y / (float)S * 1.5f); float dx = x / (float)S - .5f, dy = y / (float)S - .5f, d = Mathf.Sqrt(dx * dx + dy * dy) * 2f;
                float n = Mathf.PerlinNoise(x * .02f, y * .02f) * .5f + Mathf.PerlinNoise(x * .06f + 9, y * .06f) * .25f;
                tx.SetPixel(x, y, new Color(c.r * .45f, c.g * .42f, c.b * .4f, Mathf.Clamp01((1f - d) * 1.8f - n * .9f)));
            }
        File.WriteAllBytes(path, tx.EncodeToPNG()); AssetDatabase.ImportAsset(path);
        var m = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")); m.SetTexture("_BaseMap", Load<Texture2D>(path)); m.SetColor("_BaseColor", new Color(.8f, .78f, .76f, 1)); m.SetFloat("_Surface", 1); m.SetFloat("_Blend", 0);
        m.SetOverrideTag("RenderType", "Transparent"); m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha); m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha); m.SetInt("_ZWrite", 0);
        m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); m.renderQueue = 2950;
        AssetDatabase.CreateAsset(m, ART + "M_scorch.mat"); return m;
    }

    static Texture2D[] Vars(string type, params string[] keys)
    {
        var l = new System.Collections.Generic.List<Texture2D>();
        foreach (var k in keys) { var t = Load<Texture2D>(ART + "tex/var/" + type + "_" + k + ".jpg"); if (t) l.Add(t); }
        return l.ToArray();
    }

    static void Burn(GameObject y)
    {
        foreach (var r in y.GetComponentsInChildren<Renderer>())
        {
            var ms = r.sharedMaterials; for (int i = 0; i < ms.Length; i++) { var m = new Material(ms[i]); if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", new Color(.22f, .19f, .17f)); if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", new Color(.22f, .19f, .17f)); ms[i] = m; }
            r.sharedMaterials = ms;
        }
    }

    static Material fireMat;
    static void Fire(Vector3 p, Transform parent)
    {
        var go = new GameObject("Fire"); go.transform.SetParent(parent); go.transform.position = p;
        var ps = go.AddComponent<ParticleSystem>(); var main = ps.main; main.startLifetime = 1.1f; main.startSpeed = 1.6f; main.startSize = new ParticleSystem.MinMaxCurve(.8f, 1.6f); main.startColor = new Color(1f, .55f, .2f, .8f); main.maxParticles = 80;
        var em = ps.emission; em.rateOverTime = 34; var sh = ps.shape; sh.shapeType = ParticleSystemShapeType.Circle; sh.radius = .8f; sh.rotation = new Vector3(-90, 0, 0);
        var col = ps.colorOverLifetime; col.enabled = true; var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(new Color(1f, .8f, .4f), 0), new GradientColorKey(new Color(.9f, .3f, .05f), .5f), new GradientColorKey(new Color(.2f, .18f, .16f), 1) }, new[] { new GradientAlphaKey(.9f, 0), new GradientAlphaKey(.6f, .5f), new GradientAlphaKey(0, 1) }); col.color = gr;
        var sz = ps.sizeOverLifetime; sz.enabled = true; sz.size = new ParticleSystem.MinMaxCurve(1, AnimationCurve.EaseInOut(0, .6f, 1, 1.6f));
        var pr = go.GetComponent<ParticleSystemRenderer>(); pr.sharedMaterial = fireMat;
        var l = new GameObject("FireLight").AddComponent<Light>(); l.transform.SetParent(go.transform); l.transform.localPosition = Vector3.up * 1.5f; l.type = LightType.Point; l.color = new Color(1f, .55f, .2f); l.range = 12; l.intensity = 3;
    }

    // ---- headless look check: pose the fighters and render the game camera ----
    public static void Shot()
    {
        EditorSceneManager.OpenScene(SCENE);
        var ar = Object.FindFirstObjectByType<QQArena>(); QQAnimLib.Load();
        var units = new System.Collections.Generic.List<Unit>();
        var gu = ar.Spawn(ar.gulayim, new Vector3(0, 0, -16), 0, 600, 30, 1.8f, ar.saber, "Gúlayım"); units.Add(gu);
        for (int i = 0; i < 4; i++) units.Add(ar.Spawn(ar.qiz, new Vector3(-3 + i * 2, 0, -18.5f), 0, 100, 10, 1.72f, ar.saber, "qiz"));
        for (int i = 0; i < 6; i++) units.Add(ar.Spawn(i < 2 ? ar.kamonchi : ar.askar, new Vector3(-5 + i * 2, 0, -9 + (i % 2)), 1, 100, 10, 1.85f, i < 2 ? ar.bow : ar.saber, "askar"));
        string[] poses = { "combat", "slash", "run", "attack", "idle", "heavy" }; int k = 0;
        foreach (var u in units) { u.rig.Play(poses[k++ % poses.Length], .01f); u.rig.SampleAt(.35f); }
        DynamicGI.UpdateEnvironment();
        var cam = Camera.main; cam.fieldOfView = 34;
        Grab(cam, "Builds/_warm.png");   // first render uploads the swapped textures; without it far characters show one stale atlas
        cam.transform.position = gu.transform.position + new Vector3(0, 7.4f, -13.4f); cam.transform.LookAt(gu.transform.position + new Vector3(0, 1.4f, 1.8f)); Grab(cam, "Builds/shot.png");
        cam.fieldOfView = 30; cam.transform.position = gu.transform.position + new Vector3(1.8f, 1.7f, -4.2f); cam.transform.LookAt(gu.transform.position + new Vector3(0, 1.1f, 0)); Grab(cam, "Builds/shot_close.png");
        cam.fieldOfView = 12; cam.transform.position = gu.transform.position + new Vector3(0, 7.4f, -13.4f); cam.transform.LookAt(gu.transform.position + new Vector3(0, 1.2f, 0)); Grab(cam, "Builds/shot_zoom.png");
        Debug.Log("QQ SHOT OK");
    }

    static void Grab(Camera cam, string path)
    {
        var rt = new RenderTexture(1280, 720, 24); cam.targetTexture = rt; cam.Render(); RenderTexture.active = rt;
        var tx = new Texture2D(1280, 720, TextureFormat.RGB24, false); tx.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0); tx.Apply();
        Directory.CreateDirectory("Builds"); File.WriteAllBytes(path, tx.EncodeToPNG()); cam.targetTexture = null; RenderTexture.active = null; rt.Release();
    }

    // ---- character sheet: every model, eye-level studio views (front 3/4 + side), one PNG each in Builds/chars ----
    public static void Gallery()
    {
        EditorSceneManager.OpenScene(SCENE);
        var ar = Object.FindFirstObjectByType<QQArena>(); QQAnimLib.Load();
        foreach (var t in Object.FindObjectsByType<Transform>(FindObjectsSortMode.None)) if (t && t.name == "Sarkop") { foreach (Transform c in t) if ((c.position - Vector3.zero).sqrMagnitude < 64) c.gameObject.SetActive(false); }
        var saber = ar.saber; var axe = ar.axe; var bow = ar.bow; var spear = Load<GameObject>(ART + "props/W_spear.glb");
        var list = new (string file, string name, GameObject wpn, float h, string pose)[] {
            ("R_gulayim", "Gulayim", saber, 1.8f, "combat"), ("R_sarbinaz", "Sarbinaz", spear, 1.8f, "combat"), ("R_qiz", "Qiz", saber, 1.72f, "idle"),
            ("R_allayar", "Allayar", saber, 1.85f, "idle"), ("R_otbasqan", "Otbasqan", saber, 1.9f, "idle"), ("R_yigit", "Yigit (Allayar ug'li / asir)", saber, 1.8f, "idle"),
            ("R_ona", "Ona", null, 1.65f, "idle"), ("R_askar", "Qalmoq askari", saber, 1.85f, "combat"), ("R_kamonchi", "Qalmoq kamonchisi", bow, 1.85f, "idle"),
            ("R_shaman", "Shaman", spear, 1.85f, "idle"), ("R_surtaysha", "Surtaysha", axe, 2.0f, "combat"), ("R_qashqir", "Qasqir", axe, 2.4f, "combat"),
            ("R_jallod", "Jallad", null, 2.3f, "combat"), ("R_qargashiq", "Qargashiq", axe, 2.3f, "combat"), ("R_qunqar", "Qunqar", null, 4.2f, "idle"),
            ("R_qumdev", "Qum devi", null, 4.5f, "idle"), ("R_bori4", "Bori", null, 1.2f, "idle"), ("R_aydarho", "Aydarha", null, 5f, "idle") };
        var cam = Camera.main; cam.GetComponent<QQCam>().enabled = false; Directory.CreateDirectory("Builds/chars");
        foreach (var e in list)
        {
            var model = Load<GameObject>(ART + "models/" + e.file + ".glb"); if (!model) continue;
            var u = ar.Spawn(model, Vector3.zero, 0, 100, 10, e.h, e.wpn, e.name);
            u.transform.rotation = Quaternion.LookRotation(Vector3.back);   // face the camera side
            if (u.rig.Has(e.pose)) { u.rig.Play(e.pose, .01f); u.rig.SampleAt(.3f); }
            // frame from the renderers' world bounds (works for the quadruped and the dragon too)
            var b = new Bounds(u.transform.position + Vector3.up * e.h * .5f, Vector3.one * .1f);
            foreach (var r in u.GetComponentsInChildren<Renderer>()) b.Encapsulate(r.bounds);
            float size = Mathf.Max(b.size.y, Mathf.Max(b.size.x, b.size.z) * .75f); var c = b.center;
            var sheet = new Texture2D(1280, 720, TextureFormat.RGB24, false);
            float[] yaw = { 28f, 90f };
            for (int v = 0; v < 2; v++)
            {
                cam.fieldOfView = 28; float dist = size * .62f / Mathf.Tan(14f * Mathf.Deg2Rad) + .4f;
                var dir = Quaternion.Euler(4, 180 + yaw[v], 0) * Vector3.forward;   // slightly above eye level, in front / at the side
                cam.transform.position = c - dir * dist; cam.transform.LookAt(c);
                var rt = new RenderTexture(640, 720, 24); cam.targetTexture = rt; cam.aspect = 640f / 720f; cam.Render(); cam.Render(); RenderTexture.active = rt;
                sheet.ReadPixels(new Rect(0, 0, 640, 720), v * 640, 0); cam.targetTexture = null; RenderTexture.active = null; rt.Release();
            }
            sheet.Apply(); File.WriteAllBytes("Builds/chars/" + e.file.Substring(2) + ".png", sheet.EncodeToPNG());
            Object.DestroyImmediate(u.gameObject);
        }
        Debug.Log("QQ GALLERY OK");
    }

    public static void Win()
    {
        Directory.CreateDirectory("Builds/win");
        var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { SCENE }, locationPathName = "Builds/win/QirqQiz.exe", target = BuildTarget.StandaloneWindows64, options = BuildOptions.None });
        Debug.Log("QQ WIN " + r.summary.result + " errors " + r.summary.totalErrors);
        if (r.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded) EditorApplication.Exit(1);
    }

    public static void Apk()
    {
        Directory.CreateDirectory("Builds");
        var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { SCENE }, locationPathName = "Builds/QirqQiz.apk", target = BuildTarget.Android, options = BuildOptions.None });
        Debug.Log("QQ APK " + r.summary.result + " " + r.summary.totalSize / 1048576 + " MB, errors " + r.summary.totalErrors);
        if (r.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}
