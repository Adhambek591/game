# Stage 2: measure the MetaHuman A-pose from its skeleton, calibrate the slicing landmarks on the MetaHuman
# mesh against its true joints, then find the same joints inside the cleaned HF3D mesh.
# Writes work/fit.json (MH joints, HF joints, levels, hand frames, pose angles).
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
from armfit import arm_analysis
low_priority(); reset()

mh_ob, J, parents, mh_arm = load_mh()
bake_world(mh_ob)
M = sample_surface(mh_ob)
bpy.ops.wm.append(filepath=os.path.join(WORK, "hf_clean.blend", "Object", "HF"), directory=os.path.join(WORK, "hf_clean.blend", "Object"), filename="HF")
hf = bpy.data.objects["HF"]
H = sample_surface(hf)

LM, LH = levels(M), levels(H)
print("levels MH", {k: round(v, 3) for k, v in LM.items()})
print("levels HF", {k: round(v, 3) for k, v in LH.items()})
# The MH body has thighs that touch far below the real crotch, so its crotch level cannot be read from the
# mesh; armpit and chin agree within 4 mm between the two bodies, so heights are taken 1:1 below the armpit.
LM = dict(LM); LM['crotch_mesh'] = LM['crotch']; LM['crotch'] = LH['crotch']

# ---------------- MetaHuman A-pose from the skeleton
def pose_dirs(J, hand_end="middle_01_"):
    P = {}
    for s in "lr":
        P["clavicle_" + s] = J["upperarm_" + s] - J["clavicle_" + s]
        P["upperarm_" + s] = J["lowerarm_" + s] - J["upperarm_" + s]
        P["lowerarm_" + s] = J["hand_" + s] - J["lowerarm_" + s]
        P["hand_" + s] = J[hand_end + s] - J["hand_" + s]
        P["thigh_" + s] = J["calf_" + s] - J["thigh_" + s]
        P["calf_" + s] = J["foot_" + s] - J["calf_" + s]
        P["foot_" + s] = J["ball_" + s] - J["foot_" + s]
    return P
PM = pose_dirs(J)
print("\n== MetaHuman A-pose (skeleton), left side; right is the mirror")
for b in ("clavicle_l", "upperarm_l", "lowerarm_l", "hand_l", "thigh_l", "calf_l", "foot_l"):
    a, f = ang(PM[b])
    print("  %-11s len %.4f  dir %s  abduction %6.2f  forward %6.2f" % (b, np.linalg.norm(PM[b]), unit(PM[b]).round(4), a, f))
print("  elbow flexion %.2f  wrist %.2f  knee %.2f" % (between(PM["upperarm_l"], PM["lowerarm_l"]), between(PM["lowerarm_l"], PM["hand_l"]), between(PM["thigh_l"], PM["calf_l"])))
print("  head joint", J["head"].round(4), "neck_01", J["neck_01"].round(4), "pelvis", J["pelvis"].round(4))

# ---------------- calibrate the slicing landmarks on the MH mesh against the MH joints
res = {"MH": {}, "HF": {}}
cal = {}
print("\n== calibration: MH mesh landmarks vs MH joints (m)")
for s, sg in (("l", 1), ("r", -1)):
    sh, el, wr = J["upperarm_" + s], J["lowerarm_" + s], J["hand_" + s]
    ratio = float(np.linalg.norm(el - sh) / (np.linalg.norm(el - sh) + np.linalg.norm(wr - el)))
    a = arm_analysis(M, LM, sg, sh, ratio)
    along = float((wr - a['wrist_raw']) @ unit(wr - el) / np.linalg.norm(wr - el))
    a = arm_analysis(M, LM, sg, sh, ratio, along)
    res["MH"][s] = a; cal[s] = dict(wrist_along=along, elbow_ratio=ratio)
    print("  %s wrist raw %s -> calibrated %s  true %s  d=%.3f" % (s, a['wrist_raw'].round(3), a['wrist'].round(3), wr.round(3), np.linalg.norm(a['wrist'] - wr)))
    print("  %s elbow(ratio) %s d=%.3f | elbow(kink %.1f deg) %s d=%.3f | true %s" % (s, a['elbow_ratio'].round(3), np.linalg.norm(a['elbow_ratio'] - el), a['kink'], a['elbow_kink'].round(3), np.linalg.norm(a['elbow_kink'] - el), el.round(3)))
    print("  %s hand_dir(mesh) %s vs joints hand->middle_01 %s: %.1f deg; palm_n %s" % (s, a['hand_dir'].round(3), unit(PM['hand_' + s]).round(3), between(a['hand_dir'], PM['hand_' + s]), a['palm_n'].round(3)))
print("  calibration:", cal)

# ---------------- HF joints
JH = {}
# torso / head joints: same relative place inside the torso cross-section at the mapped height
for b in ("pelvis", "spine_01", "spine_02", "spine_03", "spine_04", "spine_05", "neck_01", "neck_02", "head"):
    fx, fy = frac_of(M, J[b]); z = zmap(J[b][2], LM, LH)
    p = from_frac(H, fx, fy, z); p[0] = 0.0
    JH[b] = p
for s, sg in (("l", 1), ("r", -1)):
    for b in ("clavicle_", "thigh_", "upperarm_"):
        fx, fy = frac_of(M, J[b + s]); z = zmap(J[b + s][2], LM, LH)
        JH[b + s] = from_frac(H, fx, fy, z)
    sh = JH["upperarm_" + s]
    a = arm_analysis(H, LH, sg, sh, cal[s]['elbow_ratio'], cal[s]['wrist_along'])
    res["HF"][s] = a
    # the kink of the centre line misses the true MH elbow by 9 cm, the length-ratio point by 1.6 cm -> ratio
    el = a['elbow_ratio']
    print("  HF %s: wrist %s  elbow(ratio) %s  elbow(kink %.1f deg) %s -> used %s" % (s, a['wrist'].round(3), a['elbow_ratio'].round(3), a['kink'], a['elbow_kink'].round(3), el.round(3)))
    JH["lowerarm_" + s], JH["hand_" + s] = el, a['wrist']
    JH["hand_end_" + s] = a['wrist'] + a['hand_dir'] * 0.10
    # legs: knee / ankle at the MH heights, placed in the leg cross-section like the MH joints are
    for b in ("calf_", "foot_"):
        fx, fy = leg_frac(M, LM, sg, J[b + s]); JH[b + s] = leg_from_frac(H, LH, sg, fx, fy, J[b + s][2])
    fdm, fcm = foot_dir(M, sg); fdh, fch = foot_dir(H, sg)
    JH["ball_" + s] = JH["foot_" + s] + np.array([fdh[0], fdh[1], 0]) * np.linalg.norm((J["ball_" + s] - J["foot_" + s])[:2]) + np.array([0, 0, J["ball_" + s][2] - J["foot_" + s][2]])
    res["HF"][s]['foot_dir'] = fdh; res["MH"][s]['foot_dir'] = fdm

# symmetrise (the HF mesh is near-symmetric; average left and mirrored right)
MIR = np.array([-1, 1, 1])
for b in list(JH):
    if b.endswith("_l"):
        r = b[:-1] + "r"
        print("  asym %-12s %.4f" % (b, np.linalg.norm(JH[b] - JH[r] * MIR)))
        m = 0.5 * (JH[b] + JH[r] * MIR)
        JH[b] = m; JH[r] = m * MIR

PH = pose_dirs(JH, "hand_end_")
print("\n== HF3D pose BEFORE (fitted joints), left | MetaHuman")
for b in ("clavicle_l", "upperarm_l", "lowerarm_l", "hand_l", "thigh_l", "calf_l", "foot_l"):
    ref = res["MH"]["l"]['hand_dir'] if b == "hand_l" else PM[b]      # hand: mesh-based on both
    a, f = ang(PH[b]); a2, f2 = ang(ref)
    print("  %-11s len %.4f (MH %.4f)  abduction %6.2f | %6.2f   forward %6.2f | %6.2f   off %.2f deg" % (
        b, np.linalg.norm(PH[b]), np.linalg.norm(PM[b]), a, a2, f, f2, between(PH[b], ref)))
print("  elbow flexion %.2f | %.2f   knee %.2f | %.2f" % (between(PH["upperarm_l"], PH["lowerarm_l"]), between(PM["upperarm_l"], PM["lowerarm_l"]),
      between(PH["thigh_l"], PH["calf_l"]), between(PM["thigh_l"], PM["calf_l"])))
toe = lambda d: np.degrees(np.arctan2(d[0], -d[1]))
print("  toe-out HF %.2f | MH(mesh) %.2f | MH(foot->ball) %.2f" % (toe(res["HF"]["l"]['foot_dir']), toe(res["MH"]["l"]['foot_dir']), toe(PM["foot_l"])))
print("  palm normal HF %s | MH %s ; hand side axis HF %s | MH %s" % (res["HF"]["l"]['palm_n'].round(3), res["MH"]["l"]['palm_n'].round(3), res["HF"]["l"]['hand_side'].round(3), res["MH"]["l"]['hand_side'].round(3)))
print("\n== HF joints | MH joints")
for b in ("pelvis", "spine_01", "spine_03", "spine_05", "neck_01", "head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l", "thigh_l", "calf_l", "foot_l", "ball_l"):
    print("  %-11s %s | %s" % (b, JH[b].round(4), J[b].round(4)))
for z in (LH['crotch'] - 0.02, LH['crotch'] - 0.05, LH['crotch'] - 0.10, 0.6, 0.45, 0.2):
    print("  leg gap at z=%.2f: HF %s  MH %s" % (z, inner_gap(H, LH, z), inner_gap(M, LM, z)))

def ser(d):
    return {k: [float(x) for x in v] for k, v in d.items()}
hand = {n: {s: {k: ([float(x) for x in v] if isinstance(v, np.ndarray) else float(v)) for k, v in res[n][s].items()} for s in "lr"} for n in ("MH", "HF")}
json.dump(dict(MH=ser(J), HF=ser(JH), LM=LM, LH=LH, hand=hand, cal=cal), open(os.path.join(WORK, "fit.json"), "w"), indent=1)
print("fit.json written")
