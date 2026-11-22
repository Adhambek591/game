// Mixamo -> our rig. Unity's humanoid retargeting does the hard part (Mixamo T-pose vs our A-pose, different bone axes):
//  1. every FBX under Assets/QQ/Mixamo imports as Humanoid; locomotion clips loop, root motion is baked in place (XZ + turn),
//     the vertical bounce kept;
//  2. QQMixamo.Bake builds a humanoid Avatar for our Meshy rig (posed into a T-pose for the reference), plays each chosen
//     Mixamo clip on our model through a PlayableGraph at 30 fps and records the local rotation of our 22 body bones + the
//     hips height;
//  3. writes Resources/qq_anims2.txt in the same text format as the browser mocap (its own REST / HIPSY block, our names),
//     plus SEG lines = wind-up start / impact (peak right-hand speed) / recovered, measured on the baked motion.
// Run: unity -executeMethod QQMixamo.Bake
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

public class QQMixamoImport : AssetPostprocessor
{
    static bool Mine(string p) { return p.Replace('\\', '/').Contains("/QQ/Mixamo/"); }
    void OnPreprocessModel()
    {
        if (!Mine(assetPath)) return;
        var mi = (ModelImporter)assetImporter; mi.animationType = ModelImporterAnimationType.Human; mi.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
        mi.importAnimation = true; mi.materialImportMode = ModelImporterMaterialImportMode.None;
    }
    void OnPreprocessAnimation()
    {
        if (!Mine(assetPath)) return;
        var mi = (ModelImporter)assetImporter; var n = Path.GetFileNameWithoutExtension(assetPath).ToLowerInvariant();
        bool loop = n.Contains("idle") || n.Contains("walk") || n.Contains("running") || n.Contains("run forward") || n.Contains("strafe") || n == "running";
        var clips = mi.defaultClipAnimations;
        foreach (var c in clips) { c.loopTime = loop; c.loopPose = loop; c.lockRootRotation = true; c.lockRootPositionXZ = true; c.lockRootHeightY = false; c.keepOriginalOrientation = true; c.keepOriginalPositionXZ = false; c.keepOriginalPositionY = true; }
        mi.clipAnimations = clips;
    }
}

public static class QQMixamo
{
    const string MX = "Assets/QQ/Mixamo/";
    static readonly string[] BODY = { "Hips", "Spine", "Spine01", "Spine02", "neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase" };
    // our bone -> Unity human bone (our chain is Hips > Spine02 > Spine01 > Spine > neck)
    static readonly Dictionary<string, string> HUMAN = new Dictionary<string, string> {
        { "Hips", "Hips" }, { "Spine02", "Spine" }, { "Spine01", "Chest" }, { "Spine", "UpperChest" }, { "neck", "Neck" }, { "Head", "Head" },
        { "LeftShoulder", "LeftShoulder" }, { "LeftArm", "LeftUpperArm" }, { "LeftForeArm", "LeftLowerArm" }, { "LeftHand", "LeftHand" },
        { "RightShoulder", "RightShoulder" }, { "RightArm", "RightUpperArm" }, { "RightForeArm", "RightLowerArm" }, { "RightHand", "RightHand" },
        { "LeftUpLeg", "LeftUpperLeg" }, { "LeftLeg", "LeftLowerLeg" }, { "LeftFoot", "LeftFoot" }, { "LeftToeBase", "LeftToes" },
        { "RightUpLeg", "RightUpperLeg" }, { "RightLeg", "RightLowerLeg" }, { "RightFoot", "RightFoot" }, { "RightToeBase", "RightToes" } };
    // game clip name <- Mixamo file
    static readonly (string name, string file)[] MAP = {
        ("idle", "Female_Locomotion_Pack/idle"), ("walk", "Female_Locomotion_Pack/walking"), ("run", "Female_Locomotion_Pack/running"),
        ("walk_m", "Pro_Sword_and_Shield_Pack/sword and shield walk"), ("run_m", "Pro_Sword_and_Shield_Pack/sword and shield run"), ("idle_m", "Pro_Melee_Axe_Pack/standing idle"),
        ("combat", "Pro_Sword_and_Shield_Pack/sword and shield idle"),
        ("slash", "Pro_Sword_and_Shield_Pack/sword and shield slash"), ("attack", "Pro_Sword_and_Shield_Pack/sword and shield attack"),
        ("triple", "Pro_Sword_and_Shield_Pack/sword and shield slash (2)"), ("heavy", "Pro_Sword_and_Shield_Pack/sword and shield slash (3)"),
        ("slash2", "Pro_Sword_and_Shield_Pack/sword and shield slash (4)"), ("slash3", "Pro_Sword_and_Shield_Pack/sword and shield slash (5)"),
        ("attack2", "Pro_Sword_and_Shield_Pack/sword and shield attack (2)"), ("attack3", "Pro_Sword_and_Shield_Pack/sword and shield attack (3)"),
        ("judg", "Pro_Sword_and_Shield_Pack/sword and shield attack (4)"),
        ("spin", "Pro_Melee_Axe_Pack/standing melee attack 360 high"), ("slam", "Pro_Melee_Axe_Pack/standing melee attack downward"),
        ("combo_b1", "Pro_Melee_Axe_Pack/standing melee combo attack ver. 1"), ("combo_b2", "Pro_Melee_Axe_Pack/standing melee combo attack ver. 2"),
        ("leap", "Pro_Melee_Axe_Pack/standing melee run jump attack"), ("taunt", "Pro_Melee_Axe_Pack/standing taunt battlecry"),
        ("hit", "Pro_Sword_and_Shield_Pack/sword and shield impact"), ("hit2", "Pro_Melee_Axe_Pack/standing react large gut"),
        ("dead", "Pro_Sword_and_Shield_Pack/sword and shield death"), ("dead2", "Pro_Longbow_Pack/standing death backward 01"),
        ("roll", "Pro_Longbow_Pack/standing dodge backward"), ("dodge_l", "Pro_Longbow_Pack/standing dodge left"), ("dodge_r", "Pro_Longbow_Pack/standing dodge right"), ("dodge_f", "Pro_Longbow_Pack/standing dodge forward"),
        ("idle2_c", "Pro_Sword_and_Shield_Pack/sword and shield idle (2)"), ("idle3_c", "Pro_Sword_and_Shield_Pack/sword and shield idle (3)"), ("idle4_c", "Pro_Sword_and_Shield_Pack/sword and shield idle (4)"),
        ("slash4", "Pro_Sword_and_Shield_Pack/sword and shield slash (4)"), ("attack4", "Pro_Sword_and_Shield_Pack/sword and shield attack (4)"), ("axe_h", "Pro_Melee_Axe_Pack/standing melee attack horizontal"), ("axe_b", "Pro_Melee_Axe_Pack/standing melee attack backhand"),
        ("gs1", "Great_Sword/x"), 
        ("cast", "Pro_Sword_and_Shield_Pack/sword and shield power up"), ("bow", "Pro_Longbow_Pack/standing aim recoil"), ("block", "Pro_Sword_and_Shield_Pack/sword and shield block") };

    static string F(float v) { return v.ToString("0.#####", CultureInfo.InvariantCulture); }
    static Quaternion Conv(Quaternion q) { return new Quaternion(q.x, -q.y, -q.z, q.w); }

    // pose the arms/legs of our A-pose rig into a T-pose (the reference Mecanim expects), on a temporary copy
    static void TPose(Dictionary<string, Transform> B, Transform root)
    {
        Vector3 right = (B["RightUpLeg"].position - B["LeftUpLeg"].position); right.y = 0; right.Normalize();
        System.Action<string, string, Vector3> aim = (b, c, dir) => { var t = B[b]; var d = B[c].position - t.position; t.rotation = Quaternion.FromToRotation(d, dir) * t.rotation; };
        aim("LeftArm", "LeftForeArm", -right); aim("LeftForeArm", "LeftHand", -right); aim("RightArm", "RightForeArm", right); aim("RightForeArm", "RightHand", right);
        aim("LeftUpLeg", "LeftLeg", Vector3.down); aim("LeftLeg", "LeftFoot", Vector3.down); aim("RightUpLeg", "RightLeg", Vector3.down); aim("RightLeg", "RightFoot", Vector3.down);
    }

    public static void Bake()
    {
        AssetDatabase.Refresh();
        var src = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/QQ/Art/chars/L_gulayim.glb");
        var go = (GameObject)Object.Instantiate(src); go.transform.position = Vector3.zero; go.transform.rotation = Quaternion.identity;
        var B = new Dictionary<string, Transform>(); foreach (var t in go.GetComponentsInChildren<Transform>(true)) if (!B.ContainsKey(t.name)) B[t.name] = t;
        var bindLocal = new Dictionary<string, Quaternion>(); foreach (var n in BODY) bindLocal[n] = B[n].localRotation; float hipsBindY = B["Hips"].localPosition.y, hipsBindW = B["Hips"].position.y - go.transform.position.y;   // Mecanim writes the hips in its own units: convert through the world height
        // avatar from a T-posed copy
        var tp = (GameObject)Object.Instantiate(src); var TB = new Dictionary<string, Transform>(); foreach (var t in tp.GetComponentsInChildren<Transform>(true)) if (!TB.ContainsKey(t.name)) TB[t.name] = t;
        TPose(TB, tp.transform);
        var hd = new HumanDescription(); var hb = new List<HumanBone>();
        foreach (var kv in HUMAN) { var h = new HumanBone { boneName = kv.Key, humanName = kv.Value }; h.limit.useDefaultValues = true; hb.Add(h); }
        hd.human = hb.ToArray(); var sk = new List<SkeletonBone>();
        foreach (var t in tp.GetComponentsInChildren<Transform>(true)) sk.Add(new SkeletonBone { name = t.name, position = t.localPosition, rotation = t.localRotation, scale = t.localScale });
        hd.skeleton = sk.ToArray(); hd.upperArmTwist = .5f; hd.lowerArmTwist = .5f; hd.upperLegTwist = .5f; hd.lowerLegTwist = .5f; hd.armStretch = .05f; hd.legStretch = .05f; hd.feetSpacing = 0; hd.hasTranslationDoF = false;
        var avatar = AvatarBuilder.BuildHumanAvatar(go, hd); Object.DestroyImmediate(tp);
        if (!avatar.isValid || !avatar.isHuman) { Debug.LogError("QQ MIXAMO avatar invalid"); return; }
        var anim = go.AddComponent<Animator>(); anim.avatar = avatar; anim.applyRootMotion = false;
        Vector3 r0 = B["RightUpLeg"].position - B["LeftUpLeg"].position; r0.y = 0; Vector3 fwd0 = Vector3.Cross(r0.normalized, Vector3.up);   // the character's forward at bind

        var sb = new StringBuilder(); sb.Append("LIB2\nHIPSY ").Append(F(hipsBindY)).Append('\n');
        foreach (var n in BODY) { var q = Conv(bindLocal[n]); sb.Append("REST ").Append(n).Append(' ').Append(F(q.x)).Append(' ').Append(F(q.y)).Append(' ').Append(F(q.z)).Append(' ').Append(F(q.w)).Append(" 0 0 0\n"); }
        int done = 0; float hipsK = 0;
        foreach (var e in MAP)
        {
            AnimationClip clip = null;
            foreach (var o in AssetDatabase.LoadAllAssetsAtPath(MX + e.file + ".fbx")) if (o is AnimationClip c && !c.name.StartsWith("__preview")) { clip = c; break; }
            if (!clip) { Debug.LogWarning("QQ MIXAMO missing " + e.file); continue; }
            var graph = PlayableGraph.Create("bake"); var outp = AnimationPlayableOutput.Create(graph, "o", anim); var cp = AnimationClipPlayable.Create(graph, clip); cp.SetApplyFootIK(true); outp.SetSourcePlayable(cp);
            float len = clip.length; int n = Mathf.Max(2, Mathf.RoundToInt(len * 30f) + 1);
            var keys = new Dictionary<string, List<Quaternion>>(); foreach (var b in BODY) keys[b] = new List<Quaternion>(); var hy = new List<float>(); var hand = new List<Vector3>();
            for (int i = 0; i < n; i++)
            {
                float t = Mathf.Min(len, i / 30f); cp.SetTime(t); graph.Evaluate(0);
                foreach (var b in BODY) keys[b].Add(B[b].localRotation);
                hy.Add(B["Hips"].localPosition.y); hand.Add(B["RightHand"].position - B["Hips"].position);
            }
            graph.Destroy();
            // face the foe: the sword-and-shield set stands side-on (shield forward). Measure the hips' facing (from the thighs) over the
            // move and turn the whole body back so the chest points where the character points (author: fight facing the enemy)
            {
                var yaws = new List<float>(); var rot0 = go.transform.rotation; var hipsT = B["Hips"]; var par = hipsT.parent;
                for (int i = 0; i < n; i++)
                {
                    float t = Mathf.Min(len, i / 30f); hipsT.localRotation = keys["Hips"][i];
                    foreach (var b2 in BODY) if (b2 != "Hips") B[b2].localRotation = keys[b2][i];
                    Vector3 r = B["RightUpLeg"].position - B["LeftUpLeg"].position; r.y = 0; Vector3 sh = B["RightArm"].position - B["LeftArm"].position; sh.y = 0;
                    Vector3 fw = Vector3.Cross((r.normalized + sh.normalized).normalized, Vector3.up);
                    yaws.Add(Vector3.SignedAngle(fwd0, fw, Vector3.up));
                }
                // action clips: the chest must face the foe at the IMPACT frame (peak right-hand speed); loops / reactions: the median
                bool act = e.name.StartsWith("slash") || e.name.StartsWith("attack") || e.name == "heavy" || e.name == "triple" || e.name == "judg" || e.name.StartsWith("axe") || e.name == "slam" || e.name == "bow";
                float mid;
                if (act)   // median over the active window (wind-up .. follow-through around the impact): the swing's own body turn stays, centred on the foe
                {
                    int pk2 = 1; float mx2 = 0; var sp2 = new float[n]; for (int i = 1; i < n; i++) { sp2[i] = (hand[i] - hand[i - 1]).magnitude; if (i > 2 && sp2[i] > mx2) { mx2 = sp2[i]; pk2 = i; } }
                    int a0 = pk2, a1 = pk2; while (a0 > 0 && sp2[a0] > mx2 * .15f) a0--; while (a1 < n - 1 && sp2[a1] > mx2 * .15f) a1++;
                    a0 = Mathf.Max(0, a0 - 6); a1 = Mathf.Min(n - 1, a1 + 6); var ys = yaws.GetRange(a0, a1 - a0 + 1); ys.Sort(); mid = ys[ys.Count / 2];
                }
                else { var ys = new List<float>(yaws); ys.Sort(); mid = ys[ys.Count / 2]; }
                if (Mathf.Abs(mid) > 4f && !e.name.StartsWith("dead"))
                {
                    var R = Quaternion.AngleAxis(-mid, Vector3.up); var pr = par.rotation;
                    for (int i = 0; i < n; i++) keys["Hips"][i] = Quaternion.Inverse(pr) * R * pr * keys["Hips"][i];
                    Debug.Log("QQ MIXAMO face-fix " + e.name + " " + mid.ToString("F0") + " deg");
                }
            }
            if (hipsK <= 0) hipsK = hipsBindY / Mathf.Max(1e-4f, hy[0]);   // first clip = standing idle: Mecanim's hips units -> ours
            for (int i = 0; i < hy.Count; i++) hy[i] *= hipsK;
            // make quaternion signs continuous
            foreach (var b in BODY) { var l = keys[b]; for (int i = 1; i < l.Count; i++) if (Quaternion.Dot(l[i], l[i - 1]) < 0) l[i] = new Quaternion(-l[i].x, -l[i].y, -l[i].z, -l[i].w); }
            sb.Append("CLIP ").Append(e.name).Append(' ').Append(F(len)).Append('\n');
            var times = new StringBuilder(); for (int i = 0; i < n; i++) times.Append(F(Mathf.Min(len, i / 30f))).Append(' ');
            foreach (var b in BODY)
            {
                sb.Append("R ").Append(b).Append(' ').Append(n).Append(' ').Append(times).Append('|');
                foreach (var q0 in keys[b]) { var q = Conv(q0); sb.Append(' ').Append(F(q.x)).Append(' ').Append(F(q.y)).Append(' ').Append(F(q.z)).Append(' ').Append(F(q.w)); }
                sb.Append('\n');
            }
            sb.Append("T Hips ").Append(n).Append(' ').Append(times).Append('|'); foreach (var y in hy) sb.Append(" 0 ").Append(F(y)).Append(" 0"); sb.Append('\n');
            // impact = peak right-hand speed (relative to the hips); wind-up start / recovered = where it falls under 20 % of the peak
            float mx = 0; int pk = 0; var sp = new float[n]; for (int i = 1; i < n; i++) { sp[i] = (hand[i] - hand[i - 1]).magnitude * 30f; if (i > 2 && sp[i] > mx) { mx = sp[i]; pk = i; } }
            int st = pk; while (st > 0 && sp[st] > mx * .2f) st--; int en = pk; while (en < n - 1 && sp[en] > mx * .2f) en++;
            bool action = e.name.StartsWith("slash") || e.name.StartsWith("attack") || e.name == "triple" || e.name == "heavy" || e.name == "judg" || e.name == "spin" || e.name == "slam" || e.name.StartsWith("combo") || e.name == "leap" || e.name == "cast" || e.name == "bow";
            if (!action) { st = 0; pk = Mathf.RoundToInt(n * .4f); en = n - 1; }
            sb.Append("SEG ").Append(e.name).Append(' ').Append(F(st / 30f)).Append(' ').Append(F(pk / 30f)).Append(' ').Append(F(Mathf.Min(len, en / 30f + .1f))).Append('\n');
            Debug.Log("QQ MIXAMO " + e.name + " <- " + e.file + " len " + len.ToString("F2") + " frames " + n + " hit " + (pk / 30f).ToString("F2") + " peak " + mx.ToString("F1"));
            done++;
        }
        File.WriteAllText("Assets/QQ/Resources/qq_anims2.txt", sb.ToString()); AssetDatabase.ImportAsset("Assets/QQ/Resources/qq_anims2.txt");
        Object.DestroyImmediate(go);
        Debug.Log("QQ MIXAMO DONE " + done + " clips");
    }
}
