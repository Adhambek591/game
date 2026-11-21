// Chapter 1 "Yonayotgan Sarkop" (port of the browser missions 1-1 / 1-3 / 1-4, author's story):
// Gúlayım rides home from Qıran tawı to burning Sarkop. She frees captives tied in the streets (rescued men join her army),
// finds her mother who gives her the father's amulet (the amulet button is locked until then), breaks the guard posts,
// Sárbinaz and the maidens arrive from behind, the horde strikes from the rear, and at the end of the street Qasqır waits:
// Gúlayım fights him ALONE (author's rule), his spirit flows as gold light into the amulet.
// The street is closed by three palisade gates that drop when their part is done; nobody spawns out of thin air
// (reinforcements march in from the far end or from behind).
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class QQMission : MonoBehaviour
{
    public static QQMission I;
    public Transform[] gates;                       // palisade parents, set by QQSetup.BuildCh1
    [System.NonSerialized] public float wallZ = -999f;   // Gúlayım's side cannot pass this z while a gate is closed
    [System.NonSerialized] public Vector3? target;       // current objective point (marker, bot navigation)
    [System.NonSerialized] public bool amuletLocked = true;
    int nextGroup = 1, captivesTotal, captivesSaved; readonly List<Prisoner> captives = new List<Prisoner>();
    GameObject marker;
    class Prisoner { public Unit u; public Vector3 p; public bool freed; public GameObject ring; }
    // where an autoplayer should head: the objective, else the nearest captive still tied within 30 m
    public Vector3? BotGoal { get { Vector3? best = null; float bd = 900f; foreach (var c in captives) { if (c.freed || !QQArena.I.player) continue; float d = (c.p - QQArena.I.player.transform.position).sqrMagnitude; if (d < bd && c.p.z > wallZ) { bd = d; best = c.p; } } return best ?? target; } }

    void Awake() { I = this; }

    QQArena A { get { return QQArena.I; } }
    Unit P { get { return QQArena.I.player; } }

    public void Begin() { StartCoroutine(Run()); }

    // ---------------- building blocks ----------------
    int Post(params (bool archer, Vector3 p)[] list)
    {
        int g = nextGroup++;
        foreach (var e in list)
        {
            var u = A.Spawn(e.archer ? A.kamonchi : A.askar, e.p, 1, (e.archer ? 80 : 150) * QQProgress.FoeHpMul, (e.archer ? 14 : 20) * QQProgress.FoeDmgMul, 1.85f, e.archer ? A.bow : A.saber, e.archer ? "kamonchi" : "askar");
            u.archer = e.archer; u.speed = e.archer ? 3f : 3.4f; u.range = e.archer ? 10f : 1.8f; u.group = g; u.asleep = true; u.wakeR = 13f;
            u.transform.rotation = Quaternion.LookRotation(Vector3.forward); u.gameObject.AddComponent<QQAI>();
        }
        return g;
    }
    static (bool, Vector3) S(float x, float z) { return (false, new Vector3(x, 0, z)); }
    static (bool, Vector3) Ar(float x, float z) { return (true, new Vector3(x, 0, z)); }

    // a marching group (reinforcement) that is awake at once and comes from a given point
    int March(Vector3 from, int soldiers, int archers)
    {
        var l = new List<(bool, Vector3)>();
        for (int i = 0; i < soldiers; i++) l.Add((false, from + new Vector3(Random.Range(-5f, 5f), 0, Random.Range(-2f, 2f))));
        for (int i = 0; i < archers; i++) l.Add((true, from + new Vector3(Random.Range(-5f, 5f), 0, Random.Range(-2f, 2f))));
        int g = Post(l.ToArray()); Unit.WakeGroup(g); return g;
    }

    IEnumerator Clear(int g) { while (Unit.CountGroup(g) > 0) { if (P.Dead) yield break; yield return null; } }
    IEnumerator Reach(Vector3 p, float r)
    {
        target = p; ShowMarker(p);
        while ((P.transform.position - p).sqrMagnitude > r * r) { if (P.Dead) yield break; yield return null; }
        target = null; if (marker) Destroy(marker);
    }
    void ShowMarker(Vector3 p)
    {
        if (marker) Destroy(marker);
        marker = new GameObject("marker"); marker.transform.position = p; marker.AddComponent<QQMarker>();
    }
    IEnumerator Say(params (string who, string text)[] lines)
    {
        bool was = A.running; A.running = false; foreach (var u in Unit.All) { u.telegraph = 0; }
        foreach (var l in lines)
        {
            QQHud.Say(l.who, l.text); float t = Mathf.Clamp(l.text.Length * .055f, 2.2f, 5.5f);
            while (t > 0 && !QQHud.SkipPressed()) { t -= Time.unscaledDeltaTime; yield return null; }
            yield return null;
        }
        QQHud.Say(null, null); A.running = was;
    }
    IEnumerator OpenGate(int k, float nextWall)
    {
        var g = gates != null && k < gates.Length ? gates[k] : null; QQFeel.Sfx("slam", g ? g.position : (Vector3?)null, .8f, 0); QQCam.shake = .5f;
        wallZ = nextWall;
        if (!g) yield break;
        Vector3 a = g.position, b = a + Vector3.down * 3.2f; float t = 0;
        while (t < 1) { t += Time.deltaTime / 1.4f; g.position = Vector3.Lerp(a, b, t * t); yield return null; }
        g.gameObject.SetActive(false);
    }
    void Captive(Vector3 p)
    {
        if (!A.yigit) return;
        var u = A.Spawn(A.yigit, p, 0, 260, 15, 1.78f, null, "asir"); u.inv = 9999; u.isCaptive = true;
        u.transform.rotation = Quaternion.LookRotation(Vector3.back); u.rig.Play("hit", .01f, false, true); u.rig.speed = 0;   // slumped, tied
        var ring = new GameObject("captive_marker"); ring.transform.position = p; ring.AddComponent<QQMarker>();
        captives.Add(new Prisoner { u = u, p = p, ring = ring }); captivesTotal++;
    }
    void TickCaptives()
    {
        foreach (var c in captives)
        {
            if (c.freed || !c.u) continue;
            if ((P.transform.position - c.p).sqrMagnitude < 2.6f * 2.6f)
            {
                c.freed = true; captivesSaved++; if (c.ring) Destroy(c.ring); c.u.inv = 0; c.u.isCaptive = false; c.u.rig.speed = 1f; c.u.rig.Play("taunt", .2f, false, true);
                if (A.saber) QQArena.ArmUnit(c.u, A.saber, 1.78f);
                c.u.gameObject.AddComponent<QQAI>(); c.u.speed = 4.2f; c.u.displayName = "batır";
                QQFeel.Sfx("coin", null, .8f); QQFx.Ring(c.p, new Color(1f, .85f, .4f), 2f); QQProgress.Coins += 10;
                QQHud.Toast("Asir ozod! Batır qo'shiningizga qo'shildi " + captivesSaved + "/" + captivesTotal);
            }
        }
    }
    void Ally(GameObject model, string name, Vector3 p, float hp, float dmg, float h, GameObject wpn)
    {
        var q = A.Spawn(model, p, 0, hp, dmg, h, wpn, name); q.gameObject.AddComponent<QQAI>(); q.speed = 4.6f;
    }

    void Update() { TickCaptives(); }

    // ---------------- the chapter ----------------
    IEnumerator Run()
    {
        QQFeel.Music("calm", .7f); A.running = false; wallZ = -30f; amuletLocked = true;
        Captive(new Vector3(-8f, 0, -11f)); Captive(new Vector3(8.5f, 0, -42f)); Captive(new Vector3(-8f, 0, -76f)); Captive(new Vector3(7.5f, 0, -92f));
        if (A.ona) { var mo = A.Spawn(A.ona, new Vector3(2f, 0, -22f), 0, 100, 1, 1.65f, null, "Ona"); mo.isCaptive = true; mo.inv = 9999; mo.transform.rotation = Quaternion.LookRotation(Vector3.forward); }
        int g0 = Post(S(4.5f, -14f));                                                                         // a lone looter in the first street
        int gA = Post(S(-2.2f, -46f), S(1.4f, -47f), S(5f, -50f), Ar(-7f, -54f), Ar(7f, -54f));               // guard post behind gate 1
        int gC = Post(S(-6f, -84f), S(6f, -84f), S(-3f, -88f), S(3f, -88f), S(0f, -91f), Ar(-8f, -93f), Ar(8f, -93f));   // the horde's camp
        QQHud.Title("1-bob", "Yonayotgan Sarkop");
        yield return new WaitForSeconds(3f);
        A.running = true;
        QQHud.Objective("Onangizni toping  ·  asirlarni ozod qiling"); QQHud.Hint("Hujum: yaqinda qilich, uzoqda o'q. Bosib tursangiz — aylanma zarba");
        yield return Reach(new Vector3(2f, 0, -21f), 3.4f);
        yield return Say(("ona", "Guloyim… Kech qolding, bolam. Otang ham, olti akang ham yurt uchun jon berdi."), ("gulayim", "Ona… Bu ne ko'rgilik? Qolgan xalqimiz qayerda?"),
                         ("ona", "Surtaysha barchani zanjirband qilib, qalmoq yurtiga haydab ketdi."), ("ona", "Mana bu tumorni ol — u otangning duosi va ruhi. Uni asra va xalqingni qullikdan qutqar, qizim."),
                         ("gulayim", "Qasam ichaman, ona! Birorta ham sarkoplikni dushman qo'lida qoldirmayman!"));
        amuletLocked = false; QQFeel.Sfx("power", null, 1f, 0); QQFx.Flash(); QQFx.Ring(P.transform.position, new Color(1f, .8f, .3f), 5f); QQHud.Toast("Tumor sizda! (E)", 2.5f);
        yield return Clear(g0);
        yield return OpenGate(0, -66f); QQFeel.Music("battle", .8f); QQHud.Objective("Shaharda qolgan qalmoq qo'riqchilarini yo'q qiling");
        yield return Clear(gA);
        int r1 = March(new Vector3(0, 0, -62f), 4, 1); QQHud.Toast("Yana kelishyapti!"); yield return Clear(r1);
        yield return OpenGate(1, -100f); QQFeel.Music("calm", .7f); QQHud.Objective("Oldinga boring");
        yield return Reach(new Vector3(0, 0, -68f), 4f);
        // Sárbinaz and the maidens ride in from behind (they were following from Qıran)
        var bz = P.transform.position + Vector3.forward * 16f;
        if (A.sarbinaz) Ally(A.sarbinaz, "Sárbinaz", bz, 420, 22, 1.74f, A.spear ? A.spear : A.saber);
        for (int i = 0; i < 3 && A.maidens != null && A.maidens.Length > 0; i++) Ally(A.maidens[i % A.maidens.Length], "qiz", bz + new Vector3(-3 + i * 3, 0, 2), 300, 16, 1.7f, A.saber);
        yield return new WaitForSeconds(2.2f);
        yield return Say(("sarbinaz", "Guloyim! Qirq qiz hamisha yoningda. Biz ham ota-onamiz uchun qasos olamiz!"), ("gulayim", "Unda otlaning, qizlar! Sarkopning qasosini birga olamiz, Sárbinaz."));
        QQFeel.Music("battle", .8f); QQHud.Objective("Dushman to'dasini yenging"); Unit.WakeGroup(gC);
        while (Unit.CountGroup(gC) > 4) { if (P.Dead) yield break; yield return null; }
        QQHud.Toast("Orqamizdan hujum qilishyapti!", 2.5f); int rb = March(P.transform.position + Vector3.forward * 18f, 3, 0);
        yield return Clear(gC); yield return Clear(rb);
        yield return OpenGate(2, -146f); QQFeel.Music("calm", .7f); QQHud.Objective("Qashqirni toping");
        yield return Reach(new Vector3(0, 0, -112f), 5f);
        // the duel: the maidens hold back, Qasqır comes out of the smoke
        var q = A.Spawn(A.captain, new Vector3(0, 0, -130f), 1, 2600 * QQProgress.FoeHpMul, 38 * QQProgress.FoeDmgMul, 2.4f, A.axe, "Qashqir");
        q.boss = true; q.speed = 3.6f; q.range = 2.4f; q.radius = .7f; q.transform.rotation = Quaternion.LookRotation(Vector3.forward); q.gameObject.AddComponent<QQAI>();
        A.duel = true; QQFeel.Sfx("howl", null, 1f, 0);
        yield return new WaitForSeconds(1.5f);
        yield return Say(("qashqir", "Allayarning qizimisan? Kechikding! Bu yerda endi faqat kul va suyaklar qoldi."), ("gulayim", "Har bir kul ostida o'chmas cho'g' bor, maxluq! Hozir o'zing yonasan!"));
        QQFeel.Music("boss", .9f); QQHud.Objective("Qashqirni yenging");
        while (q && !q.Dead) { if (P.Dead) yield break; yield return null; }
        QQFx.Soul(q.transform.position, P.transform);   // his spirit flows as gold light INTO the amulet
        A.duel = false;
        foreach (var u in Unit.All.ToArray()) if (u.team == 1 && !u.Dead) u.Hit(99999, P, true);
        yield return new WaitForSeconds(2.5f);
        int lost = A.LostMaidens; int stars = 1 + (captivesSaved * 10 >= captivesTotal * 6 ? 1 : 0) + (captivesSaved == captivesTotal && lost == 0 ? 1 : 0);
        int coins = 60 + captivesSaved * 15 + stars * 20; QQProgress.Coins += coins; QQProgress.Chapter = Mathf.Max(QQProgress.Chapter, 2);
        A.running = false; QQFeel.Music("win", .9f); QQFeel.Sfx("st_win", null, 1f, 0);
        QQHud.NextScene = 1;   // the open battlefield after the chapter
        QQHud.End(true, new string('★', stars) + new string('☆', 3 - stars) + "   Ozod qilingan asirlar: " + captivesSaved + "/" + captivesTotal + System.Environment.NewLine + "+" + coins + " tanga");
    }
}

// pulsing gold ring on the ground at the objective
public class QQMarker : MonoBehaviour
{
    float t;
    void Start() { QQFx.Ring(transform.position, new Color(1f, .85f, .35f), 1.6f); }
    void Update() { t += Time.deltaTime; if (t > .9f) { t = 0; QQFx.Ring(transform.position, new Color(1f, .85f, .35f), 1.8f); } }
}
