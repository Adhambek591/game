# Stage 3: rig the cleaned HF3D body with the main MetaHuman bones placed on the fitted joints, automatic
# (bone heat) weights + cleanup, rotate the arms / legs / feet to the MetaHuman A-pose, apply, drop the rig,
# normalise (feet z=0, height 1.85 m, feet on the template foot positions) and export a mesh-only FBX.
# Reads work/hf_clean.blend + work/fit.json; writes work/hf_posed.blend, work/posed.json and the FBX.
import bpy, sys, os, json, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
from armfit import arm_analysis
low_priority()
bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "hf_clean.blend"))
hf = bpy.data.objects["HF"]
fit = json.load(open(os.path.join(WORK, "fit.json")))
J = {k: np.array(v) for k, v in fit["MH"].items()}
JH = {k: np.array(v) for k, v in fit["HF"].items()}
LH = fit["LH"]; LM = fit["LM"]; HAND = fit["hand"]; CAL = fit["cal"]
V = co(hf); NV = len(V)
H = sample_surface(hf)
HEIGHT = 1.85
SIDES = (("l", 1), ("r", -1))

# ------------------------------------------------------------------ rig
bones = [("pelvis", "pelvis", "spine_01", None)]
chain = ["pelvis", "spine_01", "spine_02", "spine_03", "spine_04", "spine_05", "neck_01", "neck_02", "head"]
for a, b in zip(chain[1:], chain[2:] + [None]):
    bones.append((a, a, b, chain[chain.index(a) - 1]))
for s, sg in SIDES:
    bones += [("clavicle_" + s, "clavicle_" + s, "upperarm_" + s, "spine_05"),
              ("upperarm_" + s, "upperarm_" + s, "lowerarm_" + s, "clavicle_" + s),
              ("lowerarm_" + s, "lowerarm_" + s, "hand_" + s, "upperarm_" + s),
              ("hand_" + s, "hand_" + s, None, "lowerarm_" + s),
              ("thigh_" + s, "thigh_" + s, "calf_" + s, "pelvis"),
              ("calf_" + s, "calf_" + s, "foot_" + s, "thigh_" + s),
              ("foot_" + s, "foot_" + s, "ball_" + s, "calf_" + s),
              ("ball_" + s, "ball_" + s, None, "foot_" + s)]
def tail_of(name, tail):
    if tail: return JH[tail]
    if name == "head": return JH["head"] + np.array([0, 0, 0.14])
    s = name[-1]
    if name.startswith("hand"):
        return JH[name] + np.array(HAND["HF"][s]["hand_dir"]) * HAND["HF"][s]["hand_len"] * 0.85
    if name.startswith("ball"):
        d = JH[name] - JH["foot_" + s]; d[2] = 0
        return JH[name] + unit(d) * 0.07
ad = bpy.data.armatures.new("rig"); rig = bpy.data.objects.new("rig", ad)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, head, tail, parent in bones:
    eb = ad.edit_bones.new(name)
    eb.head = Vector(JH[head]); eb.tail = Vector(tail_of(name, tail))
    if parent: eb.parent = ad.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
BN = [b[0] for b in bones]; BI = {n: i for i, n in enumerate(BN)}

# ------------------------------------------------------------------ automatic weights (bone heat)
bpy.ops.object.select_all(action='DESELECT')
hf.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
W = np.zeros((NV, len(BN)))
gi = {g.index: BI[g.name] for g in hf.vertex_groups if g.name in BI}
for v in hf.data.vertices:
    for g in v.groups:
        if g.group in gi: W[v.index, gi[g.group]] = g.weight
print("auto weights: unweighted verts %d / %d" % ((W.sum(1) < 1e-6).sum(), NV))
assert (W.sum(1) < 1e-6).sum() < NV * 0.02, "bone heat failed"

# ------------------------------------------------------------------ weight cleanup
# mesh adjacency
ne = len(hf.data.edges); E = np.empty(ne * 2, dtype=np.int32); hf.data.edges.foreach_get("vertices", E); E = E.reshape(-1, 2)
deg = np.bincount(E.ravel(), minlength=NV).astype(float)
def smooth(W, it, lam=0.5, mask=None):
    for _ in range(it):
        S = np.zeros_like(W)
        np.add.at(S, E[:, 0], W[E[:, 1]]); np.add.at(S, E[:, 1], W[E[:, 0]])
        Wn = (1 - lam) * W + lam * S / deg[:, None]
        W = Wn if mask is None else np.where(mask[:, None], Wn, W)
    return W
# fill any unweighted vertex from its neighbours
for _ in range(20):
    z = W.sum(1) < 1e-6
    if not z.any(): break
    S = np.zeros_like(W); np.add.at(S, E[:, 0], W[E[:, 1]]); np.add.at(S, E[:, 1], W[E[:, 0]])
    W[z] = S[z]
# arm / body split below the armpit: boundary x(z) between the body cluster and the arm cluster
is_arm = np.zeros(NV, bool); arm_low = {}
for s, sg in SIDES:
    zs, bx = [], []
    for z in np.arange(LH['armpit'], 0.25 * LH['top'], -0.004):
        seg = side_segments(H, z, sg)
        if len(seg) >= 2:
            zs.append(z); bx.append(0.5 * (H[seg[0], 0].max() * sg if sg > 0 else (-H[seg[0], 0]).max()) + 0.5 * ((H[seg[1], 0] * sg).min()))
    zs = np.array(zs[::-1]); bx = np.array(bx[::-1])
    arm_low[s] = zs[0]
    m = (V[:, 2] < LH['armpit']) & (V[:, 2] > zs[0] - 0.01) & (V[:, 0] * sg > np.interp(V[:, 2], zs, bx))
    is_arm |= m
    print("arm verts %s: %d (down to z=%.3f)" % (s, m.sum(), zs[0]))
ARM = [BI[b + s] for s in "lr" for b in ("upperarm_", "lowerarm_", "hand_")]
FORE = [BI[b + s] for s in "lr" for b in ("lowerarm_", "hand_")]
LEG = [BI[b + s] for s in "lr" for b in ("thigh_", "calf_", "foot_", "ball_")]
NOTARM = [i for i in range(len(BN)) if i not in ARM and not BN[i].startswith("clavicle")]
below = V[:, 2] < LH['armpit']
body = below & ~is_arm
# torso / legs below the armpit: arm weights fade out within 5 cm under the armpit, forearm + hand never
fade = np.clip(1 - (LH['armpit'] - V[:, 2]) / 0.05, 0, 1)
for i in ARM: W[body, i] *= fade[body]
for i in FORE: W[body, i] = 0
W[~below[:, None] & np.isin(np.arange(len(BN)), FORE)[None, :]] = 0     # no forearm/hand weight above the armpit
# free arm: only the arm chain (plus a little clavicle / spine right under the armpit)
keep = np.clip(1 - (LH['armpit'] - V[:, 2]) / 0.05, 0, 1)
for i in NOTARM: W[is_arm, i] *= keep[is_arm]
for i in LEG: W[is_arm, i] = 0
# sides: no bone of the other side on a limb
for s, sg in SIDES:
    o = "r" if s == "l" else "l"
    other = [BI[b + o] for b in ("upperarm_", "lowerarm_", "hand_", "calf_", "foot_", "ball_")]
    W[np.ix_(V[:, 0] * sg > 0.03, other)] = 0
    W[np.ix_((V[:, 0] * sg > 0.0) & (V[:, 2] < LH['crotch']), [BI["thigh_" + o]])] = 0
# inner top of the thighs: hand the thigh weight to the pelvis near the crotch so that bringing the feet
# together does not press the inner thighs into each other (keeps the thigh gap)
def sstep(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
tr = (1 - sstep((LH['crotch'] + 0.02 - V[:, 2]) / 0.14)) * (1 - sstep(np.abs(V[:, 0]) / 0.10)) * (V[:, 2] < JH["thigh_l"][2])
for s in "lr":
    mv = W[:, BI["thigh_" + s]] * tr
    W[:, BI["thigh_" + s]] -= mv; W[:, BI["pelvis"]] += mv
W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
W = smooth(W, 6)
# re-apply the hard rules after smoothing, then normalise
for i in FORE: W[body, i] = 0
for i in LEG: W[is_arm, i] = 0
for i in ARM: W[body & (fade <= 0), i] = 0
z0 = W.sum(1) < 1e-6
assert not z0.any(), "vertices lost all weights: %d" % z0.sum()
W /= W.sum(1, keepdims=True)

# ------------------------------------------------------------------ target pose
def rot_axis(a, t):
    a = unit(a); K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + np.sin(t) * K + (1 - np.cos(t)) * (K @ K)
def rot_between(a, b):
    a, b = unit(a), unit(b); c = np.cross(a, b); s = np.linalg.norm(c)
    if s < 1e-9: return np.eye(3)
    return rot_axis(c / s, np.arctan2(s, a @ b))
def frame(x, z_hint):
    x = unit(x); z = unit(z_hint - (z_hint @ x) * x); return np.stack([x, np.cross(z, x), z], axis=1)
def hand_frame(d, s, sg):
    n = np.array(d[s]["palm_n"])
    if n[0] * sg < 0: n = -n                       # back of the hand: pointing away from the body
    return frame(np.array(d[s]["hand_dir"]), n)
def twist_about(R, a):
    """twist angle of rotation R about unit axis a (swing-twist decomposition)."""
    w = 0.5 * np.sqrt(max(1 + np.trace(R), 1e-12))
    v = np.array([R[2, 1] - R[1, 2], R[0, 2] - R[2, 0], R[1, 0] - R[0, 1]]) / (4 * w)
    return 2 * np.arctan2(v @ a, w)

report = {}
def build_pose(ankle_x):
    T = {}                                           # bone -> function(points) -> points
    newJ = {k: v.copy() for k, v in JH.items()}
    for s, sg in SIDES:
        # ---- arm
        sh, el, wr = JH["upperarm_" + s], JH["lowerarm_" + s], JH["hand_" + s]
        du, df = unit(el - sh), unit(wr - el)
        dum, dfm = unit(J["lowerarm_" + s] - J["upperarm_" + s]), unit(J["hand_" + s] - J["lowerarm_" + s])
        Fh = frame(du, np.cross(du, df)); Fm = frame(dum, np.cross(dum, dfm))     # x = upper arm, z = elbow hinge axis
        Ru = Fm @ Fh.T
        Rf = rot_between(Ru @ df, dfm) @ Ru
        el2 = sh + Ru @ (el - sh); wr2 = el2 + Rf @ (wr - el)
        Rh = hand_frame(HAND["MH"], s, sg) @ hand_frame(HAND["HF"], s, sg).T
        tau = twist_about(Rh @ Rf.T, dfm)
        Lf = np.linalg.norm(wr - el)
        def T_up(P, sh=sh, Ru=Ru): return sh + (P - sh) @ Ru.T
        def T_fore(P, el=el, el2=el2, Rf=Rf, df=df, dfm=dfm, tau=tau, Lf=Lf):
            Q = (P - el) @ Rf.T                                  # forearm rotated, about the new elbow
            sp = np.clip(((P - el) @ df) / Lf, 0, 1)             # 0 at the elbow .. 1 at the wrist
            th = tau * sp                                        # pronation twist grows toward the wrist
            c, sn = np.cos(th)[:, None], np.sin(th)[:, None]
            Q = Q * c + np.cross(dfm, Q) * sn + np.outer(Q @ dfm, dfm) * (1 - c)
            return el2 + Q
        def T_hand(P, wr=wr, wr2=wr2, Rh=Rh): return wr2 + (P - wr) @ Rh.T
        T["upperarm_" + s], T["lowerarm_" + s], T["hand_" + s] = T_up, T_fore, T_hand
        newJ["lowerarm_" + s], newJ["hand_" + s] = el2, wr2
        newJ["hand_end_" + s] = wr2 + Rh @ (JH["hand_end_" + s] - wr)
        report["arm_" + s] = dict(upper_rot=float(np.degrees(np.arccos(np.clip((np.trace(Ru) - 1) / 2, -1, 1)))),
                                  elbow_add=float(between(Ru @ df, dfm)), forearm_twist=float(np.degrees(tau)),
                                  hand_rot=float(np.degrees(np.arccos(np.clip((np.trace(Rh @ Rf.T) - 1) / 2, -1, 1)))))
        # ---- leg: MH directions, lateral slope scaled so the ankle lands on ankle_x
        hip, kn, an = JH["thigh_" + s], JH["calf_" + s], JH["foot_" + s]
        Lt, Lc = np.linalg.norm(kn - hip), np.linalg.norm(an - kn)
        mt, mc = unit(J["calf_" + s] - J["thigh_" + s]), unit(J["foot_" + s] - J["calf_" + s])
        def dirs(k):
            return unit(mt * np.array([k, 1, 1])), unit(mc * np.array([k, 1, 1]))
        lo, hi = -6.0, 6.0
        for _ in range(60):
            k = 0.5 * (lo + hi); a, b = dirs(k)
            x = (hip[0] + Lt * a[0] + Lc * b[0]) * sg
            if x < ankle_x: lo = k
            else: hi = k
        dt, dc = dirs(k)
        Rt = rot_between(kn - hip, dt); Rc = rot_between(Rt @ (an - kn), dc) @ Rt
        kn2 = hip + Rt @ (kn - hip); an2 = kn2 + Rc @ (an - kn)
        toe = lambda d: np.arctan2(d[0] * sg, -d[1])
        dtoe = toe(np.array(HAND["MH"][s]["foot_dir"])) - toe(np.array(HAND["HF"][s]["foot_dir"]))
        Rft = rot_axis([0, 0, 1], dtoe * sg)        # toes out = +z rotation on the left
        def T_th(P, hip=hip, Rt=Rt): return hip + (P - hip) @ Rt.T
        def T_ca(P, kn=kn, kn2=kn2, Rc=Rc): return kn2 + (P - kn) @ Rc.T
        def T_ft(P, an=an, an2=an2, Rft=Rft): return an2 + (P - an) @ Rft.T
        T["thigh_" + s], T["calf_" + s], T["foot_" + s], T["ball_" + s] = T_th, T_ca, T_ft, T_ft
        newJ["calf_" + s], newJ["foot_" + s] = kn2, an2
        newJ["ball_" + s] = an2 + Rft @ (JH["ball_" + s] - an)
        report["leg_" + s] = dict(k=float(k), thigh_rot=float(between(kn - hip, dt)), calf_rot=float(between(an - kn, dc)), toe_rot=float(np.degrees(dtoe)))
    P = np.zeros_like(V)
    for i, n in enumerate(BN):
        w = W[:, i:i + 1]
        if not w.any(): continue
        P += w * (T[n](V) if n in T else V)
    return P, newJ

def normalise(P, newJ):
    """feet on z=0, height 1.85, ankles on the template ankle positions (x symmetric, y of the template)."""
    z0 = P[:, 2].min(); sc = HEIGHT / (P[:, 2].max() - z0)
    ay = 0.5 * (newJ["foot_l"][1] + newJ["foot_r"][1]); ax = 0.5 * (newJ["foot_l"][0] + newJ["foot_r"][0])
    off = np.array([-ax, -ay, -z0])
    f = lambda p: (p + off) * sc + np.array([0, J["foot_l"][1], 0])
    return f(P), {k: f(v) for k, v in newJ.items()}, sc, off

# feet on the template ankle x unless the thighs would close: widen in 5 mm steps until the gap is kept
gap0 = min(inner_gap(H, LH, z) or 0 for z in np.arange(LH['crotch'] - 0.03, 0.45, -0.01))
print("thigh gap before (min from 3 cm under the crotch to z=0.45): %.4f m" % gap0)
ankle_x = J["foot_l"][0]
while True:
    P, newJ = build_pose(ankle_x)
    P, newJ, sc, off = normalise(P, newJ)
    set_co(hf, P)
    Hp = sample_surface(hf)
    Lp = levels(Hp)
    zz = np.arange(Lp['crotch'] - 0.03, 0.45, -0.01)
    gaps = [inner_gap(Hp, Lp, z) or 0 for z in zz]
    print("ankle x %.4f: crotch level %.3f (was %.3f), min thigh gap %.4f at z=%.2f; gap at crotch-5cm %.4f, at z=0.60 %.4f" % (
        ankle_x, Lp['crotch'], LH['crotch'], min(gaps), zz[int(np.argmin(gaps))], inner_gap(Hp, Lp, Lp['crotch'] - 0.05) or 0, inner_gap(Hp, Lp, 0.60) or 0))
    # accept when a real gap is left along the thigh (>= 8 mm from 3 cm under the crotch down to the knee) and
    # the legs still part in the upper third of the thigh; otherwise widen the stance by 5 mm and try again
    if (min(gaps) >= 0.008 and Lp['crotch'] > LH['crotch'] - 0.08) or ankle_x > JH["foot_l"][0]:
        break
    ankle_x += 0.005
print("scale to 1.85 m: %.5f, offset %s" % (sc, off.round(4)))
print("pose deltas:", json.dumps(report))

# ------------------------------------------------------------------ apply, drop the rig
for m in list(hf.modifiers): hf.modifiers.remove(m)
hf.parent = None; hf.matrix_world = Matrix.Identity(4)
hf.vertex_groups.clear()
bpy.data.objects.remove(rig, do_unlink=True)
set_co(hf, P)
bm = bmesh.new(); bm.from_mesh(hf.data)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(hf.data); bm.free()
for p in hf.data.polygons: p.use_smooth = True
hf.name = "SK_Surtaysha_HF3D_apose"; hf.data.name = "SK_Surtaysha_HF3D_apose"
st = mesh_stats(hf, "posed")
c = co(hf)
print("height %.4f m, min z %.5f, x [%.4f, %.4f], y [%.4f, %.4f]" % (c[:, 2].max() - c[:, 2].min(), c[:, 2].min(), c[:, 0].min(), c[:, 0].max(), c[:, 1].min(), c[:, 1].max()))
json.dump(dict(HFp={k: [float(x) for x in v] for k, v in newJ.items()}, ankle_x=float(ankle_x), scale=float(sc), report=report, gap_before=float(gap0)),
          open(os.path.join(WORK, "posed.json"), "w"), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "hf_posed.blend"))

# ------------------------------------------------------------------ export (same settings as tools/metahuman/prep_target.py)
bpy.ops.object.select_all(action='DESELECT'); hf.select_set(True); bpy.context.view_layer.objects.active = hf
bpy.ops.export_scene.fbx(filepath=OUT_FBX, use_selection=True, apply_unit_scale=True, global_scale=1.0, axis_forward='-Y', axis_up='Z',
                         bake_space_transform=False, object_types={'MESH'}, use_mesh_modifiers=False, mesh_smooth_type='FACE', add_leaf_bones=False)
print("exported", OUT_FBX, os.path.getsize(OUT_FBX), "bytes")
