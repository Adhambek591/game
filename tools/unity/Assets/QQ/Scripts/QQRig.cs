// Plays the shared mocap clips on one character: retargets each clip to this model's bind pose once
// (out = bind * rest^-1 * key, as the browser SkinRig does), then samples with cross-fades every frame.
using System.Collections.Generic;
using UnityEngine;

public class QQRig : MonoBehaviour
{
    class RTrack { public float[] t; public Quaternion[] q; }
    class RClip { public QQAnimLib.Clip src; public List<KeyValuePair<Transform, RTrack>> rot = new List<KeyValuePair<Transform, RTrack>>(); public Dictionary<Transform, RTrack> map = new Dictionary<Transform, RTrack>(); public float[] ht; public float[] hy; }
    static readonly string[] BONES = { "Hips", "Spine", "Spine01", "Spine02", "neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase" };
    readonly Dictionary<string, Transform> B = new Dictionary<string, Transform>();
    readonly Dictionary<Transform, Quaternion> bind = new Dictionary<Transform, Quaternion>();
    readonly Dictionary<string, RClip> rc = new Dictionary<string, RClip>();
    Transform hips; Vector3 hipsBind;
    string cur, prev; float tCur, tPrev, fade = 1f, fadeDur = .15f; bool loopCur = true, loopPrev = true;
    public float speed = 1f;
    public string Current { get { return cur; } }
    public float ClipTime { get { return tCur; } }
    public float Duration { get { RClip r; return cur != null && rc.TryGetValue(cur, out r) ? r.src.dur : 1f; } }
    public bool Done { get { return !loopCur && cur != null && tCur >= Duration; } }
    public Transform Bone(string n) { Init(); Transform b; return B.TryGetValue(n, out b) ? b : null; }

    bool inited;
    void Awake() { Init(); }
    void Init()
    {
        if (inited) return; inited = true;
        QQAnimLib.Load();
        foreach (var t in GetComponentsInChildren<Transform>(true)) if (!B.ContainsKey(t.name)) B[t.name] = t;
        foreach (var n in BONES) { Transform b; if (B.TryGetValue(n, out b)) bind[b] = b.localRotation; }
        hips = Bone("Hips"); if (hips) hipsBind = hips.localPosition;
    }

    RClip Get(string name)
    {
        Init(); RClip r; if (rc.TryGetValue(name, out r)) return r;
        QQAnimLib.Clip c; if (QQAnimLib.clips == null || !QQAnimLib.clips.TryGetValue(name, out c)) return null;
        r = new RClip { src = c };
        foreach (var kv in c.rot)
        {
            Transform b; Quaternion rest;
            if (!B.TryGetValue(kv.Key, out b) || !bind.ContainsKey(b) || !QQAnimLib.restR.TryGetValue(kv.Key, out rest)) continue;
            var qS = Quaternion.Inverse(QQAnimLib.Conv(rest)); var qT = bind[b]; var tr = kv.Value; int n = tr.t.Length; var qs = new Quaternion[n];
            for (int i = 0; i < n; i++) qs[i] = qT * qS * QQAnimLib.Conv(new Quaternion(tr.v[i * 4], tr.v[i * 4 + 1], tr.v[i * 4 + 2], tr.v[i * 4 + 3]));
            var rt = new RTrack { t = tr.t, q = qs }; r.rot.Add(new KeyValuePair<Transform, RTrack>(b, rt)); r.map[b] = rt;
        }
        if (c.hipsT != null && hips) { float k = hipsBind.y / QQAnimLib.hipsY; int n = c.hipsT.t.Length; r.ht = c.hipsT.t; r.hy = new float[n]; for (int i = 0; i < n; i++) r.hy[i] = c.hipsT.v[i * 3 + 1] * k; }
        rc[name] = r; return r;
    }

    public bool Has(string name) { return Get(name) != null; }

    public void Play(string name, float fadeTime = .15f, bool loop = true, bool restart = false)
    {
        if (name == cur && !restart) return;
        if (Get(name) == null) return;
        prev = cur; tPrev = tCur; loopPrev = loopCur; cur = name; tCur = 0; loopCur = loop; fade = prev == null ? 1f : 0f; fadeDur = Mathf.Max(.01f, fadeTime);
    }

    static int Key(float[] t, float time)
    {
        int hi = t.Length - 1; if (hi < 1 || time <= t[0]) return 0; if (time >= t[hi]) return hi - 1;
        int lo = 0; while (hi - lo > 1) { int m = (lo + hi) >> 1; if (t[m] <= time) lo = m; else hi = m; }
        return lo;
    }
    static Quaternion SampleQ(RTrack tr, float time)
    {
        if (tr.t.Length == 1) return tr.q[0]; int i = Key(tr.t, time);
        float u = Mathf.Clamp01((time - tr.t[i]) / Mathf.Max(1e-5f, tr.t[i + 1] - tr.t[i])); return Quaternion.Slerp(tr.q[i], tr.q[i + 1], u);
    }
    static float SampleF(float[] t, float[] v, float time)
    {
        if (t.Length == 1) return v[0]; int i = Key(t, time);
        float u = Mathf.Clamp01((time - t[i]) / Mathf.Max(1e-5f, t[i + 1] - t[i])); return Mathf.Lerp(v[i], v[i + 1], u);
    }
    static float Wrap(float t, float d, bool loop) { return loop ? (d > 0 ? Mathf.Repeat(t, d) : 0) : Mathf.Min(t, d); }

    // edit-mode posing (headless screenshots): jump the current clip to a fraction of its length
    public void SampleAt(float frac) { if (cur == null) return; tCur = rc[cur].src.dur * frac; fade = 1f; prev = null; Apply(0); }

    void LateUpdate() { Apply(Time.deltaTime); }

    void Apply(float rawDt)
    {
        if (cur == null) return; var a = rc[cur]; float dt = rawDt * speed;
        tCur += dt; fade = Mathf.Min(1f, fade + rawDt / fadeDur);
        RClip p = fade < 1f && prev != null ? rc[prev] : null; if (p != null) tPrev += dt;
        float ta = Wrap(tCur, a.src.dur, loopCur), tp = p != null ? Wrap(tPrev, p.src.dur, loopPrev) : 0;
        for (int i = 0; i < a.rot.Count; i++)
        {
            var kv = a.rot[i]; var q = SampleQ(kv.Value, ta); RTrack pt;
            if (p != null && p.map.TryGetValue(kv.Key, out pt)) q = Quaternion.Slerp(SampleQ(pt, tp), q, fade);
            kv.Key.localRotation = q;
        }
        if (hips)
        {
            float y = a.hy != null ? SampleF(a.ht, a.hy, ta) : hipsBind.y;
            if (p != null) { float py = p.hy != null ? SampleF(p.ht, p.hy, tp) : hipsBind.y; y = Mathf.Lerp(py, y, fade); }
            hips.localPosition = new Vector3(hipsBind.x, y, hipsBind.z);
        }
    }
}
