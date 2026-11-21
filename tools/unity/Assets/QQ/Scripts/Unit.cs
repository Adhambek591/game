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
    // Arkham-style telegraph: seconds left before this fighter's blow lands; the HUD shows a mark over his head meanwhile.
    // unblockable = red mark (boss heavy blows): a counter fails, only a roll saves you.
    [System.NonSerialized] public float telegraph; [System.NonSerialized] public bool unblockable; [System.NonSerialized] public Unit swingAt;
    // Ghost of Tsushima: foes look aggressive but only a couple attack Gúlayım at a time; the rest circle and wait for a turn
    [System.NonSerialized] public bool hasToken;
    // story missions: guard posts sleep until Gúlayım comes near (or one of them is hit), then the whole group wakes
    [System.NonSerialized] public int group; [System.NonSerialized] public bool asleep, isCaptive, anchored; [System.NonSerialized] public float wakeR = 13f;
    public static void WakeGroup(int g) { if (g == 0) return; for (int i = 0; i < All.Count; i++) if (All[i].group == g) All[i].asleep = false; }
    public static int CountGroup(int g) { int n = 0; for (int i = 0; i < All.Count; i++) if (All[i].group == g && !All[i].Dead) n++; return n; }
    public static int TokensOnPlayer() { int n = 0; for (int i = 0; i < All.Count; i++) if (All[i].hasToken && !All[i].Dead) n++; return n; }
    public bool Dead { get { return hp <= 0; } }
    public System.Action<Unit, float> onHit;
    Renderer[] rends; float flash; MaterialPropertyBlock mpb;

    void Awake() { rig = GetComponentInChildren<QQRig>(); rends = GetComponentsInChildren<Renderer>(); mpb = new MaterialPropertyBlock(); }
    void OnEnable() { All.Add(this); }
    void OnDisable() { All.Remove(this); }

    public void Hit(float d, Unit from, bool heavy = false)
    {
        if (Dead || inv > 0) return;
        // a sentry struck from behind while unaware falls silently (chapter 3 stealth): heavy damage, the others do not wake
        bool silent = false;
        if (asleep && from && from.isPlayer && Vector3.Dot(transform.forward, from.transform.position - transform.position) < .1f) { d *= 12f; silent = true; }
        if (asleep && !silent) WakeGroup(group);
        hp -= d; flash = .1f;
        if (onHit != null) onHit(from, d);
        QQFx.Spark(transform.position + Vector3.up * 1.2f, team == 0 ? new Color(1f, .45f, .3f) : new Color(1f, .85f, .5f));
        QQFeel.Sfx(heavy ? "v_hit" : "hit", transform.position, heavy ? 1f : .75f);
        if (isPlayer) QQFeel.Sfx("hurt", null, .6f);
        Vector3 away = from ? transform.position - from.transform.position : -transform.forward; away.y = 0;
        if (rig) rig.Impulse(away, heavy ? 260f : 150f);
        if (hp <= 0) { Die(from); return; }
        // poise (author: no stun-lock): after a flinch a fighter cannot be flinched again for a while, so fast combos
        // do not freeze him and he swings back; bosses flinch only on heavy blows, then shrug off hits for 3 s
        if (stunImmune <= 0 && (!boss || heavy)) { stun = heavy ? .6f : .28f; busy = 0; telegraph = 0; stunImmune = boss ? 3f : 1.1f; if (rig) rig.Play("hit", .05f, false, true); }
        if (from) transform.position += away.normalized * (heavy ? (boss ? .4f : 1.4f) : .25f);
    }

    void Die(Unit from)
    {
        hp = 0; telegraph = 0; hasToken = false; if (rig) { rig.Play("dead", .08f, false, true); rig.lookAt = null; }
        QQFeel.Sfx(boss ? "roar" : "death", transform.position, boss ? 1f : .6f);
        All.Remove(this);
        if (QQArena.I) QQArena.I.OnDeath(this);
        Destroy(gameObject, 6f);
        enabled = false;
        SetFlash(0);
    }

    void SetFlash(float k)
    {
        if (rends == null) return;
        var c = new Color(1f, .8f, .55f) * (k * .28f);   // a warm glint, not a white silhouette
        for (int i = 0; i < rends.Length; i++) { if (!rends[i]) continue; rends[i].GetPropertyBlock(mpb); mpb.SetColor("emissiveFactor", c); rends[i].SetPropertyBlock(mpb); }
    }

    void Update()
    {
        float dt = Time.deltaTime;
        if (stun > 0) stun -= dt; if (stunImmune > 0) stunImmune -= dt; if (inv > 0) inv -= dt; if (busy > 0) busy -= dt; if (telegraph > 0) telegraph -= dt;
        if (flash > 0) { flash -= dt; SetFlash(Mathf.Max(0, flash) / .1f); if (flash <= 0) SetFlash(0); }
        // separation
        for (int i = 0; i < All.Count && !anchored; i++)
        {
            var o = All[i]; if (o == this) continue;
            Vector3 d = transform.position - o.transform.position; d.y = 0; float r = radius + o.radius, m = d.sqrMagnitude;
            if (m < r * r && m > 1e-6f) { float k = (r - Mathf.Sqrt(m)) * (isPlayer ? .2f : .5f); transform.position += d.normalized * k; }
        }
        transform.position = QQObstacles.PushOut(transform.position, radius);
        var p = transform.position; var bd = QQArena.I ? QQArena.I.bounds : new Vector4(-30, 30, -30, 30);
        float zmin = bd.z; if (team == 0 && QQMission.I) zmin = Mathf.Max(zmin, QQMission.I.wallZ + .6f);   // a closed gate
        transform.position = new Vector3(Mathf.Clamp(p.x, bd.x, bd.y), 0, Mathf.Clamp(p.z, zmin, bd.w));
    }

    public void Face(Vector3 dir, float k = 12f)
    {
        dir.y = 0; if (dir.sqrMagnitude < 1e-4f) return;
        transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), Mathf.Min(1f, Time.deltaTime * k));
    }

    public static Unit Nearest(Vector3 p, int team, float maxDist, Unit except = null)
    {
        Unit best = null; float bd = maxDist * maxDist;
        for (int i = 0; i < All.Count; i++) { var u = All[i]; if (u.team != team || u.Dead || u == except || u.isCaptive) continue; float d = (u.transform.position - p).sqrMagnitude; if (d < bd) { bd = d; best = u; } }
        return best;
    }

    // allies leave bosses to Gúlayım (author: she fights main bosses alone)
    public static Unit NearestNoBoss(Vector3 p, int team, float maxDist)
    {
        Unit best = null; float bd = maxDist * maxDist;
        for (int i = 0; i < All.Count; i++) { var u = All[i]; if (u.team != team || u.Dead || u.boss) continue; float d = (u.transform.position - p).sqrMagnitude; if (d < bd) { bd = d; best = u; } }
        return best;
    }

    public static int CountTeam(int team) { int n = 0; for (int i = 0; i < All.Count; i++) if (All[i].team == team && !All[i].Dead) n++; return n; }
}
