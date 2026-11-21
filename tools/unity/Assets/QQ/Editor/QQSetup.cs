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
            var p = AssetDatabase.GUIDToAssetPath(g); var ti = AssetImporter.GetAtPath(p) as TextureImporter; if (!ti) continue;
            bool nor = p.Contains("_nor"), lin = nor || p.Contains("_rough");
            ti.textureType = nor ? TextureImporterType.NormalMap : TextureImporterType.Default; ti.sRGBTexture = !lin; ti.wrapMode = TextureWrapMode.Repeat; ti.anisoLevel = 8; ti.maxTextureSize = 1024;
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

        // light: low warm sun through smoke, soft shadows
        var sun = new GameObject("Sun").AddComponent<Light>(); sun.type = LightType.Directional; sun.color = new Color(1f, .9f, .78f); sun.intensity = 2.3f;
        sun.shadows = LightShadows.Soft; sun.transform.rotation = Quaternion.Euler(32, -38, 0);
        RenderSettings.ambientMode = AmbientMode.Trilight; RenderSettings.ambientSkyColor = new Color(.7f, .72f, .8f); RenderSettings.ambientEquatorColor = new Color(.42f, .36f, .3f); RenderSettings.ambientGroundColor = new Color(.18f, .14f, .11f);
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = new Color(.62f, .58f, .55f); RenderSettings.fogStartDistance = 28; RenderSettings.fogEndDistance = 95;

        // camera
        var camGo = new GameObject("Main Camera"); camGo.tag = "MainCamera"; var cam = camGo.AddComponent<Camera>(); cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = RenderSettings.fogColor; cam.farClipPlane = 140; cam.nearClipPlane = .5f;
        var acd = camGo.AddComponent<UniversalAdditionalCameraData>(); acd.renderPostProcessing = true; acd.antialiasing = AntialiasingMode.FastApproximateAntialiasing;
        camGo.AddComponent<QQCam>(); camGo.transform.position = new Vector3(0, 7.4f, -29.4f); camGo.transform.LookAt(new Vector3(0, 1.4f, -14));
        camGo.AddComponent<AudioListener>();

        // post: ACES, modest bloom, warm grade, vignette
        var vol = new GameObject("Post").AddComponent<Volume>(); vol.isGlobal = true; var prof = ScriptableObject.CreateInstance<VolumeProfile>();
        var tm = prof.Add<Tonemapping>(true); tm.mode.Override(TonemappingMode.ACES);
        var bl = prof.Add<Bloom>(true); bl.intensity.Override(.45f); bl.threshold.Override(1.1f);
        var ca = prof.Add<ColorAdjustments>(true); ca.postExposure.Override(.35f); ca.saturation.Override(-6f); ca.contrast.Override(8f);
        var vg = prof.Add<Vignette>(true); vg.intensity.Override(.28f);
        AssetDatabase.CreateAsset(prof, ART + "Post.asset"); vol.sharedProfile = prof;

        // ground: burnt earth square with a packed-mud lane
        var g = GameObject.CreatePrimitive(PrimitiveType.Plane); g.name = "Ground"; g.transform.localScale = new Vector3(14, 1, 14); g.GetComponent<Renderer>().sharedMaterial = Ground("burned_ground_01", new Color(.95f, .9f, .86f), 28);
        var lane = GameObject.CreatePrimitive(PrimitiveType.Plane); lane.name = "Lane"; lane.transform.position = new Vector3(0, .01f, 4); lane.transform.localScale = new Vector3(1.4f, 1, 7); lane.GetComponent<Renderer>().sharedMaterial = Ground("brown_mud_dry", new Color(.7f, .62f, .52f), 6);
        Object.DestroyImmediate(g.GetComponent<Collider>()); Object.DestroyImmediate(lane.GetComponent<Collider>());

        // burnt yurts around the square, the Qalmaq camp at the far end, fires
        var yurt = Load<GameObject>(ART + "props/B_yurt.glb"); var dressing = new GameObject("Sarkop");
        var rnd = new System.Random(7);
        for (int i = 0; i < 26; i++)
        {
            float a = i / 26f * Mathf.PI * 2, r = 31 + (float)rnd.NextDouble() * 6; var p = new Vector3(Mathf.Cos(a) * r, 0, Mathf.Sin(a) * r);
            if (yurt) { var y = (GameObject)PrefabUtility.InstantiatePrefab(yurt, dressing.transform); y.transform.position = p; y.transform.rotation = Quaternion.Euler(0, (float)rnd.NextDouble() * 360, (float)rnd.NextDouble() * 6 - 3); y.transform.localScale = Vector3.one * (1.1f + (float)rnd.NextDouble() * .3f); Burn(y); }
            if (i % 3 == 0) Fire(p * .93f, dressing.transform);
        }
        var gate = new GameObject("CampGate"); gate.transform.position = new Vector3(0, 0, 26);

        // arena logic
        var ar = new GameObject("Arena").AddComponent<QQArena>();
        ar.gulayim = Load<GameObject>(ART + "models/R_gulayim.glb"); ar.qiz = Load<GameObject>(ART + "models/R_qiz.glb"); ar.askar = Load<GameObject>(ART + "models/R_askar.glb");
        ar.kamonchi = Load<GameObject>(ART + "models/R_kamonchi.glb"); ar.captain = Load<GameObject>(ART + "models/R_qashqir.glb");
        ar.saber = Load<GameObject>(ART + "props/W_saber.glb"); ar.bow = Load<GameObject>(ART + "props/W_bow.glb"); ar.axe = Load<GameObject>(ART + "props/W_axe.glb");
        ar.gulayimBlue = Load<Texture2D>(ART + "tex/gulayim_blue.jpg"); ar.campGate = gate.transform;
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

    static void Fire(Vector3 p, Transform parent)
    {
        var go = new GameObject("Fire"); go.transform.SetParent(parent); go.transform.position = p;
        var ps = go.AddComponent<ParticleSystem>(); var main = ps.main; main.startLifetime = 1.1f; main.startSpeed = 1.6f; main.startSize = new ParticleSystem.MinMaxCurve(.8f, 1.6f); main.startColor = new Color(1f, .55f, .2f, .8f); main.maxParticles = 80;
        var em = ps.emission; em.rateOverTime = 34; var sh = ps.shape; sh.shapeType = ParticleSystemShapeType.Circle; sh.radius = .8f; sh.rotation = new Vector3(-90, 0, 0);
        var col = ps.colorOverLifetime; col.enabled = true; var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(new Color(1f, .8f, .4f), 0), new GradientColorKey(new Color(.9f, .3f, .05f), .5f), new GradientColorKey(new Color(.2f, .18f, .16f), 1) }, new[] { new GradientAlphaKey(.9f, 0), new GradientAlphaKey(.6f, .5f), new GradientAlphaKey(0, 1) }); col.color = gr;
        var sz = ps.sizeOverLifetime; sz.enabled = true; sz.size = new ParticleSystem.MinMaxCurve(1, AnimationCurve.EaseInOut(0, .6f, 1, 1.6f));
        var pr = go.GetComponent<ParticleSystemRenderer>(); var m = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")); m.SetFloat("_Surface", 1); m.SetFloat("_Blend", 2); m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); m.renderQueue = 3000; pr.sharedMaterial = m;
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
        var cam = Camera.main; cam.fieldOfView = 34;
        cam.transform.position = gu.transform.position + new Vector3(0, 7.4f, -13.4f); cam.transform.LookAt(gu.transform.position + new Vector3(0, 1.4f, 1.8f)); Grab(cam, "Builds/shot.png");
        cam.fieldOfView = 30; cam.transform.position = gu.transform.position + new Vector3(1.8f, 1.7f, -4.2f); cam.transform.LookAt(gu.transform.position + new Vector3(0, 1.1f, 0)); Grab(cam, "Builds/shot_close.png");
        Debug.Log("QQ SHOT OK");
    }

    static void Grab(Camera cam, string path)
    {
        var rt = new RenderTexture(1280, 720, 24); cam.targetTexture = rt; cam.Render(); RenderTexture.active = rt;
        var tx = new Texture2D(1280, 720, TextureFormat.RGB24, false); tx.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0); tx.Apply();
        Directory.CreateDirectory("Builds"); File.WriteAllBytes(path, tx.EncodeToPNG()); cam.targetTexture = null; RenderTexture.active = null; rt.Release();
    }

    public static void Apk()
    {
        Directory.CreateDirectory("Builds");
        var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { SCENE }, locationPathName = "Builds/QirqQiz.apk", target = BuildTarget.Android, options = BuildOptions.None });
        Debug.Log("QQ APK " + r.summary.result + " " + r.summary.totalSize / 1048576 + " MB, errors " + r.summary.totalErrors);
        if (r.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}
