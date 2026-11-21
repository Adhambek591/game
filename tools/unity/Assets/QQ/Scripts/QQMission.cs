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
    public int chapter = 1;
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

    public void Begin() { StartCoroutine(chapter == 3 ? RunCh3() : chapter == 2 ? RunCh2() : Run()); }

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

    void Update() { TickCaptives(); TickCaravan(); TickSentries(); }

    // ---------------- chapter 3: sentries that look around; seen = alarm ----------------
    readonly List<Unit> sentries = new List<Unit>(); readonly List<float> sentryYaw = new List<float>(); bool alarm, stealthOn;
    void Sentry(float x, float z, float yaw)
    {
        int g = Post(S(x, z)); foreach (var u in Unit.All) if (u.group == g) { u.wakeR = 0f; u.transform.rotation = Quaternion.Euler(0, yaw, 0); sentries.Add(u); sentryYaw.Add(yaw); var c = new GameObject("cone"); c.AddComponent<QQCone>().Init(u, 9f, 60f); }
    }
    void TickSentries()
    {
        if (!stealthOn || alarm || !A.running || !P) return;
        for (int i = 0; i < sentries.Count; i++)
        {
            var s = sentries[i]; if (!s || s.Dead || !s.asleep) continue;
            s.transform.rotation = Quaternion.Euler(0, sentryYaw[i] + Mathf.Sin(Time.time * .45f + i * 1.7f) * 42f, 0);   // looking around
            Vector3 d = P.transform.position - s.transform.position; d.y = 0; float dist = d.magnitude;
            if (dist < 2f || (dist < 9f && Vector3.Angle(s.transform.forward, d) < 60f))
            {
                alarm = true; foreach (var t in sentries) if (t && !t.Dead) Unit.WakeGroup(t.group);
                QQHud.Toast("Xavf! Sizni ko'rib qolishdi!", 2.5f); QQFeel.Sfx("horn", null, 1f, 0); QQFeel.Music("battle", .8f); break;
            }
        }
    }

    IEnumerator RunCh3()
    {
        QQFeel.Music("calm", .6f); A.running = false; wallZ = -104f; amuletLocked = false; QQFeel.Ambience("amb_river", .5f);
        if (A.sarbinaz) Ally(A.sarbinaz, "Sárbinaz", new Vector3(-2f, 0, 5f), 420, 22, 1.74f, A.spear ? A.spear : A.saber);
        for (int i = 0; i < 2 && A.maidens != null && A.maidens.Length > 0; i++) Ally(A.maidens[i % A.maidens.Length], "qiz", new Vector3(-3f + i * 3f, 0, 7f), 300, 16, 1.7f, A.saber);
        foreach (var u in Unit.All) { var ai = u.GetComponent<QQAI>(); if (u.team == 0 && u != P && ai) ai.enabled = false; }   // the maidens wait at the edge while she scouts
        // sentries by the fires, facing the street at different angles
        Sentry(-4f, -28f, 160f); Sentry(6f, -36f, 210f); Sentry(-7f, -50f, 120f); Sentry(2f, -58f, 200f); Sentry(-6f, -74f, 170f); Sentry(6f, -80f, 230f); Sentry(0f, -92f, 180f);
        Captive(new Vector3(-4f, 0, -97f)); Captive(new Vector3(-1.5f, 0, -98.5f)); Captive(new Vector3(1.5f, 0, -98.5f)); Captive(new Vector3(4f, 0, -97f));
        var ot = A.Spawn(A.otbasqan ? A.otbasqan : A.yigit, new Vector3(0, 0, -122f), 0, 900, 30, 1.9f, null, "O'tbosqan"); ot.isCaptive = true; ot.inv = 9999; ot.transform.rotation = Quaternion.LookRotation(Vector3.forward); ot.rig.Play("hit", .01f, false, true); ot.rig.speed = 0;
        int gC = Post(S(-6f, -136f), S(6f, -136f), S(-3f, -140f), S(3f, -140f), Ar(-7f, -146f), Ar(7f, -146f), S(0f, -144f));
        QQHud.Visible(false);
        yield return QQCutscene.Play("c3", "nar7", "Katta daryo bo'yida qul karvoni dam olishga to'xtadi. Zanjirband asirlar orasida Sarkopning mashhur botiri O'tbosqan ham bor edi.");
        QQHud.Visible(true);
        QQHud.Title("3-bob", "Daryo bo'yi"); yield return new WaitForSeconds(3f);
        yield return Say(("sarbinaz", "Qaranglar, daryo bo'yida gulxan tutuni ko'rinyapti. Karvon shu yerda to'xtagan!"), ("gulayim", "Avval asirlarni ozod qilamiz, keyin jallodning jazosini beramiz. O'tbosqan og'a ham o'sha yerda!"));
        A.running = true; stealthOn = true;
        QQHud.Objective("Qo'riqchilarga ko'rinmay asirlarga yeting"); QQHud.Hint("Qo'riqchilarga orqa tomondan yashirincha yaqinlashib uring — ular faqat oldini ko'radi");
        yield return Reach(new Vector3(0, 0, -97f), 4f);
        stealthOn = false;
        // free all four (stand among them), then the maidens come up
        float t0 = 0; while (captivesSaved < captivesTotal && t0 < 8f) { t0 += Time.deltaTime; target = new Vector3(0, 0, -98f); yield return null; }
        foreach (var u in Unit.All) if (u.team == 0 && !u.isPlayer && u.GetComponent<QQAI>()) u.GetComponent<QQAI>().enabled = true;
        if (alarm) { QQHud.Objective("Qo'riqchilarni yengib chiqing"); while (Unit.CountTeam(1) - Unit.CountGroup(gC) > 0) { if (P.Dead) yield break; yield return null; } }
        foreach (var s in sentries) if (s && !s.Dead) s.Hit(99999, P, true);
        yield return OpenGate(0, -150f); QQHud.Objective("Jallodni toping");
        yield return Reach(new Vector3(0, 0, -110f), 4f);
        var j = A.Spawn(A.executioner ? A.executioner : A.captain, new Vector3(0, 0, -118f), 1, 3000 * QQProgress.FoeHpMul, 40 * QQProgress.FoeDmgMul, 2.3f, A.axe, "Jallod");
        j.boss = true; j.speed = 3.6f; j.range = 2.4f; j.radius = .7f; j.transform.rotation = Quaternion.LookRotation(Vector3.forward); j.gameObject.AddComponent<QQAI>(); A.duel = true;
        QQFeel.Sfx("slam", null, 1f, 0); yield return new WaitForSeconds(1f);
        yield return Say(("jallod", "Har bir zanjir — bir qulning oxirgi faryodi. Sening bo'yningga ham zanjir tayyor!"), ("gulayim", "O'sha zanjirlaring bilan o'zingni bo'g'ib o'ldiraman, jallod!"));
        QQFeel.Music("boss", .9f); QQHud.Objective("Jallodni yenging");
        while (j && !j.Dead) { if (P.Dead) yield break; yield return null; }
        QQFx.Soul(j.transform.position, P.transform); A.duel = false; yield return new WaitForSeconds(2.4f);
        yield return Reach(new Vector3(0, 0, -120f), 3f);
        ot.isCaptive = false; ot.inv = 0; ot.rig.speed = 1f; ot.rig.Play("taunt", .2f, false, true); QQFx.Ring(ot.transform.position, new Color(1f, .85f, .4f), 3f);
        yield return Say(("otbasqan", "Guloyim… Allayar botirning qizi! Qalmoqlar meni zanjirlasa ham, ruhimni sindira olmadi."), ("gulayim", "O'tbosqan og'a, endi yolg'iz emassiz. Qirq qiz yoningizda — safimizga qo'shiling."), ("otbasqan", "Qilichimni qo'limga bering! Surtayshaning o'rdasini yer bilan yakson qilmaguncha to'xtamayman!"));
        if (A.saber) QQArena.ArmUnit(ot, A.saber, 1.9f); ot.gameObject.AddComponent<QQAI>(); ot.speed = 4.4f; ot.displayName = "O'tbosqan"; QQFeel.Sfx("power", null, .8f, 0);
        QQFeel.Music("battle", .8f); QQHud.Objective("Qolgan asirlarni ozod qiling"); Unit.WakeGroup(gC); yield return Clear(gC);
        yield return new WaitForSeconds(1.5f);
        int lost = A.LostMaidens; int stars = 1 + (!alarm ? 1 : 0) + (!alarm && captivesSaved == captivesTotal && lost == 0 ? 1 : 0);
        int coins = 90 + captivesSaved * 15 + stars * 20; QQProgress.Coins += coins; QQProgress.Chapter = Mathf.Max(QQProgress.Chapter, 4);
        A.running = false; QQFeel.Music("win", .9f); QQFeel.Sfx("st_win", null, 1f, 0); QQHud.NextScene = 3;
        QQHud.End(true, new string('★', stars) + new string('☆', 3 - stars) + (alarm ? "   Qo'riqchilar sizni ko'rdi" : "   Sezdirmay o'tdingiz") + System.Environment.NewLine + "+" + coins + " tanga");
    }

    // ---------------- chapter 2: the caravan ----------------
    Unit cart; readonly List<Unit> walkers = new List<Unit>(); float cartGoal = 0f; bool cartBroken;
    void TickCaravan()
    {
        if (!cart || cart.Dead || !A.running) { foreach (var w in walkers) if (w) w.rig.Play("idle", .3f); return; }
        bool threat = false; foreach (var u in Unit.All) if (u.team == 1 && !u.Dead && !u.asleep && (u.transform.position - cart.transform.position).sqrMagnitude < 81f) { threat = true; break; }
        bool near = (P.transform.position - cart.transform.position).sqrMagnitude < 22f * 22f;
        bool move = !cartBroken && !threat && near && cart.transform.position.z > cartGoal + .1f;
        if (move) cart.transform.position += Vector3.back * 1.7f * Time.deltaTime;
        for (int i = 0; i < walkers.Count; i++)
        {
            var w = walkers[i]; if (!w) continue;
            Vector3 slot = cart.transform.position + new Vector3(i % 2 == 0 ? -1.4f : 1.4f, 0, 3.2f + (i / 2) * 1.6f), d = slot - w.transform.position; d.y = 0;
            if (d.magnitude > .4f) { w.transform.position += d.normalized * Mathf.Min(d.magnitude, 2.4f * Time.deltaTime); w.Face(d); w.rig.Play("walk", .2f); w.rig.speed = .9f; }
            else { w.rig.Play("idle", .3f); w.Face(Vector3.back, 4f); }
        }
    }
    IEnumerator CartTo(float z) { cartGoal = z; while (cart && !cart.Dead && cart.transform.position.z > z + .15f) { if (P.Dead) yield break; target = cart.transform.position + Vector3.forward * 3f; yield return null; } target = null; }
    bool CaravanLost { get { return !cart || cart.Dead; } }
    IEnumerator Fail(string why)
    {
        A.running = false; QQFeel.Sfx("st_lose", null, 1f, 0); QQHud.NextScene = -1;
        QQHud.End(false, why + System.Environment.NewLine + "Kuchingizni oshirib, qaytadan urinib ko'ring."); yield break;
    }

    IEnumerator RunCh2()
    {
        QQFeel.Music("calm", .7f); A.running = false; wallZ = -999f; amuletLocked = false; QQFeel.Ambience("amb_desert", .5f);
        // the freed people's caravan: one cart with three walkers behind it
        var cgo = Instantiate(A.cart); var root = new GameObject("Karvon"); root.transform.position = new Vector3(1.5f, 0, -4f); cgo.transform.SetParent(root.transform, false); cgo.transform.localRotation = Quaternion.identity;   // shafts toward -z, the way it travels
        QQArena.Look(cgo, null);
        cart = root.AddComponent<Unit>(); cart.team = 0; cart.maxHp = cart.hp = 1500; cart.radius = 1.7f; cart.anchored = true; cart.displayName = "Karvon"; QQHud.Escort = cart;
        for (int i = 0; i < 3; i++) { var w = A.Spawn(i == 1 && A.ona ? A.ona : A.yigit, root.transform.position + new Vector3(i % 2 == 0 ? -1.4f : 1.4f, 0, 3.2f + (i / 2) * 1.6f), 0, 100, 1, i == 1 ? 1.65f : 1.78f, null, "xalq"); w.isCaptive = true; w.inv = 9999; walkers.Add(w); }
        if (A.sarbinaz) Ally(A.sarbinaz, "Sárbinaz", new Vector3(-2f, 0, 2f), 420, 22, 1.74f, A.spear ? A.spear : A.saber);
        for (int i = 0; i < 3 && A.maidens != null && A.maidens.Length > 0; i++) Ally(A.maidens[i % A.maidens.Length], "qiz", new Vector3(-4f + i * 3f, 0, 4.5f), 300, 16, 1.7f, A.saber);
        int gR = Post(Ar(9f, -60f), Ar(9.6f, -63.5f), Ar(9.2f, -67f), Ar(9.7f, -70.5f), S(6.2f, -62f), S(6f, -68f));      // archers on the ridge
        foreach (var u in Unit.All) if (u.group == gR) { u.transform.rotation = Quaternion.LookRotation(Vector3.left); u.wakeR = 0f; }
        int gB = Post(S(-3f, -112f), S(3f, -112.6f), S(-6.5f, -114f), S(6f, -115f), Ar(-4.5f, -121f), Ar(4.5f, -121f), S(0f, -122f));   // the blockade camp
        QQHud.Visible(false);
        yield return QQCutscene.Play("c2", "nar6", "Asirlar karvoni sho'rxok cho'l bo'ylab sharqqa haydaldi. Guloyim qirq qizi bilan ularning izidan quvdi.");
        QQHud.Visible(true);
        QQHud.Title("2-bob", "Sho'rxok cho'l"); yield return new WaitForSeconds(3f);
        yield return Say(("sarbinaz", "Guloyim, ozod etilgan odamlar charchagan. Aravalar sekin yuradi."), ("gulayim", "Ularni cho'l orqali omon olib o'tamiz. Qizlar, karvonni qo'riqlang!"));
        A.running = true; QQFeel.Music("battle", .75f);
        QQHud.Objective("Karvonni cho'l orqali omon olib o'ting"); QQHud.Hint("Karvondan uzoqlashmang — dushman yaqinlashsa, karvon to'xtaydi");
        // 1) raiders burst out of the dunes on both sides
        yield return CartTo(-34f); if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; }
        QQHud.Toast("Pistirma! Dushman har tomondan chiqdi!", 2.5f); QQFeel.Sfx("horn", null, .8f, 0);
        var cz = cart.transform.position.z; int a1 = March(new Vector3(-10.5f, 0, cz - 2f), 3, 0), a2 = March(new Vector3(10.5f, 0, cz + 1f), 3, 0);
        foreach (var gx in new[] { -10.5f, 10.5f }) for (int i = 0; i < 4; i++) QQFx.Ring(new Vector3(gx, 0, cz + Random.Range(-5f, 5f)), new Color(.85f, .72f, .5f), 2.5f);
        while (Unit.CountGroup(a1) + Unit.CountGroup(a2) > 0) { if (P.Dead) yield break; if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; } yield return null; }
        // 2) archers on the ridge shoot at the caravan
        cartGoal = -86f; while (cart && cart.transform.position.z > -50f) { if (P.Dead) yield break; target = cart.transform.position + Vector3.forward * 3f; yield return null; }
        Unit.WakeGroup(gR); QQHud.Toast("Qirdagi kamonchilar karvonni o'qqa tutmoqda — ularni yo'q qiling!", 3f); QQHud.Objective("Qirdagi kamonchilarni yo'q qiling");
        while (Unit.CountGroup(gR) > 0) { if (P.Dead) yield break; if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; } target = null; yield return null; }
        QQHud.Objective("Karvonni cho'l orqali omon olib o'ting");
        yield return CartTo(-86f); if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; }
        // 3) a wheel breaks: hold until it is fixed, raiders from the front and the back
        cartBroken = true; QQHud.Toast("G'ildirak sindi! Dushman aynan shuni kutib turgan edi!", 3f); QQHud.Objective("G'ildirak tuzatilguncha karvonni himoya qiling");
        float hold = 32f, next = 0f; int wave = 0;
        while (hold > 0)
        {
            if (P.Dead) yield break; if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; }
            hold -= Time.deltaTime; next -= Time.deltaTime;
            if (next <= 0 && wave < 4) { next = 8f; wave++; bool back = wave % 2 == 0; March(cart.transform.position + (back ? Vector3.forward * 20f : Vector3.back * 22f), 3, wave >= 3 ? 1 : 0); if (back) QQHud.Toast("Orqamizdan hujum qilishyapti!", 2f); }
            QQHud.Objective("G'ildirak tuzatilmoqda… " + Mathf.CeilToInt(hold) + " s");
            yield return null;
        }
        while (Unit.CountTeam(1) - Unit.CountGroup(gB) > 0) { if (P.Dead) yield break; if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; } yield return null; }
        cartBroken = false; QQHud.Toast("G'ildirak tuzatildi! Karvon yo'lga chiqdi", 2.5f); QQHud.Objective("Yo'l to'silgan! Qalmoq lagerini yo'q qiling");
        // 4) the blockade camp
        yield return CartTo(-104f); if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; }
        Unit.WakeGroup(gB); yield return Clear(gB); if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; }
        QQHud.Objective("Oldinga boring"); yield return CartTo(-110f);
        yield return Reach(new Vector3(0, 0, -128f), 5f);
        // 5) the sand giant: Gúlayım alone
        var g = A.Spawn(A.giant ? A.giant : A.captain, new Vector3(0, 0, -142f), 1, 2700 * QQProgress.FoeHpMul, 38 * QQProgress.FoeDmgMul, 4.4f, null, "Qum devi");
        g.boss = true; g.speed = 3.0f; g.range = 3.4f; g.radius = 1.2f; g.transform.rotation = Quaternion.LookRotation(Vector3.forward); g.gameObject.AddComponent<QQAI>();
        for (int i = 0; i < 8; i++) QQFx.Ring(g.transform.position + Random.insideUnitSphere * 3f, new Color(.85f, .72f, .5f), 4f);
        QQFeel.Sfx("roar", null, 1f, 0); QQCam.shake = 1.2f; A.duel = true;
        yield return new WaitForSeconds(1.2f);
        yield return Say(("qumdevi", "Tuz va qum — mening tanam. Bu bepoyon cho'l seni tiriklayin yutib yuboradi!"), ("gulayim", "Bu cho'l bizning ota makonimiz. Sen esa — o'tkinchi bir qora sehrsan!"));
        QQFeel.Music("boss", .9f); QQHud.Objective("Qum devini yenging"); QQHud.Hint("Qum devi yerni yoradi — qizil doiralardan chetga qoching");
        while (g && !g.Dead) { if (P.Dead) yield break; if (CaravanLost) { yield return Fail("Karvon yo'qoldi."); yield break; } yield return null; }
        QQFx.Soul(g.transform.position, P.transform); A.duel = false;
        foreach (var u in Unit.All.ToArray()) if (u.team == 1 && !u.Dead) u.Hit(99999, P, true);
        yield return new WaitForSeconds(2.6f);
        yield return Say(("sarbinaz", "Hamma omon. Endi navbat Qum deviga!".Replace("Endi navbat Qum deviga!", "Karvon xavfsiz joyga yetdi.")));
        float hpk = cart ? cart.hp / cart.maxHp : 0; int lost = A.LostMaidens;
        int stars = 1 + (hpk >= .6f ? 1 : 0) + (hpk >= .9f && lost == 0 ? 1 : 0);
        int coins = 80 + Mathf.RoundToInt(hpk * 60) + stars * 20; QQProgress.Coins += coins; QQProgress.Chapter = Mathf.Max(QQProgress.Chapter, 3);
        A.running = false; QQFeel.Music("win", .9f); QQFeel.Sfx("st_win", null, 1f, 0); QQHud.NextScene = 2;   // chapter 3 next
        QQHud.End(true, new string('★', stars) + new string('☆', 3 - stars) + "   Karvon: " + Mathf.RoundToInt(hpk * 100) + "%" + System.Environment.NewLine + "+" + coins + " tanga");
    }

    // ---------------- the chapter ----------------
    IEnumerator Run()
    {
        QQFeel.Music("calm", .7f); A.running = false; wallZ = -30f; amuletLocked = true;
        Captive(new Vector3(-8f, 0, -11f)); Captive(new Vector3(8.5f, 0, -42f)); Captive(new Vector3(-8f, 0, -76f)); Captive(new Vector3(7.5f, 0, -92f));
        if (A.ona) { var mo = A.Spawn(A.ona, new Vector3(2f, 0, -22f), 0, 100, 1, 1.65f, null, "Ona"); mo.isCaptive = true; mo.inv = 9999; mo.transform.rotation = Quaternion.LookRotation(Vector3.forward); }
        int g0 = Post(S(4.5f, -14f));                                                                         // a lone looter in the first street
        int gA = Post(S(-2.2f, -46f), S(1.4f, -47f), S(5f, -50f), Ar(-7f, -54f), Ar(7f, -54f));               // guard post behind gate 1
        int gC = Post(S(-6f, -84f), S(6f, -84f), S(-3f, -88f), S(3f, -88f), S(0f, -91f), Ar(-8f, -93f), Ar(8f, -93f));   // the horde's camp
        // the messenger's tale (approved clips): Surtaysha's dawn attack, Allayar's fall, the people led away in chains
        QQHud.Visible(false);
        yield return QQCutscene.Play("v1", "nar1", "Tong saharda Sarkop osmonini qora bulut qopladi. Qalmoq xoni Surtaysha qirq ming lashkari bilan yurtga bostirib kirdi…");
        yield return QQCutscene.Play("v2", "nar2", "Allayar bay va olti o'g'li mardlarcha halok bo'ldi. Sarkopga o't qo'yildi. Omon qolgan xalq zanjirband qilinib, qalmoq yurtiga haydaldi.");
        QQHud.Visible(true);
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
        QQHud.NextScene = 1;   // chapter 2 next
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
