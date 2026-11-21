// One fighter (Gúlayım, maiden, soldier, captain). Flat-ground movement, no physics: units push each other apart.
using System.Collections.Generic;
using UnityEngine;

public class Unit : MonoBehaviour
{
    public static readonly List<Unit> All = new List<Unit>();
    public int team;                 // 0 = Gúlayım's side, 1 = Qalmaq
    public float maxHp = 100, hp = 100, dmg = 10, range = 1.8f, speed = 3.2f, radius = .45f;
    public bool archer, isPlayer, boss;
    public string displayName = "";
    [System.NonSerialized] public QQRig rig;
    [System.NonSerialized] public float stun, inv, busy, stunImmune;   // seconds: hit-stun, invulnerable (dodge), locked in an attack
    public bool Dead { get { return hp <= 0; } }
    public System.Action<Unit, float> onHit;
    Renderer[] rends; float flash;

    void Awake() { rig = GetComponentInChildren<QQRig>(); rends = GetComponentsInChildren<Renderer>(); }
    void OnEnable() { All.Add(this); }
    void OnDisable() { All.Remove(this); }

    public void Hit(float d, Unit from, bool heavy = false)
    {
        if (Dead || inv > 0) return;
        hp -= d; flash = .12f;
        if (onHit != null) onHit(from, d);
        QQFx.Spark(transform.position + Vector3.up * 1.2f, team == 0 ? new Color(1f, .45f, .3f) : new Color(1f, .85f, .5f));
        if (hp <= 0) { Die(from); return; }
        // poise (author: no stun-lock): after a flinch a fighter cannot be flinched again for a while, so fast combos
        // do not freeze him and he swings back; bosses flinch only on heavy blows, then shrug off hits for 3 s
        if (stunImmune <= 0 && (!boss || heavy)) { stun = heavy ? .6f : .28f; busy = 0; stunImmune = boss ? 3f : 1.1f; if (rig) rig.Play("hit", .05f, false, true); }
        if (from) transform.position += (transform.position - from.transform.position).normalized * (heavy ? .9f : .25f);
    }

    void Die(Unit from)
    {
        hp = 0; if (rig) rig.Play("dead", .08f, false, true);
        All.Remove(this);
        if (QQArena.I) QQArena.I.OnDeath(this);
        Destroy(gameObject, 6f);
        enabled = false;
    }

    void Update()
    {
        if (stun > 0) stun -= Time.deltaTime; if (stunImmune > 0) stunImmune -= Time.deltaTime; if (inv > 0) inv -= Time.deltaTime; if (busy > 0) busy -= Time.deltaTime;
        if (flash > 0) { flash -= Time.deltaTime; }
        // separation
        for (int i = 0; i < All.Count; i++)
        {
            var o = All[i]; if (o == this) continue;
            Vector3 d = transform.position - o.transform.position; d.y = 0; float r = radius + o.radius, m = d.sqrMagnitude;
            if (m < r * r && m > 1e-6f) { float k = (r - Mathf.Sqrt(m)) * (isPlayer ? .2f : .5f); transform.position += d.normalized * k; }
        }
        var p = transform.position; float lim = QQArena.I ? QQArena.I.halfSize : 30f;
        transform.position = new Vector3(Mathf.Clamp(p.x, -lim, lim), 0, Mathf.Clamp(p.z, -lim, lim));
    }

    public void Face(Vector3 dir, float k = 12f)
    {
        dir.y = 0; if (dir.sqrMagnitude < 1e-4f) return;
        transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), Mathf.Min(1f, Time.deltaTime * k));
    }

    public static Unit Nearest(Vector3 p, int team, float maxDist, Unit except = null)
    {
        Unit best = null; float bd = maxDist * maxDist;
        for (int i = 0; i < All.Count; i++) { var u = All[i]; if (u.team != team || u.Dead || u == except) continue; float d = (u.transform.position - p).sqrMagnitude; if (d < bd) { bd = d; best = u; } }
        return best;
    }

    public static int CountTeam(int team) { int n = 0; for (int i = 0; i < All.Count; i++) if (All[i].team == team && !All[i].Dead) n++; return n; }
}
