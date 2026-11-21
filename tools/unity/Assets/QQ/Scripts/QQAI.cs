// Maidens and Qalmaq soldiers: pick the nearest foe, close in, strike on a cooldown. Archers keep distance and shoot.
// Maidens stay near Gúlayım when no foe is close (author's rule: allies must not lag behind).
using UnityEngine;

[RequireComponent(typeof(Unit))]
public class QQAI : MonoBehaviour
{
    public string Dbg { get { return (target ? target.displayName : "none") + " cd " + cd.ToString("0.0") + " strike " + strikeAt.ToString("0.0"); } }
    Unit u, target; float cd, think, strikeAt = -1; string atk;
    static readonly string[] MELEE = { "slash", "attack", "heavy" };

    void Start() { u = GetComponent<Unit>(); cd = Random.Range(.3f, 1.5f); }

    void Update()
    {
        if (u.Dead || !QQArena.I || !QQArena.I.running) { if (!u.Dead && u.rig) u.rig.Play("idle", .3f); return; }
        if (u.stun > 0) return;
        cd -= Time.deltaTime; think -= Time.deltaTime;
        var pl = QQArena.I.player;
        if (think <= 0 || !target || target.Dead)
        {
            think = .4f; target = Unit.Nearest(transform.position, 1 - u.team, u.team == 0 ? 16f : 60f);
            // Qalmaq soldiers go for Gúlayım herself when she is close: she must not stroll through untouched
            if (u.team == 1 && pl && !pl.Dead && (pl.transform.position - transform.position).sqrMagnitude < 100f && (u.boss || (GetInstanceID() & 1) == 0)) target = pl;
        }

        // pending strike (damage lands part-way through the swing)
        if (strikeAt >= 0)
        {
            strikeAt -= Time.deltaTime;
            if (strikeAt < 0 && target && !target.Dead)
            {
                if (u.archer) QQArrow.Shoot(u, target, u.dmg);
                else if ((target.transform.position - transform.position).magnitude < u.range + target.radius + .4f) target.Hit(u.dmg, u);
            }
            if (u.busy > 0) { if (target) u.Face(target.transform.position - transform.position); return; }
        }

        if (target)
        {
            Vector3 d = target.transform.position - transform.position; d.y = 0; float dist = d.magnitude;
            float want = u.archer ? 9f : u.range + target.radius;
            if (dist > want) { Move(d.normalized); }
            else if (u.archer && dist < 4f) { Move(-d.normalized * .7f); }
            else
            {
                u.Face(d);
                if (cd <= 0)
                {
                    atk = u.archer ? "attack" : MELEE[Random.Range(0, u.boss ? 3 : 2)];
                    u.rig.speed = 1f; u.rig.Play(atk, .08f, false, true); u.busy = u.archer ? .9f : 1.0f; strikeAt = u.archer ? .45f : .42f;
                    cd = (u.archer ? 2.2f : 1.6f) * Random.Range(.85f, 1.25f) * (u.boss ? .8f : 1f);
                }
                else if (u.busy <= 0) { u.rig.speed = 1f; u.rig.Play("combat", .25f); }
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
}
