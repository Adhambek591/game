// First playable: Gúlayım and her maidens hold the burnt Sarkop square against three Qalmaq waves that march out
// of the camp at the far end (nobody spawns out of thin air). Wave 3 brings their captain. Win = all waves down.
using System.Collections;
using UnityEngine;

public class QQArena : MonoBehaviour
{
    public static QQArena I;
    [Header("Models (R_*.glb, shared rig)")] public GameObject gulayim, qiz, askar, kamonchi, captain;
    [Header("Weapons")] public GameObject saber, bow, axe, spear;
    [Header("Rigged Meshy models (tools/blender/chars.py)")] public GameObject sarbinaz; public GameObject[] maidens;
    public Texture2D gulayimBlue;
    public Material arrowMat, fxMat;   // made in the editor so their shaders ship in the build (Shader.Find fails in players)
    public Texture2D[] qizVar, askarVar, kamonchiVar;   // outfit atlases (browser build's props/var)

    // The generated models carry an emissive copy of their atlas at full strength, which washes every outfit to one flat tone:
    // switch it off, and optionally swap the base atlas (Gúlayım's blue, per-soldier outfit variants).
    public static void Look(GameObject root, Texture tex)
    {
        foreach (var r in root.GetComponentsInChildren<Renderer>())
        {
            var ms = r.sharedMaterials;
            for (int i = 0; i < ms.Length; i++)
            {
                if (!ms[i] || !ms[i].HasProperty("emissiveFactor")) continue;
                var m = new Material(ms[i]); m.SetColor("emissiveFactor", Color.black); m.SetTexture("emissiveTexture", null); if (m.HasProperty("metallicFactor")) m.SetFloat("metallicFactor", Mathf.Min(m.GetFloat("metallicFactor"), .2f)); if (m.HasProperty("roughnessFactor")) m.SetFloat("roughnessFactor", Mathf.Max(m.GetFloat("roughnessFactor"), .75f));   /* generated maps read as chrome: keep cloth and leather matte, armour only slightly metallic */
                if (tex && m.HasProperty("baseColorTexture")) m.SetTexture("baseColorTexture", tex);
                ms[i] = m;
            }
            r.sharedMaterials = ms;
        }
    }
    Texture2D Pick(Texture2D[] a) { return a != null && a.Length > 0 ? a[Random.Range(0, a.Length)] : null; }
    public Texture2D VariantFor(GameObject model) { return model == qiz ? Pick(qizVar) : model == askar ? Pick(askarVar) : model == kamonchi ? Pick(kamonchiVar) : model == gulayim ? gulayimBlue : null; }
    public Transform campGate;
    public float halfSize = 30f;
    [System.NonSerialized] public Unit player; [System.NonSerialized] public bool running;
    int wave, killed, lostMaidens; bool spawning; public int Wave { get { return wave; } } const int WAVES = 3;

    void Awake() { I = this; Application.targetFrameRate = 60; }

    void Start()
    {
        QQHud.Build(); DynamicGI.UpdateEnvironment(); QQObstacles.Collect();
        QQFeel.Music("battle", .8f); QQFeel.Ambience("amb_fire", .35f);
        player = Spawn(gulayim, new Vector3(0, 0, -16), 0, 620 * QQProgress.HpMul, 34 * QQProgress.DmgMul, 1.8f, saber, "Gúlayım");
        player.gameObject.AddComponent<QQPlayer>(); player.speed = 5.2f;
        var cam = Camera.main.GetComponent<QQCam>(); if (cam) cam.target = player.transform;
        for (int i = 0; i < 5; i++)
        {
            bool sb = i == 2 && sarbinaz;   // Sárbinaz, Gúlayım's deputy, fights with a spear in the middle of the line
            var mdl = sb ? sarbinaz : (maidens != null && maidens.Length > 0 ? maidens[i % maidens.Length] : qiz);
            var q = Spawn(mdl, new Vector3(-4 + i * 2, 0, -19), 0, sb ? 420 : 300, sb ? 22 : 16, sb ? 1.74f : 1.7f, sb && spear ? spear : saber, sb ? "Sárbinaz" : "qiz");
            q.gameObject.AddComponent<QQAI>(); q.speed = 4.4f;
        }
        StartCoroutine(Run());
    }

    // Generated models come out facing different ways: read the facing from the hips (left thigh -> right thigh is the
    // body's right; forward = right x up) and turn the model so it faces the root's forward. Yaw only, rounded to 90°.
    static void FaceForward(GameObject m, Transform root)
    {
        Transform l = null, r = null;
        foreach (var t in m.GetComponentsInChildren<Transform>()) { if (t.name == "LeftUpLeg") l = t; else if (t.name == "RightUpLeg") r = t; }
        if (!l || !r) return;
        Vector3 right = r.position - l.position; right.y = 0; if (right.sqrMagnitude < 1e-6f) return;
        Vector3 f = Vector3.Cross(right.normalized, Vector3.up); Vector3 want = root.forward; want.y = 0;
        float yaw = Vector3.SignedAngle(f, want, Vector3.up); yaw = Mathf.Round(yaw / 90f) * 90f;
        m.transform.rotation = Quaternion.AngleAxis(yaw, Vector3.up) * m.transform.rotation;
    }

    public Unit Spawn(GameObject model, Vector3 pos, int team, float hp, float dmg, float height, GameObject weapon, string name)
    {
        var root = new GameObject(name); root.transform.position = pos; root.transform.rotation = Quaternion.LookRotation(team == 0 ? Vector3.forward : Vector3.back);
        var m = Instantiate(model, root.transform); m.transform.localPosition = Vector3.zero; m.transform.localRotation = Quaternion.identity;
        FaceForward(m, root.transform);
        // normalise height from the bind-pose bounds
        var b = new Bounds(m.transform.position, Vector3.zero); bool any = false;
        foreach (var r in m.GetComponentsInChildren<Renderer>()) { if (!any) { b = r.bounds; any = true; } else b.Encapsulate(r.bounds); }
        float h = any ? b.size.y : height; if (h > .01f) m.transform.localScale *= height / h;
        Look(m, VariantFor(model));
        var rig = m.AddComponent<QQRig>();
        if (QQSpring.Wants(m)) rig.spring = m.AddComponent<QQSpring>();   // layered models: coat skirt + braids on spring chains
        Vector3? grip = null;
        if (weapon && rig.HasFingers) { rig.SampleBind(); var f1 = rig.Bone("RightMiddle1") ?? rig.Bone("RightFingers1"); var hd = rig.Bone("RightHand"); if (f1 && hd) grip = Vector3.Lerp(hd.position, f1.position, .8f); }   // real finger bones: hold at the knuckles
        else if (weapon) grip = QQFist.Apply(m, rig, height);   // older models: bend the open hand into a fist in the mesh
        if (weapon) Arm(rig, weapon, root.transform, height, grip);
        var u = root.AddComponent<Unit>(); u.team = team; u.maxHp = u.hp = hp; u.dmg = dmg; u.displayName = name; u.rig = rig;
        rig.Play("idle", .01f);
        foreach (var r in root.GetComponentsInChildren<Renderer>()) { r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On; }
        return u;
    }

    static void Arm(QQRig rig, GameObject weapon, Transform root, float height, Vector3? grip)
    {
        var hand = rig.Bone("RightHand"); var fore = rig.Bone("RightForeArm"); if (!hand || !fore) return;
        var w = Instantiate(weapon); var d = (hand.position - fore.position).normalized;
        var fwd = root.forward; var up = (fwd - Vector3.Dot(fwd, d) * d).normalized;   // blade perpendicular to the forearm, pointing forward
        w.transform.SetPositionAndRotation(grip ?? hand.position + d * .085f * height / 1.75f, Quaternion.LookRotation(d, up));   // grip = centre of the fist
        w.transform.localScale = Vector3.one * height / 1.75f * .78f;
        w.transform.SetParent(hand, true);
        // sword trail (every great melee game has one): a short additive ribbon from the blade tip, on only while swinging
        var mf = w.GetComponentsInChildren<MeshFilter>(); if (mf.Length == 0 || !I || !I.fxMat) return;
        float far = 0; Vector3 tipL = Vector3.zero;
        foreach (var f in mf) { if (!f.sharedMesh) continue; var bb = f.sharedMesh.bounds; for (int c = 0; c < 8; c++) { var v = bb.center + Vector3.Scale(bb.extents, new Vector3((c & 1) == 0 ? -1 : 1, (c & 2) == 0 ? -1 : 1, (c & 4) == 0 ? -1 : 1)); var wl = w.transform.InverseTransformPoint(f.transform.TransformPoint(v)); if (wl.y > far) { far = wl.y; tipL = wl; } } }   // bounds, not vertices: meshes are not CPU-readable in builds
        if (far <= 0) return;
        var tip = new GameObject("trail"); tip.transform.SetParent(w.transform, false); tip.transform.localPosition = new Vector3(0, far * .92f, 0);
        var tr = tip.AddComponent<TrailRenderer>(); tr.time = .11f; tr.minVertexDistance = .03f; tr.emitting = false;
        tr.widthCurve = new AnimationCurve(new Keyframe(0, .07f * height / 1.75f), new Keyframe(1, 0)); tr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        var m = new Material(I.fxMat); m.SetColor("_BaseColor", new Color(1f, 1f, 1f, .35f)); tr.sharedMaterial = m;
        tr.colorGradient = new Gradient { colorKeys = new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(new Color(.6f, .75f, 1f), 1) }, alphaKeys = new[] { new GradientAlphaKey(.55f, 0), new GradientAlphaKey(0, 1) } };
        root.gameObject.AddComponent<QQTrail>().tr = tr;
    }

    IEnumerator Run()
    {
        QQHud.Objective(QQProgress.Level + "-jang: Sarkop maydonini himoya qiling");
        yield return new WaitForSeconds(1.2f); running = true;
        if (PlayerPrefs.GetInt("qq_hint_atk", 0) == 0) { PlayerPrefs.SetInt("qq_hint_atk", 1); QQHud.Toast("Hujum: yaqinda qilich, uzoqda o'q. Bosib tursangiz — aylanma zarba", 3.5f); }
        for (wave = 1; wave <= WAVES; wave++)
        {
            QQHud.Toast(wave + "-to'lqin"); QQFeel.Sfx("v_drum", null, .9f, 0); QQHud.Objective("To'lqin " + wave + "/" + WAVES + " — qalmoqlarni yenging");
            spawning = true; int n = 6 + wave * 3 + QQProgress.ExtraFoes, archers = wave >= 2 ? wave : 0;
            for (int i = 0; i < n; i++)
            {
                bool ar = i < archers; var gate = campGate ? campGate.position : new Vector3(0, 0, 26);
                var e = Spawn(ar ? kamonchi : askar, gate + new Vector3(Random.Range(-5f, 5f), 0, Random.Range(0f, 3f)), 1, (ar ? 80 : 130 + wave * 20) * QQProgress.FoeHpMul, (ar ? 14 : 18 + wave * 4) * QQProgress.FoeDmgMul, 1.85f, ar ? bow : saber, ar ? "kamonchi" : "askar");
                e.archer = ar; e.speed = ar ? 3f : 3.4f; e.range = ar ? 10f : 1.8f; e.gameObject.AddComponent<QQAI>();
                yield return new WaitForSeconds(.35f);
            }
            if (wave == WAVES && captain)
            {
                var c = Spawn(captain, (campGate ? campGate.position : new Vector3(0, 0, 26)), 1, 2500 * QQProgress.FoeHpMul, 38 * QQProgress.FoeDmgMul, 2.4f, axe, "Yuzboshi");
                c.boss = true; c.speed = 3.6f; c.range = 2.4f; c.radius = .7f; c.gameObject.AddComponent<QQAI>(); QQHud.Toast("Qalmoq yuzboshisi!");
                QQFeel.Music("boss", .9f); QQFeel.Sfx("horn", null, .9f, 0);
            }
            spawning = false;
            while (Unit.CountTeam(1) > 0) { if (player.Dead) yield break; yield return null; }
            yield return new WaitForSeconds(1.5f);
        }
        running = false; QQHud.Objective("");
        QQFeel.Music("win", .9f); QQFeel.Sfx("st_win", null, 1f, 0);
        int best = QQPlayer.I ? QQPlayer.I.BestChain : 0, coins = QQProgress.Reward(killed, lostMaidens, best);
        QQProgress.Coins += coins; QQProgress.Level++;
        QQHud.End(true, "Yengilgan dushmanlar: " + killed + "   Halok bo'lgan qizlar: " + lostMaidens + System.Environment.NewLine + "Eng uzun kombo: " + best + "   +" + coins + " tanga");
    }

    public void OnDeath(Unit u)
    {
        if (u.team == 1) { killed++; if (!spawning && Unit.CountTeam(1) == 0) { QQFeel.SlowMo(.2f, u.boss ? 1.6f : .9f); QQCam.shake = 1f; } }   // last foe of the wave: Arkham's final-blow slow motion
        else if (u == player) { running = false; QQFeel.Sfx("st_lose", null, 1f, 0); QQFeel.SlowMo(.25f, 1.2f); int c = 10 + killed; QQProgress.Coins += c; QQHud.End(false, "Gúlayım yiqildi. +" + c + " tanga" + System.Environment.NewLine + "Kuchingizni oshirib, qaytadan urinib ko'ring."); }
        else lostMaidens++;
    }
}
