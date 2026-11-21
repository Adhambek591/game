// Gúlayım: the author's 3-button design, with the feel of the genre's best (docs/design/genre_study_uz.md).
//  Attack (auto-target, stick direction picks the foe): near = 4-hit sword combo, she LUNGES to a foe up to 7 m away (Arkham freeflow),
//          the 4th blow is a heavy finisher; far = volley of 3-4 arrows; hold = spin hitting all around.
//  Dodge: pressed while a foe's gold mark is up = COUNTER (every telegraphing foe in reach, slow motion, Arkham);
//          against a red mark (unblockable) a roll at the last moment = perfect dodge: the world slows for a moment (Bayonetta);
//          otherwise a roll with i-frames.
//  Amulet: gold blast around her; cooldown, shortened by every blow that lands (Witcher adrenaline / Arkham combo meter).
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Unit))]
public class QQPlayer : MonoBehaviour
{
    public static QQPlayer I;
    Unit u; int combo; float comboT, holdT, amuletCd, dodgeCd, volleyCd, strikeAt = -1; bool holding, spinning; Vector3 rollDir; float rollT;
    Unit lungeTo; float lungeT, bufT, amuletAt = -1; Unit lastTarget;
    public int Chain { get; private set; }   // hits in a row without being hit (HUD combo counter)
    public int BestChain { get; private set; }
    float chainT;
    static float AMULET_CD { get { return 14f - QQProgress.AmuletCdCut; } }
    public float AmuletReady { get { return 1f - Mathf.Clamp01(amuletCd / AMULET_CD); } }
    public float DodgeReady { get { return 1f - Mathf.Clamp01(dodgeCd / .6f); } }
    enum Strike { None, Combo, Finisher, Spin }
    Strike pending; bool hitThisStrike;

    void Awake() { I = this; }
    void Start()
    {
        u = GetComponent<Unit>(); u.isPlayer = true; amuletCd = AMULET_CD * .5f;
        u.onHit = (from, d) => { if (Chain >= 12) QQHud.Toast("Kombo uzildi"); Chain = 0; };
    }

    // ---- input from QQHud buttons ----
    public void AttackDown() { holding = true; holdT = 0; }
    public void AttackUp()
    {
        if (!holding) return; holding = false;
        if (spinning) { spinning = false; return; }
        if (holdT < .35f) Attack();
    }

    public void Dodge()
    {
        if (u.Dead || dodgeCd > 0 || !QQArena.I.running) return;
        // counter: every foe whose gold mark is up and who is in reach
        int n = 0; Unit first = null; bool redClose = false;
        foreach (var o in Unit.All.ToArray())
        {
            if (o.team != 1 || o.Dead || o.telegraph <= 0 || o.swingAt != u) continue;
            float d = (o.transform.position - transform.position).magnitude;
            if (o.unblockable) { if (d < 4f) redClose = true; continue; }
            if (d > 4.2f) continue;
            if (!first) first = o; n++;
            o.telegraph = 0; o.busy = 0; o.Hit(u.dmg * 2.2f, u, true);
            QQFx.Spark(o.transform.position + Vector3.up * 1.3f, new Color(1f, .9f, .5f));
        }
        if (first)
        {
            u.inv = .6f; dodgeCd = .35f; u.Face(first.transform.position - transform.position, 99);
            Vector3 to = first.transform.position - transform.position; to.y = 0;
            if (to.magnitude > 1.6f) transform.position += to.normalized * (to.magnitude - 1.4f);   // snap into the counter
            u.rig.PlaySeg("judg", .1f, .3f, .04f); u.busy = .4f;
            QQFx.Ring(transform.position, new Color(1f, .9f, .5f), 2.8f); QQFeel.Sfx("clash", null, 1f); QQFeel.Sfx("v_block", null, .8f);
            QQFeel.HitStop(.09f); QQFeel.SlowMo(.3f, .35f); QQCam.shake = .8f;
            AddChain(n); amuletCd -= 1.5f * n;
            QQHud.Toast(n > 1 ? "Qaytarildi! x" + n : "Qaytarildi!");
            return;
        }
        var mv = InputMove(); rollDir = mv.sqrMagnitude > .04f ? CamDir(mv) : -transform.forward;
        strikeAt = -1; pending = Strike.None; lungeT = 0; bufT = 0;   // a roll cancels the swing
        u.rig.PlaySeg("roll", .25f, .25f, .05f); u.inv = .5f; u.busy = .5f; rollT = .5f; dodgeCd = .6f;
        QQFeel.Sfx("roll", null, .7f);
        if (redClose) { QQFeel.SlowMo(.35f, .6f); QQHud.Toast("Mukammal chetlanish!"); u.inv = .8f; AddChain(1); }
    }

    public void Amulet()
    {
        if (QQMission.I && QQMission.I.amuletLocked) { QQHud.Toast("Tumor hali sizda emas"); return; }
        if (u.Dead || amuletCd > 0 || !QQArena.I.running) return;
        amuletCd = AMULET_CD; u.rig.PlaySeg("cast", .3f, .45f, .05f); u.busy = .75f; amuletAt = .3f;   // the blast lands on the cast's impact frame
        QQFeel.Sfx("power", null, .8f);
    }

    Vector3 CamDir(Vector2 v)
    {
        var c = Camera.main.transform; Vector3 f = c.forward; f.y = 0; f.Normalize(); Vector3 r = c.right; r.y = 0; r.Normalize();
        return f * v.y + r * v.x;
    }

    Vector2 InputMove()
    {
        Vector2 mv = QQHud.Move; var k = Keyboard.current;
        if (k != null) { Vector2 kb = new Vector2((k.dKey.isPressed ? 1 : 0) - (k.aKey.isPressed ? 1 : 0), (k.wKey.isPressed ? 1 : 0) - (k.sKey.isPressed ? 1 : 0)); if (kb.sqrMagnitude > 0) mv = kb.normalized; }
        return mv;
    }

    // Freeflow target choice: nearest foe, but the stick direction wins (a foe 5 m away in the pushed direction beats one 2 m behind)
    Unit PickTarget(float maxD)
    {
        Vector2 mv = InputMove(); Vector3 want = mv.sqrMagnitude > .04f ? CamDir(mv).normalized : transform.forward;
        Unit best = null; float bs = 1e9f;
        foreach (var o in Unit.All)
        {
            if (o.team != 1 || o.Dead) continue; Vector3 d = o.transform.position - transform.position; d.y = 0; float dist = d.magnitude; if (dist > maxD) continue;
            float s = dist - Vector3.Dot(want, d / Mathf.Max(.01f, dist)) * (mv.sqrMagnitude > .04f ? 4f : 1.5f) + (o == lastTarget ? -.8f : 0);
            if (s < bs) { bs = s; best = o; }
        }
        return best;
    }

    void AddChain(int n)
    {
        Chain += n; chainT = 3f; BestChain = Mathf.Max(BestChain, Chain);
        if (Chain >= 10 && Chain % 10 < n) QQHud.Toast(Chain + " zarba ketma-ket!");
    }

    void Attack()
    {
        if (u.Dead || !QQArena.I.running) return;
        if (u.busy > .18f || rollT > 0) { bufT = .35f; return; }   // buffered: pressed during a swing = the next blow of the chain
        bufT = 0;
        var t = PickTarget(7f) ?? Unit.Nearest(transform.position, 1, 18f);
        if (t && (t.transform.position - transform.position).magnitude > 7f)
        {
            if (volleyCd > 0) return;   // the bow needs a moment to reload: no machine-gun volleys
            volleyCd = 1.4f;
            var list = Unit.All.FindAll(o => o.team == 1 && !o.Dead && (o.transform.position - transform.position).sqrMagnitude < 324f);
            list.Sort((a, b) => (a.transform.position - transform.position).sqrMagnitude.CompareTo((b.transform.position - transform.position).sqrMagnitude));
            u.Face(t.transform.position - transform.position, 99); u.rig.PlaySeg("attack", .2f, .3f, .05f); u.busy = .45f;
            for (int i = 0; i < Mathf.Min(4, Mathf.Max(3, list.Count)); i++) { var tg = list[i % list.Count]; QQArrow.Shoot(u, tg, u.dmg * .55f, i * .08f); }
            QQFeel.Sfx("v_bow", null, .8f); QQFeel.Sfx("arrow", null, .5f);
            return;
        }
        if (comboT <= 0) combo = 0;
        bool fin = combo % 4 == 3;
        string[] seq = { "slash", "attack", "triple", "heavy" };
        if (t)
        {
            lastTarget = t; u.Face(t.transform.position - transform.position, 99);
            float dist = (t.transform.position - transform.position).magnitude;
            if (dist > 2.3f) { lungeTo = t; lungeT = .22f; }   // close the gap during the wind-up
        }
        float wind = fin ? .34f : combo % 4 == 1 ? .26f : .2f, rec = fin ? .42f : .3f;   // impact lands on the clip's measured hit frame
        u.rig.PlaySeg(seq[combo % 4], wind, rec, .05f); u.busy = wind + rec * .5f; comboT = 1.1f; combo++;
        pending = fin ? Strike.Finisher : Strike.Combo; strikeAt = wind; hitThisStrike = false;
        QQFeel.Sfx(fin ? "v_swing" : "swing", null, .7f);
    }

    void Update()
    {
        if (u.Dead) return;
        float dt = Time.deltaTime;
        amuletCd -= dt; dodgeCd -= dt; comboT -= dt; volleyCd -= dt;
        if (chainT > 0) { chainT -= dt; if (chainT <= 0) Chain = 0; }
        if (amuletAt >= 0) { amuletAt -= dt; if (amuletAt < 0) {
            QQFx.Ring(transform.position, new Color(1f, .8f, .3f), 7f); QQFx.Flash(); QQFeel.HitStop(.12f); QQCam.shake = 1.2f;
            foreach (var o in Unit.All.ToArray()) if (o.team == 1 && !o.Dead && (o.transform.position - transform.position).sqrMagnitude < 49f) o.Hit(u.dmg * 3.5f, u, true); } }
        if (bufT > 0) { bufT -= dt; if (u.busy <= .18f && rollT <= 0 && u.stun <= 0) Attack(); }
        var near = Unit.Nearest(transform.position, 1, 12f); u.rig.lookAt = near ? near.transform : null;
        if (holding) { holdT += dt; if (holdT > .35f && !spinning && u.busy <= 0) { spinning = true; pending = Strike.Spin; strikeAt = .25f; u.rig.PlaySeg("spin", .25f, .55f, .05f); u.busy = .8f; QQFeel.Sfx("v_swing", null, .8f); } }

        // lunge: glide to the chosen foe, stopping at sword reach
        if (lungeT > 0 && lungeTo && !lungeTo.Dead)
        {
            lungeT -= dt; Vector3 d = lungeTo.transform.position - transform.position; d.y = 0;
            float gap = d.magnitude - (1.3f + lungeTo.radius);
            if (gap > 0) transform.position += d.normalized * Mathf.Min(gap, 22f * dt);
            u.Face(d, 40f);
        }

        if (strikeAt >= 0)
        {
            strikeAt -= dt;
            if (strikeAt < 0)
            {
                int hits = 0;
                foreach (var o in Unit.All.ToArray())
                {
                    if (o.team != 1 || o.Dead) continue; Vector3 d = o.transform.position - transform.position; d.y = 0;
                    if (pending == Strike.Spin) { if (d.magnitude < 3.2f) { o.Hit(u.dmg * 1.3f, u, true); hits++; } }
                    else if (d.magnitude < 2.6f + o.radius && Vector3.Angle(transform.forward, d) < 75f) { o.Hit(pending == Strike.Finisher ? u.dmg * 1.8f : u.dmg, u, pending == Strike.Finisher); hits++; }
                }
                if (hits > 0)
                {
                    AddChain(hits); amuletCd -= .35f * hits;
                    bool big = pending != Strike.Combo;
                    QQFeel.HitStop(big ? .1f : .05f); QQCam.shake = Mathf.Max(QQCam.shake, big ? .7f : .3f);
                    u.rig.Impulse(transform.forward, big ? -120f : -60f);   // recoil of the blow through her body
                }
                if (pending == Strike.Spin) { QQFx.Ring(transform.position, new Color(.6f, .8f, 1f), 3.2f); if (spinning && holding) { strikeAt = .45f; u.busy = .5f; u.rig.PlaySeg("spin", .45f, .5f, .08f); QQFeel.Sfx("swing", null, .6f); } }
                pending = Strike.None;
            }
        }

        if (rollT > 0) { rollT -= dt; transform.position += rollDir * 8f * dt; u.Face(rollDir, 30); return; }
        if (u.stun > 0 || u.busy > 0) return;

        Vector2 mv = InputMove();
        var k = Keyboard.current;
        if (k != null)
        {
            if (k.spaceKey.wasPressedThisFrame) Dodge();
            if (k.eKey.wasPressedThisFrame) Amulet();
            if (k.jKey.wasPressedThisFrame) AttackDown(); if (k.jKey.wasReleasedThisFrame) AttackUp();
        }
        var m = Mouse.current; if (m != null && !QQHud.PointerOverUI) { if (m.leftButton.wasPressedThisFrame) AttackDown(); if (m.leftButton.wasReleasedThisFrame) AttackUp(); if (m.rightButton.wasPressedThisFrame) Dodge(); }

        if (mv.sqrMagnitude > .02f)
        {
            Vector3 d = CamDir(mv); float sp = u.speed * Mathf.Clamp01(mv.magnitude * 1.2f);
            transform.position += d * sp * dt; u.Face(d, 14);
            u.rig.Play(sp > 2.5f ? "run" : "walk", .15f); u.rig.speed = sp > 2.5f ? sp / 4.6f : 1f;
        }
        else
        {
            u.rig.Play(near ? "combat" : "idle", .25f); u.rig.speed = 1f;
        }
    }

    // Space/E/J must also work while she is busy (buffered dodge-cancel feels responsive: Witcher 3's main complaint was input lag)
    void LateUpdate()
    {
        if (u.Dead || u.stun > 0) return;
        if (u.busy > 0 || rollT > 0)
        {
            var k = Keyboard.current; var m = Mouse.current;
            if ((k != null && k.spaceKey.wasPressedThisFrame) || (m != null && m.rightButton.wasPressedThisFrame)) { if (rollT <= 0) Dodge(); }
            if ((k != null && k.jKey.wasPressedThisFrame) || (m != null && !QQHud.PointerOverUI && m.leftButton.wasPressedThisFrame)) AttackDown();
            if ((k != null && k.jKey.wasReleasedThisFrame) || (m != null && m.leftButton.wasReleasedThisFrame)) AttackUp();
        }
    }
}
