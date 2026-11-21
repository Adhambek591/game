// First playable: Gúlayım and her maidens hold the burnt Sarkop square against three Qalmaq waves that march out
// of the camp at the far end (nobody spawns out of thin air). Wave 3 brings their captain. Win = all waves down.
using System.Collections;
using UnityEngine;

public class QQArena : MonoBehaviour
{
    public static QQArena I;
    [Header("Models (R_*.glb, shared rig)")] public GameObject gulayim, qiz, askar, kamonchi, captain;
    [Header("Weapons")] public GameObject saber, bow, axe;
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
                var m = new Material(ms[i]); m.SetColor("emissiveFactor", Color.black); m.SetTexture("emissiveTexture", null);
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
    int wave, killed, lostMaidens; const int WAVES = 3;

    void Awake() { I = this; Application.targetFrameRate = 60; }

    void Start()
    {
        QQHud.Build();
        player = Spawn(gulayim, new Vector3(0, 0, -16), 0, 620, 34, 1.8f, saber, "Gúlayım");
        player.gameObject.AddComponent<QQPlayer>(); player.speed = 5.2f;
        var cam = Camera.main.GetComponent<QQCam>(); if (cam) cam.target = player.transform;
        for (int i = 0; i < 5; i++) { var q = Spawn(qiz, new Vector3(-4 + i * 2, 0, -19), 0, 300, 16, 1.72f, saber, "qiz"); q.gameObject.AddComponent<QQAI>(); q.speed = 4.4f; }
        StartCoroutine(Run());
    }

    public Unit Spawn(GameObject model, Vector3 pos, int team, float hp, float dmg, float height, GameObject weapon, string name)
    {
        var root = new GameObject(name); root.transform.position = pos; root.transform.rotation = Quaternion.LookRotation(team == 0 ? Vector3.forward : Vector3.back);
        var m = Instantiate(model, root.transform); m.transform.localPosition = Vector3.zero; m.transform.localRotation = Quaternion.identity;
        // normalise height from the bind-pose bounds
        var b = new Bounds(m.transform.position, Vector3.zero); bool any = false;
        foreach (var r in m.GetComponentsInChildren<Renderer>()) { if (!any) { b = r.bounds; any = true; } else b.Encapsulate(r.bounds); }
        float h = any ? b.size.y : height; if (h > .01f) m.transform.localScale *= height / h;
        Look(m, VariantFor(model));
        var rig = m.AddComponent<QQRig>();
        var grip = weapon ? QQFist.Apply(m, rig, height) : null;
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
    }

    IEnumerator Run()
    {
        QQHud.Objective("Sarkop maydonini himoya qiling");
        yield return new WaitForSeconds(1.2f); running = true;
        for (wave = 1; wave <= WAVES; wave++)
        {
            QQHud.Toast(wave + "-to'lqin"); QQHud.Objective("To'lqin " + wave + "/" + WAVES + " — qalmoqlarni yenging");
            int n = 6 + wave * 3, archers = wave >= 2 ? wave : 0;
            for (int i = 0; i < n; i++)
            {
                bool ar = i < archers; var gate = campGate ? campGate.position : new Vector3(0, 0, 26);
                var e = Spawn(ar ? kamonchi : askar, gate + new Vector3(Random.Range(-5f, 5f), 0, Random.Range(0f, 3f)), 1, ar ? 80 : 130 + wave * 20, ar ? 11 : 12 + wave * 2, 1.85f, ar ? bow : saber, ar ? "kamonchi" : "askar");
                e.archer = ar; e.speed = ar ? 3f : 3.4f; e.range = ar ? 10f : 1.8f; e.gameObject.AddComponent<QQAI>();
                yield return new WaitForSeconds(.35f);
            }
            if (wave == WAVES && captain)
            {
                var c = Spawn(captain, (campGate ? campGate.position : new Vector3(0, 0, 26)), 1, 2200, 30, 2.4f, axe, "Yuzboshi");
                c.boss = true; c.speed = 3.6f; c.range = 2.4f; c.radius = .7f; c.gameObject.AddComponent<QQAI>(); QQHud.Toast("Qalmoq yuzboshisi!");
            }
            while (Unit.CountTeam(1) > 0) { if (player.Dead) yield break; yield return null; }
            yield return new WaitForSeconds(1.5f);
        }
        running = false; QQHud.Objective("");
        QQHud.End(true, "Yengilgan dushmanlar: " + killed + "   Halok bo'lgan qizlar: " + lostMaidens);
    }

    public void OnDeath(Unit u)
    {
        if (u.team == 1) killed++;
        else if (u == player) { running = false; QQHud.End(false, "Gúlayım yiqildi. Qaytadan urinib ko'ring."); }
        else lostMaidens++;
    }
}
