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
    // finger chains added by tools/blender/chars.py (two bones per hand); 0 = open, 1 = fist round a grip
    public float gripRight = .85f, gripLeft = .25f;
    class Fing { public Transform t; public Quaternion bind; public Vector3 axis; public float deg; public bool right; }
    readonly List<Fing> fingers = new List<Fing>();
    public bool HasFingers { get { return fingers.Count > 0; } }
    // procedural layers on top of the mocap: a sprung flinch of the upper body (hit reactions, weight of a swing) and a head that
    // looks at the foe (eye-lines, as in the author's video rules)
    public Transform lookAt; float lookW, lastYaw, lean; Vector3 flinchAxis = Vector3.right; float flinch, flinchVel;
    public void Impulse(Vector3 worldDir, float degPerSec)
    {
        worldDir.y = 0; if (worldDir.sqrMagnitude < 1e-6f) return;
        flinchAxis = Vector3.Cross(Vector3.up, worldDir.normalized); flinchVel += degPerSec;
    }
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
        SetupFingers();
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

    public void SampleBind() { Init(); }

    // Five 3-joint fingers per hand (tools/blender/hands.py). The curl axis of every joint is derived from the bind pose:
    // fingers bend from their own direction toward the palm; in the A-pose the palms face the body, so "palm" = toward the hips.
    // The thumb bends toward the middle knuckle instead. Stored in each bone's local space.
    void SetupFingers()
    {
        string[] names = { "Thumb", "Index", "Middle", "Ring", "Pinky", "Fingers" }; float[] fdeg = { 72, 95, 75 }, tdeg = { 25, 38, 30 };   // "Fingers1/2" = the 2-bone chain of tools/blender/chars.py
        foreach (var side in new[] { "Right", "Left" })
        {
            Transform hand = Bone(side + "Hand"); Transform mid1; if (!hand) continue; if (!B.TryGetValue(side + "Middle1", out mid1)) mid1 = Bone(side + "Fingers1"); if (!mid1) continue;
            Vector3 palm = (hips ? hips.position : transform.position) - hand.position;
            foreach (var n in names)
                for (int j = 1; j <= 3; j++)
                {
                    Transform b, next; if (!B.TryGetValue(side + n + j, out b)) continue;
                    Vector3 dir = B.TryGetValue(side + n + (j + 1), out next) ? next.position - b.position : b.position - b.parent.position;
                    Vector3 toward = n == "Thumb" ? mid1.position - b.position : palm;
                    toward -= dir.normalized * Vector3.Dot(toward, dir.normalized);
                    Vector3 axisW = Vector3.Cross(dir, toward); if (axisW.sqrMagnitude < 1e-10f) continue;
                    fingers.Add(new Fing { t = b, bind = b.localRotation, axis = (Quaternion.Inverse(b.rotation) * axisW).normalized, deg = n == "Thumb" ? tdeg[j - 1] : fdeg[j - 1], right = side == "Right" });
                }
        }
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
        // curl the fingers about their local X (the axis the Blender pipeline built them around)
        for (int i = 0; i < fingers.Count; i++) { var f = fingers[i]; f.t.localRotation = f.bind * Quaternion.AngleAxis(f.deg * (f.right ? gripRight : gripLeft), f.axis); }
        if (rawDt <= 0) return;
        // flinch: damped spring back to the mocap pose, bent at two spine joints so it reads as the body, not a hinge
        flinchVel += (-160f * flinch - 16f * flinchVel) * rawDt; flinch = Mathf.Clamp(flinch + flinchVel * rawDt, -35f, 35f);
        if (Mathf.Abs(flinch) > .05f) { Transform s1 = Bone("Spine01"), s2 = Bone("Spine02");
            if (s1) s1.rotation = Quaternion.AngleAxis(flinch * .5f, flinchAxis) * s1.rotation; if (s2) s2.rotation = Quaternion.AngleAxis(flinch * .5f, flinchAxis) * s2.rotation; }
        // lean into turns while running (bank like a rider): from the root's yaw speed
        { Transform r0 = transform.parent ? transform.parent : transform; float yaw = r0.eulerAngles.y; float yv = Mathf.DeltaAngle(lastYaw, yaw) / rawDt; lastYaw = yaw;
          float wl = cur == "run" ? Mathf.Clamp(-yv * .05f, -14f, 14f) : 0f; lean = Mathf.Lerp(lean, wl, Mathf.Min(1, rawDt * 8f));
          Transform sp = Bone("Spine"); if (sp && Mathf.Abs(lean) > .1f) { Vector3 f = r0.forward; sp.rotation = Quaternion.AngleAxis(lean, f) * sp.rotation; } }
        // head look-at, clamped, eased in and out; split between neck and head
        Transform head = Bone("Head"), neck = Bone("neck");
        Vector3 to = lookAt ? lookAt.position - (transform.parent ? transform.parent : transform).position : Vector3.zero; to.y = 0;
        Transform rt = transform.parent ? transform.parent : transform; Vector3 fw = rt.forward; fw.y = 0;
        bool want = lookAt && to.sqrMagnitude > .25f && to.sqrMagnitude < 400f && Vector3.Angle(fw, to) < 110f;
        lookW = Mathf.MoveTowards(lookW, want ? 1f : 0f, rawDt * 3f);
        if (lookW > .01f && head && to.sqrMagnitude > 1e-4f)
        {
            float yaw = Mathf.Clamp(Vector3.SignedAngle(fw, to, Vector3.up), -60f, 60f) * lookW;
            if (neck) neck.rotation = Quaternion.AngleAxis(yaw * .4f, Vector3.up) * neck.rotation;
            head.rotation = Quaternion.AngleAxis(yaw * .6f, Vector3.up) * head.rotation;
        }
    }
}
