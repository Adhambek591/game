// Gúlayım: the author's 3-button design.
//  Attack (auto-target): near = sword combo hitting 2-3 foes in front; far = volley of 3-4 arrows; hold = spin hitting all around.
//  Dodge: roll with i-frames; pressed just as a foe swings at her = parry + counter.
//  Amulet: gold blast around her, long cooldown.
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Unit))]
public class QQPlayer : MonoBehaviour
{
    public static QQPlayer I;
    Unit u; int combo; float comboT, holdT, amuletCd, dodgeCd, strikeAt = -1, parryWin; bool holding, spinning; Vector3 rollDir; float rollT;
    public float AmuletReady { get { return 1f - Mathf.Clamp01(amuletCd / 12f); } }
    public float DodgeReady { get { return 1f - Mathf.Clamp01(dodgeCd / .7f); } }
    enum Strike { None, Combo, Spin }
    Strike pending;

    void Awake() { I = this; }
    void Start() { u = GetComponent<Unit>(); u.isPlayer = true; u.onHit = (from, d) => { }; }

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
        // parry: a foe within reach is mid-swing
        Unit foe = null;
        foreach (var o in Unit.All) if (o.team == 1 && !o.Dead && o.busy > .45f && (o.transform.position - transform.position).sqrMagnitude < 9f) { foe = o; break; }
        if (foe)
        {
            u.inv = .5f; dodgeCd = .5f; u.Face(foe.transform.position - transform.position, 99);
            u.rig.Play("judg", .05f, false, true); u.busy = .55f;
            foe.Hit(u.dmg * 2.2f, u, true); QQFx.Ring(transform.position, new Color(1f, .9f, .5f), 2.5f);
            QQHud.Toast("Qaytarildi!");
            return;
        }
        var mv = QQHud.Move; rollDir = mv.sqrMagnitude > .04f ? CamDir(mv) : transform.forward;
        u.rig.Play("roll", .05f, false, true); u.inv = .45f; u.busy = .55f; rollT = .55f; dodgeCd = .7f;
    }
    public void Amulet()
    {
        if (u.Dead || amuletCd > 0 || !QQArena.I.running) return;
        amuletCd = 12f; u.rig.Play("cast", .05f, false, true); u.busy = .8f;
        QQFx.Ring(transform.position, new Color(1f, .8f, .3f), 7f); QQFx.Flash();
        foreach (var o in Unit.All.ToArray()) if (o.team == 1 && !o.Dead && (o.transform.position - transform.position).sqrMagnitude < 49f) o.Hit(u.dmg * 3.5f, u, true);
    }

    Vector3 CamDir(Vector2 v)
    {
        var c = Camera.main.transform; Vector3 f = c.forward; f.y = 0; f.Normalize(); Vector3 r = c.right; r.y = 0; r.Normalize();
        return f * v.y + r * v.x;
    }

    void Attack()
    {
        if (u.Dead || u.busy > .15f || !QQArena.I.running) return;
        var t = Unit.Nearest(transform.position, 1, 16f);
        if (t && (t.transform.position - transform.position).magnitude > 3.4f)
        {
            // volley: one arrow each at up to 4 foes, nearest first
            var list = Unit.All.FindAll(o => o.team == 1 && !o.Dead && (o.transform.position - transform.position).sqrMagnitude < 256f);
            list.Sort((a, b) => (a.transform.position - transform.position).sqrMagnitude.CompareTo((b.transform.position - transform.position).sqrMagnitude));
            u.Face(t.transform.position - transform.position, 99); u.rig.Play("attack", .05f, false, true); u.busy = .5f;
            for (int i = 0; i < Mathf.Min(4, Mathf.Max(3, list.Count)); i++) { var tg = list[i % list.Count]; QQArrow.Shoot(u, tg, u.dmg * .7f, i * .08f); }
            return;
        }
        if (t) u.Face(t.transform.position - transform.position, 99);
        string[] seq = { "slash", "attack", "triple" };
        if (comboT <= 0) combo = 0;
        u.rig.Play(seq[combo % 3], .05f, false, true); u.rig.speed = 1.35f; u.busy = .45f; comboT = 1.1f; combo++;
        pending = Strike.Combo; strikeAt = .2f;
    }

    void Update()
    {
        if (u.Dead) return;
        float dt = Time.deltaTime;
        amuletCd -= dt; dodgeCd -= dt; comboT -= dt;
        if (holding) { holdT += dt; if (holdT > .35f && !spinning && u.busy <= 0) { spinning = true; pending = Strike.Spin; strikeAt = .25f; u.rig.Play("spin", .05f, false, true); u.rig.speed = 1.2f; u.busy = .8f; } }

        if (strikeAt >= 0)
        {
            strikeAt -= dt;
            if (strikeAt < 0)
            {
                foreach (var o in Unit.All.ToArray())
                {
                    if (o.team != 1 || o.Dead) continue; Vector3 d = o.transform.position - transform.position; d.y = 0;
                    if (pending == Strike.Spin) { if (d.magnitude < 3.2f) o.Hit(u.dmg * 1.3f, u, true); }
                    else if (d.magnitude < 2.6f + o.radius && Vector3.Angle(transform.forward, d) < 70f) o.Hit(u.dmg, u, combo % 3 == 0);
                }
                if (pending == Strike.Spin) { QQFx.Ring(transform.position, new Color(.6f, .8f, 1f), 3.2f); if (spinning && holding) { strikeAt = .45f; u.busy = .5f; } }
                pending = Strike.None;
            }
        }

        if (rollT > 0) { rollT -= dt; transform.position += rollDir * 7.5f * dt; u.Face(rollDir, 30); return; }
        if (u.stun > 0 || u.busy > 0) return;

        Vector2 mv = QQHud.Move;
        var k = Keyboard.current;
        if (k != null)
        {
            Vector2 kb = new Vector2((k.dKey.isPressed ? 1 : 0) - (k.aKey.isPressed ? 1 : 0), (k.wKey.isPressed ? 1 : 0) - (k.sKey.isPressed ? 1 : 0));
            if (kb.sqrMagnitude > 0) mv = kb.normalized;
            if (k.spaceKey.wasPressedThisFrame) Dodge();
            if (k.eKey.wasPressedThisFrame) Amulet();
            if (k.jKey.wasPressedThisFrame) AttackDown(); if (k.jKey.wasReleasedThisFrame) AttackUp();
        }
        var m = Mouse.current; if (m != null && !QQHud.PointerOverUI) { if (m.leftButton.wasPressedThisFrame) AttackDown(); if (m.leftButton.wasReleasedThisFrame) AttackUp(); }

        if (mv.sqrMagnitude > .02f)
        {
            Vector3 d = CamDir(mv); float sp = u.speed * Mathf.Clamp01(mv.magnitude * 1.2f);
            transform.position += d * sp * dt; u.Face(d, 14);
            u.rig.Play(sp > 2.5f ? "run" : "walk", .15f); u.rig.speed = sp > 2.5f ? sp / 4.6f : 1f;
        }
        else
        {
            bool foes = Unit.Nearest(transform.position, 1, 10f);
            u.rig.Play(foes ? "combat" : "idle", .25f); u.rig.speed = 1f;
        }
    }
}
