// Maidens and Qalmaq soldiers: pick the nearest foe, close in, strike on a cooldown. Archers keep distance and shoot.
// Maidens stay near Gúlayım when no foe is close (author's rule: allies must not lag behind).
// Against Gúlayım (lessons from Arkham / Ghost of Tsushima, docs/design/genre_study_uz.md):
//  - only a few foes hold an attack token at a time; the others circle at a distance in a fighting stance, so a crowd stays readable;
//  - every swing has a readable wind-up (slow start of the clip) and a telegraph mark over the head = the counter window.
using UnityEngine;

[RequireComponent(typeof(Unit))]
public class QQAI : MonoBehaviour
{
    public string Dbg { get { return (target ? target.displayName : "none") + " cd " + cd.ToString("0.0") + " strike " + strikeAt.ToString("0.0") + (u && u.hasToken ? " TOKEN" : ""); } }
    Unit u, target; float cd, think, strikeAt = -1, windup, circleDir; string atk; bool phase2, slam;
    // author's crowd rules (browser build combat2 / fix3 logs): every fighter has a personality (pace, tempo, reaction);
    // allies keep their OWN loose spot BEHIND Gúlayım and notice she moved only after their own delay; they walk, and sprint
    // only when left far behind; at most 2 allies per ordinary foe; foes spread over targets; around a target each attacker
    // takes its own slot on a ring, so nobody runs in one clump
    float pace, tempo, react, slotAng; int comboLeft; bool followUp; float pounceT = -1, pounceCd = 4f; Vector3 pounceFrom, pounceTo; Vector3 spot; Vector3 lastPl; float noticeT; bool sprinting;
    static readonly string[] MELEE = { "attack", "slash3", "attack4", "heavy" };   // no spinning clips (FaceProbe)
    static int MaxTokens { get { return QQArena.I && QQArena.I.Wave >= 2 ? 3 : 2; } }

    void Start()
    {
        u = GetComponent<Unit>(); cd = Random.Range(.3f, 1.5f); circleDir = Random.value < .5f ? -1 : 1;
        pace = Random.Range(.85f, 1.12f); tempo = Random.Range(.85f, 1.2f); react = Random.Range(.5f, 3f); slotAng = Random.Range(0f, 360f);
        spot = new Vector3(Random.Range(-5.5f, 5.5f), 0, -Random.Range(1.8f, 6.5f));
    }
    static int Attackers(Unit t, Unit except) { int n = 0; for (int i = 0; i < Unit.All.Count; i++) { var o = Unit.All[i]; if (o == except || o.Dead || o.team == t.team) continue; var ai = o.GetComponent<QQAI>(); if (ai && ai.target == t) n++; } return n; }
    // best target: near, but crowded targets cost more (an ordinary foe takes at most 2 allies, an elite 3, a boss none: she duels alone)
    Unit Pick(Vector3 from, float maxD, Unit pl)
    {
        Unit best = null; float bs = 1e9f;
        for (int i = 0; i < Unit.All.Count; i++)
        {
            var o = Unit.All[i]; if (o.team == u.team || o.Dead || o.isCaptive) continue;
            if (u.team == 0 && o.boss) continue;
            float d = (o.transform.position - from).magnitude; if (d > maxD) continue;
            if (u.team == 0 && pl && (o.transform.position - pl.transform.position).sqrMagnitude > 12.5f * 12.5f) continue;   // allies fight near her, not off on their own
            int n = Attackers(o, u); int cap = u.team == 0 ? 2 : (o.isPlayer ? 99 : 3);
            if (n >= cap && o != target) continue;
            float sc = d + n * 4f + (o == target ? -2f : 0);
            if (sc < bs) { bs = sc; best = o; }
        }
        return best;
    }

    void Update()
    {
        if (u.Dead || !QQArena.I || !QQArena.I.running) { if (!u.Dead && u.rig) u.rig.Play("idle", .3f); return; }
        if (u.stun > 0) { strikeAt = -1; return; }
        if (u.asleep)
        {
            var pp = QQArena.I.player; u.rig.speed = 1f; u.rig.Play("idle", .3f);
            if (pp && !pp.Dead && (pp.transform.position - transform.position).sqrMagnitude < u.wakeR * u.wakeR) { Unit.WakeGroup(u.group); QQFeel.Sfx("v_drum", transform.position, .5f, 0); }
            return;
        }
        float dt = Time.deltaTime; cd -= dt; think -= dt;
        // boss phase 2 (Sekiro / Ghost of Tsushima duels): at half health he roars, shrugs off flinches, moves faster, adds a ground slam
        if (u.boss && !phase2 && u.hp < u.maxHp * .5f)
        {
            phase2 = true; strikeAt = -1; u.telegraph = 0; u.hasToken = false; u.rig.PlaySeg("taunt", .6f, 1.0f, .1f); u.busy = 1.6f; u.stunImmune = 2.5f; u.speed *= 1.25f; cd = 1.8f;
            QQFeel.Sfx("roar", transform.position, 1f, 0); QQCam.shake = 1f; QQHud.Toast(u.displayName + " g'azablandi!"); QQFx.Ring(transform.position, new Color(1f, .3f, .2f), 6f);
            return;
        }
        var pl = QQArena.I.player;
        // boss pounce (Qasqır is a wolf: he leaps at her from 5-11 m; a red ring marks where he lands)
        if (pounceT >= 0)
        {
            pounceT += dt; float k = Mathf.Clamp01((pounceT - .55f) / .35f);
            if (pounceT < .55f) { u.Face(pounceTo - transform.position, 10f); return; }   // crouch / wind-up while the ring warns
            transform.position = Vector3.Lerp(pounceFrom, pounceTo, k) + Vector3.up * Mathf.Sin(k * Mathf.PI) * 1.6f;
            if (k >= 1f)
            {
                pounceT = -1; var p0 = transform.position; p0.y = 0; transform.position = p0; QQCam.shake = 1.1f; QQFeel.Sfx("slam", p0, 1f, 0); QQFx.Ring(p0, new Color(1f, .45f, .25f), 3f);
                foreach (var o in Unit.All.ToArray()) if (o.team != u.team && !o.Dead && (o.transform.position - p0).sqrMagnitude < 2.6f * 2.6f) o.Hit(u.dmg * 1.4f, u, true);
                u.busy = .6f; cd = 1.2f;
            }
            return;
        }
        if (u.boss) pounceCd -= dt;
        if (u.boss && pounceCd <= 0 && pl && !pl.Dead && strikeAt < 0 && u.busy <= 0 && u.stun <= 0)
        {
            float pd = (pl.transform.position - transform.position).magnitude;
            if (pd > 5f && pd < 11f)
            {
                pounceCd = Random.Range(5f, 8f) * (phase2 ? .7f : 1f); pounceT = 0; pounceFrom = transform.position; pounceTo = pl.transform.position;
                QQFx.Warn(pounceTo, new Color(1f, .2f, .15f), 2.6f, .9f); u.rig.PlaySeg(u.rig.Has("leap") ? "leap" : "slam", .55f, .5f, .06f); u.busy = 1.4f; u.telegraph = .9f; u.unblockable = true; u.swingAt = pl;
                QQFeel.Sfx("howl", transform.position, .8f, 0); return;
            }
        }
        if (think <= 0 || !target || target.Dead)
        {
            think = Random.Range(.7f, 1.6f); target = Pick(transform.position, u.team == 0 ? 16f : 60f, pl);
            if (u.boss && pl && !pl.Dead) target = pl;   // the boss duels Gúlayım only
            // Qalmaq soldiers go for Gúlayım herself when she is close: she must not stroll through untouched
            if (u.team == 1 && pl && !pl.Dead && (pl.transform.position - transform.position).sqrMagnitude < 100f && (u.boss || (GetInstanceID() & 1) == 0)) target = pl;
            if (u.hasToken && target != pl) u.hasToken = false;
        }
        if (u.rig) u.rig.lookAt = target ? target.transform : null;

        // wind-up: the clip starts slow (anticipation) and the blow lands at the end of the telegraph
        if (strikeAt >= 0)
        {
            strikeAt -= dt; windup += dt;
            if (target) u.Face(target.transform.position - transform.position, windup < .3f ? 8f : 2f);
            if (strikeAt < 0)
            {
                if (target && !target.Dead)
                {
                    if (u.archer) { QQArrow.Shoot(u, target, u.dmg); QQFeel.Sfx("v_bow", transform.position, .5f); }
                    else if (slam)
                    {
                        QQFeel.Sfx("slam", transform.position, 1f, 0); QQCam.shake = 1.3f; QQFx.Ring(transform.position, new Color(1f, .45f, .25f), 4f);
                        foreach (var o in Unit.All.ToArray()) if (o.team != u.team && !o.Dead && (o.transform.position - transform.position).sqrMagnitude < 4f * 4f) o.Hit(u.dmg * 1.2f, u, true);
                    }
                    else
                    {
                        QQFeel.Sfx("v_swing", transform.position, .6f); if (u.boss) QQSlash.Spawn(transform, new Color(1f, .3f, .2f), 170, u.range + 1.2f, Random.Range(-30f, 30f), Random.value < .5f ? 1 : -1, 1.4f);
                        if ((target.transform.position - transform.position).magnitude < u.range + target.radius + .5f)
                            target.Hit(u.dmg * (u.unblockable ? 1.6f : 1f) * (u.boss && followUp ? .55f : 1f), u, u.unblockable);
                    }
                }
                u.hasToken = false; u.unblockable = false; u.swingAt = null; slam = false;
                if (u.boss && comboLeft > 0) { comboLeft--; cd = .35f; u.busy = .1f; followUp = true; } else if (u.boss) { comboLeft = Random.Range(0, phase2 ? 3 : 2); followUp = false; }
            }
            if (u.busy > 0) return;
        }

        if (target)
        {
            Vector3 d = target.transform.position - transform.position; d.y = 0; float dist = d.magnitude;
            bool onPlayer = target == pl && u.team == 1 && !u.archer;
            // wait for a turn: hold a ring around Gúlayım and circle in a fighting stance
            if (onPlayer && !u.hasToken)
            {
                if (cd <= 0 && (u.boss || Unit.TokensOnPlayer() < MaxTokens)) u.hasToken = true;
                else
                {
                    float ring = 4.2f + (GetInstanceID() % 3) * .6f;
                    Vector3 side = Vector3.Cross(Vector3.up, d.normalized) * circleDir;
                    Vector3 want = (dist > ring + .6f ? d.normalized : dist < ring - .6f ? -d.normalized * .8f : Vector3.zero) + side * .45f;
                    if (want.sqrMagnitude > .01f) { Strafe(want, d); } else { u.Face(d); u.rig.speed = 1f; u.rig.Play("combat", .25f); }
                    if (Random.value < dt * .25f) circleDir = -circleDir;
                    return;
                }
            }
            float reach = u.archer ? 9f : u.range + target.radius;
            if (!u.archer && dist > reach)
            {
                // own slot on a ring round the target (angle fixed per fighter), walk the last metres
                float a = slotAng * Mathf.Deg2Rad; Vector3 slot = target.transform.position + new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a)) * (reach * .92f);
                Vector3 to = (dist > 6f ? target.transform.position : slot) - transform.position; to.y = 0;
                float k = dist > 6f ? 1f : Mathf.Clamp(to.magnitude / 3f, .35f, .6f);
                if (to.magnitude > .25f) Move(to.normalized * k); else { u.Face(d); u.rig.speed = 1f; u.rig.Play("combat", .25f); }
            }
            else if (dist > reach) { Move(d.normalized); }
            else if (u.archer && dist < 4f) { Move(-d.normalized * .7f); }
            else
            {
                u.Face(d);
                if (cd <= 0)
                {
                    atk = u.archer ? (u.rig.Has("bow") ? "bow" : "attack") : u.boss ? (Random.value < .35f && u.rig.Has("combo_b1") ? (Random.value < .5f ? "combo_b1" : "combo_b2") : MELEE[Random.Range(0, 4)]) : MELEE[Random.Range(0, 3)];
                    float wind = u.archer ? .55f : u.boss ? (phase2 ? .55f : .7f) : .62f;
                    u.unblockable = u.boss && atk == "heavy";
                    slam = phase2 && Random.value < .35f && u.rig.Has("slam");
                    if (slam) { atk = "slam"; wind = .95f; u.unblockable = true; QQFx.Warn(transform.position, new Color(1f, .2f, .15f), 4f, wind); }
                    u.rig.PlaySeg(atk, wind, .5f, .08f); u.busy = wind + .5f; strikeAt = wind; windup = 0;   // impact on the clip's hit frame
                    if (target == pl) { u.telegraph = wind; u.swingAt = pl; }
                    cd = (u.archer ? 2.2f : 1.7f) * Random.Range(.85f, 1.25f) * tempo * (u.boss ? (phase2 ? .6f : .8f) : 1f);
                    slotAng += Random.Range(-50f, 50f);   // after the blow, step to a slightly different spot
                }
                else if (u.busy <= 0) { u.rig.speed = 1f; u.rig.Play("combat", .25f); if (onPlayer && cd > .6f) u.hasToken = false; }
            }
        }
        else if (u.team == 0 && pl && !pl.Dead)
        {
            // her own loose spot behind Gúlayım; she notices Gúlayım moved only after her own delay
            if ((pl.transform.position - lastPl).sqrMagnitude > 4f) { if (noticeT <= 0) noticeT = react; noticeT -= dt; if (noticeT <= 0) { lastPl = pl.transform.position; spot = new Vector3(Random.Range(-5.5f, 5.5f), 0, -Random.Range(1.8f, 6.5f)); } }
            Vector3 slot = lastPl + Quaternion.Euler(0, pl.transform.eulerAngles.y, 0) * spot;
            Vector3 d = slot - transform.position; d.y = 0; float far = (pl.transform.position - transform.position).magnitude;
            if (far > 18f + react * 2f) sprinting = true; else if (far < 9f) sprinting = false;
            if (d.magnitude > 1.2f) Move(d.normalized * (sprinting ? 1f : .5f)); else { u.rig.Play("idle", .3f); u.Face(pl.transform.position - transform.position, 2f); }
        }
        else u.rig.Play("idle", .3f);
    }

    void Move(Vector3 dir)
    {
        float sp = u.speed * pace * dir.magnitude; if (sp < .05f) return;
        transform.position += dir.normalized * sp * Time.deltaTime; u.Face(dir);
        u.rig.Locomote(sp, .2f);
    }

    // sideways / backwards step while still facing the foe
    void Strafe(Vector3 dir, Vector3 face)
    {
        float sp = u.speed * .45f; transform.position += dir.normalized * sp * Time.deltaTime; u.Face(face, 8f);
        u.rig.Locomote(sp, .25f);
    }
}
