// QA autoplayer, active only with the command-line flag -qqbot (desktop builds): walks Gúlayım to the nearest foe, attacks,
// dodges when hurt, fires the amulet into crowds. Logs a status line every 5 s, saves screenshots, quits with the result.
//   QirqQiz.exe -qqbot -qqout F:/path/dir -screen-width 1280 -screen-height 720 -screen-fullscreen 0
using System.IO;
using UnityEngine;

public class QQBot : MonoBehaviour
{
    static string outDir; float t, nextLog, nextShot = 4f, atkT; int shots; bool ended; Unit reactFor; float burstAt = -1, burstNext; int burstN; float guardT; int blocks;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
        var args = System.Environment.GetCommandLineArgs();
        if (System.Array.IndexOf(args, "-qqbot") < 0) return;
        int i = System.Array.IndexOf(args, "-qqout"); outDir = i >= 0 && i + 1 < args.Length ? args[i + 1] : Application.persistentDataPath;
        Directory.CreateDirectory(outDir);
        if (System.Array.IndexOf(args, "-qqclose") >= 0) QQCam.debugZoom = .42f;
        int si = System.Array.IndexOf(args, "-qqscene"); if (si >= 0 && si + 1 < args.Length) { int sn = int.Parse(args[si + 1]); if (UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex != sn) UnityEngine.SceneManagement.SceneManager.LoadScene(sn); }
        if (System.Array.IndexOf(args, "-qqkeep") < 0) { PlayerPrefs.DeleteAll(); }   // every QA run starts from battle 1 with no upgrades
        new GameObject("QQBot").AddComponent<QQBot>(); DontDestroyOnLoad(FindFirstObjectByType<QQBot>());
        Application.logMessageReceived += (c, s, ty) => { if (ty == LogType.Exception || ty == LogType.Error) File.AppendAllText(Path.Combine(outDir, "bot.log"), "ERR " + c + " | " + s.Split('\n')[0] + "\n"); };
    }

    void Start() { var a = System.Environment.GetCommandLineArgs(); int i = System.Array.IndexOf(a, "-qqburst"); if (i >= 0 && i + 1 < a.Length) burstAt = float.Parse(a[i + 1], System.Globalization.CultureInfo.InvariantCulture); }
    void Log(string s) { File.AppendAllText(Path.Combine(outDir, "bot.log"), Time.time.ToString("0.0") + " " + s + "\n"); }

    void Update()
    {
        t += Time.deltaTime; var A = QQArena.I; var P = QQPlayer.I; if (!A || !P || !A.player) return;
        var me = A.player;
        if (t >= nextLog) { nextLog = t + 5; Log("hp " + me.hp.ToString("0") + "/" + me.maxHp + " foes " + Unit.CountTeam(1) + " allies " + (Unit.CountTeam(0) - 1) + " running " + A.running + " chain " + P.Chain + " best " + P.BestChain + " tokens " + Unit.TokensOnPlayer() + " obst " + QQObstacles.All.Count + " fps " + (1f / Mathf.Max(1e-4f, Time.smoothDeltaTime)).ToString("0") + Near(me)); }
        // burst: -qqburst T = 24 frames at 0.1 s from time T (motion review)
        if (burstAt > 0 && t >= burstAt && burstN < 24 && t >= burstNext) { burstNext = t + .1f; ScreenCapture.CaptureScreenshot(Path.Combine(outDir, "burst_" + (burstN++).ToString("00") + ".png")); }
        if (t >= nextShot && shots < (QQCam.debugZoom < 1 ? 14 : 6)) { nextShot = t + (QQCam.debugZoom < 1 ? 1.5f : 9); ScreenCapture.CaptureScreenshot(Path.Combine(outDir, "bot_" + (++shots) + ".png")); }
        var end = GameObject.Find("HUD/end");
        if (!ended && end && end.activeSelf) { ended = true; var tx = end.GetComponentsInChildren<UnityEngine.UI.Text>(); Log("END " + (tx.Length > 1 ? tx[0].text + " | " + tx[1].text : "?"));
            for (int g = 0; g < 12; g++) { int c = -1; for (int i = 0; i < 3; i++) if (QQProgress.CanBuy(i) && (c < 0 || QQProgress.Cost(i) < QQProgress.Cost(c))) c = i; if (c < 0) break; QQProgress.Buy(c); }
            Log("SHOP coins " + QQProgress.Coins + " upg " + QQProgress.Upg(0) + "/" + QQProgress.Upg(1) + "/" + QQProgress.Upg(2) + " next level " + QQProgress.Level); ScreenCapture.CaptureScreenshot(Path.Combine(outDir, "bot_end.png")); Invoke(nameof(Quit), 1.5f); }
        if (t > 300 && !ended) { ended = true; Log("TIMEOUT"); Invoke(nameof(Quit), .5f); }
        if (ended || me.Dead) return;

        if (guardT > 0) { guardT -= Time.deltaTime; if (guardT <= 0) { P.DodgeUp(); Log("GUARD end stamina " + P.Stamina.ToString("0.00")); } else return; }   // release even if the foe died meanwhile
        var foe = Unit.Nearest(me.transform.position, 1, 60f);
        if (foe && foe.asleep && QQMission.I && QQMission.I.BotGoal.HasValue) foe = null;   // objective first, posts wake on their own
        if (foe && QQMission.I && QQMission.I.wallZ > -900 && foe.transform.position.z < QQMission.I.wallZ - 1f && QQMission.I.BotGoal.HasValue) foe = null;
        if (!foe && QQMission.I && QQMission.I.BotGoal.HasValue)
        {
            Vector3 dd = QQMission.I.BotGoal.Value - me.transform.position; dd.y = 0; var cm = Camera.main.transform; Vector3 ff = cm.forward; ff.y = 0; ff.Normalize(); Vector3 rr2 = cm.right; rr2.y = 0; rr2.Normalize();
            QQHud.Move = dd.magnitude > .8f ? new Vector2(Vector3.Dot(dd.normalized, rr2), Vector3.Dot(dd.normalized, ff)) : Vector2.zero; return;
        }
        if (!foe) { QQHud.Move = Vector2.zero; return; }
        Vector3 d = foe.transform.position - me.transform.position; d.y = 0; float dist = d.magnitude;
        var cam = Camera.main.transform; Vector3 f = cam.forward; f.y = 0; f.Normalize(); Vector3 r = cam.right; r.y = 0; r.Normalize();
        Vector3 dn = d.normalized; QQHud.Move = dist > 2.2f ? new Vector2(Vector3.Dot(dn, r), Vector3.Dot(dn, f)) : Vector2.zero;
        atkT -= Time.deltaTime;
        if (atkT <= 0 && dist < 14f) { atkT = .35f; P.AttackDown(); P.AttackUp(); }
        // react to telegraph marks like a decent player: counter gold marks, roll away from red ones (70% of the time)
        foreach (var o in Unit.All)
            if (o.team == 1 && !o.Dead && o.swingAt == me && o.telegraph > 0 && o.telegraph < .3f && (o.transform.position - me.transform.position).sqrMagnitude < 16f)
            { if (reactFor != o) { reactFor = o; if (Random.value < .7f) { P.Dodge(); Log(o.unblockable ? "ROLL red" : "COUNTER " + o.displayName + " chain " + P.Chain); } } break; }
        // guard test: now and then hold the dodge button for ~1 s when foes are close
        if (dist < 3f && Random.value < .004f) { P.DodgeDown(); guardT = 1.1f; blocks++; Log("GUARD start"); }
        int crowd = 0; foreach (var u in Unit.All) if (u.team == 1 && !u.Dead && (u.transform.position - me.transform.position).sqrMagnitude < 36f) crowd++;
        if (crowd >= 4 && P.AmuletReady >= 1f) P.Amulet();
        if (me.hp < me.maxHp * .5f && P.DodgeReady >= 1f && dist < 3f && Random.value < .02f) P.Dodge();
    }

    static string Near(Unit me)
    {
        var f = Unit.Nearest(me.transform.position, 1, 60f); if (!f) return "";
        var ai = f.GetComponent<QQAI>();
        return " | near " + (f.transform.position - me.transform.position).magnitude.ToString("0.0") + "m busy " + f.busy.ToString("0.0") + " stun " + f.stun.ToString("0.0") + " inv " + me.inv.ToString("0.0") + " anim " + (f.rig ? f.rig.Current : "-") + " ai " + (ai ? ai.Dbg : "");
    }

    // leave no trace in the real save (level, coins, upgrades, hints): the author plays this same build
    void Quit() { if (System.Array.IndexOf(System.Environment.GetCommandLineArgs(), "-qqkeep") < 0) { PlayerPrefs.DeleteAll(); PlayerPrefs.Save(); } Application.Quit(); }
}
