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
    static readonly string[] MELEE = { "slash", "attack", "heavy" };
    static int MaxTokens { get { return QQArena.I && QQArena.I.Wave >= 2 ? 3 : 2; } }

    void Start() { u = GetComponent<Unit>(); cd = Random.Range(.3f, 1.5f); circleDir = Random.value < .5f ? -1 : 1; }

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
        if (think <= 0 || !target || target.Dead)
        {
            think = .4f; target = u.team == 0 ? Unit.NearestNoBoss(transform.position, 1, 16f) : Unit.Nearest(transform.position, 0, 60f);
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
                        QQFeel.Sfx("v_swing", transform.position, .6f);
                        if ((target.transform.position - transform.position).magnitude < u.range + target.radius + .5f)
                            target.Hit(u.dmg * (u.unblockable ? 1.6f : 1f), u, u.unblockable);
                    }
                }
                u.hasToken = false; u.unblockable = false; u.swingAt = null; slam = false;
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
            if (dist > reach) { Move(d.normalized); }
            else if (u.archer && dist < 4f) { Move(-d.normalized * .7f); }
            else
            {
                u.Face(d);
                if (cd <= 0)
                {
                    atk = u.archer ? "attack" : MELEE[Random.Range(0, u.boss ? 3 : 2)];
                    float wind = u.archer ? .55f : u.boss ? (phase2 ? .55f : .7f) : .62f;
                    u.unblockable = u.boss && atk == "heavy";
                    slam = phase2 && Random.value < .35f && u.rig.Has("slam");
                    if (slam) { atk = "slam"; wind = .95f; u.unblockable = true; QQFx.Warn(transform.position, new Color(1f, .2f, .15f), 4f, wind); }
                    u.rig.PlaySeg(atk, wind, .5f, .08f); u.busy = wind + .5f; strikeAt = wind; windup = 0;   // impact on the clip's hit frame
                    if (target == pl) { u.telegraph = wind; u.swingAt = pl; }
                    cd = (u.archer ? 2.2f : 1.7f) * Random.Range(.85f, 1.25f) * (u.boss ? (phase2 ? .6f : .8f) : 1f);
                }
                else if (u.busy <= 0) { u.rig.speed = 1f; u.rig.Play("combat", .25f); if (onPlayer && cd > .6f) u.hasToken = false; }
            }
        }
        else if (u.team == 0 && pl && !pl.Dead)
        {
            // follow Gúlayım in a loose fan behind her
            Vector3 slot = pl.transform.position - pl.transform.forward * 2.2f + pl.transform.right * ((GetInstanceID() % 5) - 2) * 1.3f;
            Vector3 d = slot - transform.position; d.y = 0;
            if (d.magnitude > 1.2f) Move(d.normalized * Mathf.Clamp01(d.magnitude / 3f + .4f)); else { u.rig.Play("idle", .3f); u.Face(pl.transform.forward, 3f); }
        }
        else u.rig.Play("idle", .3f);
    }

    void Move(Vector3 dir)
    {
        float sp = u.speed * dir.magnitude; if (sp < .05f) return;
        transform.position += dir.normalized * sp * Time.deltaTime; u.Face(dir);
        u.rig.Play(sp > 2.2f ? "run" : "walk", .2f); u.rig.speed = sp > 2.2f ? sp / 4.2f : 1f;
    }

    // sideways / backwards step while still facing the foe
    void Strafe(Vector3 dir, Vector3 face)
    {
        float sp = u.speed * .45f; transform.position += dir.normalized * sp * Time.deltaTime; u.Face(face, 8f);
        u.rig.Play("walk", .25f); u.rig.speed = .8f;
    }
}
