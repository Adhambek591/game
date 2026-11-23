# Stage 5: wrap the MetaHuman body mesh (same vertex count / order) onto the re-posed HF3D body.
#   A. coarse: skeleton-driven warp with the MH skin weights (torso: cross-section box of MH mapped onto the
#      box of HF per height; limbs: bone head/tail onto the HF joints + radial scale; hands: similarity;
#      feet: foot box onto foot box)
#   B. fine: non-rigid ICP - nearest compatible surface point (normal test, ray fallback), displacement
#      field smoothed over the MH mesh (stiff -> soft), hands and toes moved as near-rigid blocks
#   The MH head stays exactly where it is; the neck blends. The HF target is shifted in y so its neck base
#   sits under the MH head (the feet-aligned file is ~5 cm forward there).
# Reads work/hf_posed.blend, work/fit.json, work/posed.json. Writes the FBX + work/wrap.npz.
import bpy, sys, os, json, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
from armfit import arm_analysis
from mathutils.bvhtree import BVHTree
low_priority(); reset()
OUT_WRAP = os.path.join(BODY, "SK_Surtaysha_MHwrap.fbx")
fit = json.load(open(os.path.join(WORK, "fit.json"))); posed = json.load(open(os.path.join(WORK, "posed.json")))
SIDES = (("l", 1), ("r", -1))
def sstep(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ load MH (keep vertex order), weights
objs = import_fbx(MH_FBX)
arm = [o for o in objs if o.type == 'ARMATURE'][0]; mh = [o for o in objs if o.type == 'MESH'][0]
bpy.context.view_layer.update()
J = {b.name: np.array(arm.matrix_world @ b.head_local) for b in arm.data.bones}
par = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
MAIN = ["pelvis", "spine_01", "spine_02", "spine_03", "spine_04", "spine_05", "neck_01", "neck_02", "head"] + \
       [b + s for s in "lr" for b in ("clavicle_", "upperarm_", "lowerarm_", "hand_", "thigh_", "calf_", "foot_")]
MI = {n: i for i, n in enumerate(MAIN)}
def main_of(n):
    while n is not None and n not in MI: n = par.get(n)
    return n or "pelvis"
gnames = [g.name for g in mh.vertex_groups]
gmain = [MI[main_of(n)] for n in gnames]
NV = len(mh.data.vertices)
Wv = np.zeros((NV, len(MAIN))); Wtoe = np.zeros(NV); Wfing = np.zeros(NV)
for v in mh.data.vertices:
    for g in v.groups:
        Wv[v.index, gmain[g.group]] += g.weight
        n = gnames[g.group]
        if "toe" in n or n.startswith("ball"): Wtoe[v.index] += g.weight
        if main_of(n).startswith("hand"): Wfing[v.index] += g.weight
Wv /= np.maximum(Wv.sum(1, keepdims=True), 1e-9)
bake_world(mh)
V0 = co(mh)                                               # metres, original order
mh.data.calc_loop_triangles()
T = np.empty(len(mh.data.loop_triangles) * 3, dtype=np.int32); mh.data.loop_triangles.foreach_get("vertices", T); T = T.reshape(-1, 3)
# weld the UV-seam duplicates: all the maths runs on unique positions ("nodes")
key = np.round(V0 / 1e-5).astype(np.int64)
_, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
inv = inv.ravel(); NN = len(first)
N0 = V0[first]; W = Wv[first]; wtoe = Wtoe[first]; wfing = Wfing[first]
TN = inv[T]
E = np.unique(np.sort(np.concatenate([TN[:, [0, 1]], TN[:, [1, 2]], TN[:, [2, 0]]]), axis=1), axis=0)
deg = np.bincount(E.ravel(), minlength=NN).astype(float)
print("MH verts %d -> %d nodes, %d tris, %d edges" % (NV, NN, len(TN), len(E)))
def nb_sum(X):
    out = np.zeros_like(X)
    for c in range(X.shape[1]):
        out[:, c] = np.bincount(E[:, 0], X[E[:, 1], c], NN) + np.bincount(E[:, 1], X[E[:, 0], c], NN)
    return out
def smooth_field(D, c, k):
    """confidence-weighted diffusion of a vector field over the mesh"""
    c = c[:, None].astype(float); A = D * c; B = c.copy()
    for _ in range(k):
        A = 0.5 * A + 0.5 * nb_sum(A) / deg[:, None]; B = 0.5 * B + 0.5 * nb_sum(B) / deg[:, None]
    return A / np.maximum(B, 1e-9)
def normals(P):
    fn = np.cross(P[TN[:, 1]] - P[TN[:, 0]], P[TN[:, 2]] - P[TN[:, 0]])
    n = np.zeros_like(P)
    for i in range(3):
        for c in range(3): n[:, c] += np.bincount(TN[:, i], fn[:, c], NN)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12), fn
vol = (N0[TN[:, 0]] * np.cross(N0[TN[:, 1]], N0[TN[:, 2]])).sum() / 6
assert vol > 0, "MH normals point inward"

# ------------------------------------------------------------------ target: re-posed HF, neck under the MH head
bpy.ops.wm.append(directory=os.path.join(WORK, "hf_posed.blend", "Object"), filename="SK_Surtaysha_HF3D_apose")
hf = bpy.data.objects["SK_Surtaysha_HF3D_apose"]
JP = {k: np.array(v) for k, v in posed["HFp"].items()}
dy = float(np.mean([J[b][1] - JP[b][1] for b in ("neck_01", "clavicle_l", "clavicle_r")]))
print("HF target shifted in y by %+.4f m (neck base under the MH head)" % dy)
SH = np.array([0, dy, 0])
set_co(hf, co(hf) + SH); JP = {k: v + SH for k, v in JP.items()}
HV = co(hf)
hf.data.calc_loop_triangles()
HT = np.empty(len(hf.data.loop_triangles) * 3, dtype=np.int32); hf.data.loop_triangles.foreach_get("vertices", HT); HT = HT.reshape(-1, 3)
bvh = BVHTree.FromPolygons([Vector(v) for v in HV], [tuple(int(i) for i in t) for t in HT])
H = sample_surface(hf); M = sample_surface(mh)
LHp, LMm = levels(H), levels(M)

# ------------------------------------------------------------------ head mask (0 = keep MH, 1 = fit)
m = np.clip(1 - W[:, MI["head"]] - 0.5 * W[:, MI["neck_02"]], 0, 1)
for _ in range(10): m = 0.5 * m + 0.5 * nb_sum(m[:, None])[:, 0] / deg
mask = np.clip((m - 0.15) / 0.7, 0, 1)
mask[W[:, MI["head"]] > 0.999] = np.minimum(mask[W[:, MI["head"]] > 0.999], 0.0)
print("mask: fixed head nodes %d, blend %d, fitted %d" % ((mask == 0).sum(), ((mask > 0) & (mask < 1)).sum(), (mask == 1).sum()))

# ------------------------------------------------------------------ A. coarse warp
zt = np.arange(0.80, 1.66, 0.01)
def table(C):
    t = np.array([torso_box(C, z) for z in zt])
    k = np.ones(5) / 5
    return np.stack([np.convolve(np.pad(t[:, i], 2, mode='edge'), k, mode='valid') for i in range(3)], axis=1)
tM, tH = table(M), table(H)
def T_torso(P):
    z = P[:, 2]
    xm, y0m, y1m = (np.interp(z, zt, tM[:, i]) for i in range(3)); xh, y0h, y1h = (np.interp(z, zt, tH[:, i]) for i in range(3))
    return np.stack([P[:, 0] / xm * xh, y0h + (P[:, 1] - y0m) / (y1m - y0m) * (y1h - y0h), z], axis=1)
def rot_between(a, b):
    a, b = unit(a), unit(b); c = np.cross(a, b); s = np.linalg.norm(c)
    if s < 1e-9: return np.eye(3)
    c = c / s; K = np.array([[0, -c[2], c[1]], [c[2], 0, -c[0]], [-c[1], c[0], 0]]); t = np.arctan2(s, a @ b)
    return np.eye(3) + np.sin(t) * K + (1 - np.cos(t)) * (K @ K)
def radial(C, h, t, sg, lo, hi, rmax):
    a = unit(t - h); L = np.linalg.norm(t - h); q = C - h; s = (q @ a) / L
    r = np.linalg.norm(q - np.outer(q @ a, a), axis=1)
    mk = (s > lo) & (s < hi) & (r < rmax) & (C[:, 0] * sg > 0)
    return float(np.median(r[mk]))
TF = {b: T_torso for b in ("pelvis", "spine_01", "spine_02", "spine_03", "spine_04", "spine_05", "neck_01", "neck_02", "clavicle_l", "clavicle_r")}
TF["head"] = lambda P: P
for s, sg in SIDES:
    AM = M[arm_points(M, LMm, sg)]; AH = H[arm_points(H, LHp, sg)]
    for b, tl, cm, ch, lo, hi, rmax in (("upperarm_", "lowerarm_", AM, AH, 0.50, 0.92, 0.2), ("lowerarm_", "hand_", AM, AH, 0.10, 0.90, 0.2),
                                        ("thigh_", "calf_", M, H, 0.45, 0.92, 0.22), ("calf_", "foot_", M, H, 0.10, 0.88, 0.16)):
        h, t, h2, t2 = J[b + s], J[tl + s], JP[b + s], JP[tl + s]
        sr = radial(ch, h2, t2, sg, lo, hi, rmax) / radial(cm, h, t, sg, lo, hi, rmax)
        sl = np.linalg.norm(t2 - h2) / np.linalg.norm(t - h)
        a = unit(t - h); R = rot_between(a, t2 - h2)
        if s == "l": print("  %-10s length x%.3f  radius x%.3f  axis off %.2f deg" % (b, sl, sr, between(a, t2 - h2)))
        def f(P, h=h, h2=h2, a=a, R=R, sl=sl, sr=sr):
            q = P - h; al = q @ a
            return h2 + (sr * (q - np.outer(al, a)) + sl * np.outer(al, a)) @ R.T
        TF[b + s] = f
    hs = fit["hand"]["HF"][s]["hand_len"] / fit["hand"]["MH"][s]["hand_len"]
    def fh(P, h=J["hand_" + s], h2=JP["hand_" + s], hs=hs): return h2 + (P - h) * hs
    TF["hand_" + s] = fh
    def fbox(C):
        mk = (C[:, 2] < 0.07) & (C[:, 0] * sg > 0.02) & (np.abs(C[:, 0]) < 0.40)
        return C[mk, 0].min(), C[mk, 0].max(), C[mk, 1].min(), C[mk, 1].max()
    bm_, bh_ = fbox(M), fbox(H)
    if s == "l": print("  hand x%.3f; foot box MH x[%.3f %.3f] y[%.3f %.3f] -> HF x[%.3f %.3f] y[%.3f %.3f]" % (hs, *bm_, *bh_))
    def ff(P, a=bm_, b=bh_):
        return np.stack([b[0] + (P[:, 0] - a[0]) / (a[1] - a[0]) * (b[1] - b[0]), b[2] + (P[:, 1] - a[2]) / (a[3] - a[2]) * (b[3] - b[2]), P[:, 2]], axis=1)
    TF["foot_" + s] = ff
PA = np.zeros_like(N0)
for i, n in enumerate(MAIN):
    if W[:, i].any(): PA += W[:, i:i + 1] * TF[n](N0)
P = N0 + mask[:, None] * (PA - N0)

# ------------------------------------------------------------------ B. non-rigid ICP
def correspond(P, n, maxd):
    Q = np.zeros_like(P); ok = np.zeros(NN, bool)
    for i in np.where(mask > 0)[0]:
        p = Vector(P[i]); nv = Vector(n[i])
        loc, nr, _, d = bvh.find_nearest(p, maxd)
        if loc is not None and nr.dot(nv) > 0.25:
            Q[i] = loc; ok[i] = True; continue
        best = None
        for sgn in (1.0, -1.0):
            hl, hn, _, hd = bvh.ray_cast(p + nv * (sgn * 1e-5), nv * sgn, maxd)
            if hl is not None and hn.dot(nv) > 0.25 and (best is None or hd < best[1]): best = (hl, hd)
        if best: Q[i] = best[0]; ok[i] = True
    return Q, ok
def umeyama(A, B, scale_lim):
    ca, cb = A.mean(0), B.mean(0); X, Y = A - ca, B - cb
    U, S, Vt = np.linalg.svd(Y.T @ X / len(A)); d = np.sign(np.linalg.det(U @ Vt)); Dm = np.diag([1, 1, d])
    R = U @ Dm @ Vt; sc = np.clip((S * np.diag(Dm)).sum() / (X ** 2).sum() * len(A), 1 - scale_lim, 1 + scale_lim)
    return lambda Pp: cb + sc * (Pp - ca) @ R.T
hand_w = {s: sstep((wfing * (N0[:, 0] * sg > 0) - 0.2) / 0.6) for s, sg in SIDES}
toe_w = {s: sstep((wtoe * (N0[:, 0] * sg > 0) - 0.2) / 0.6) for s, sg in SIDES}
ITER = 60
for it in range(ITER):
    f = it / (ITER - 1)
    k = int(round(40 * (1 - f) ** 2 + 2)); maxd = 0.10 * (1 - f) + 0.025 * f; step = 0.5 + 0.4 * f
    n, _ = normals(P)
    Q, ok = correspond(P, n, maxd)
    D = np.where(ok[:, None], Q - P, 0.0); c = ok.astype(float)
    blocks = []
    for s in "lr":
        for wt, lim in ((hand_w[s], 0.02), (toe_w[s], 0.0)):
            sel = (wt > 0.5) & ok
            if sel.sum() > 50:
                Dr = umeyama(P[sel], Q[sel], lim)(P) - P
                D = np.where(wt[:, None] > 0.5, Dr, D); c = np.where(wt > 0.5, 2.0, c)
                blocks.append((wt, Dr))
    Ds = smooth_field(D, c, k)
    for wt, Dr in blocks:                               # hands / toes follow their block transform
        Ds = Ds * (1 - wt[:, None]) + Dr * wt[:, None]
    P = P + step * mask[:, None] * Ds
    if it % 6 == 0 or it == ITER - 1:
        r = np.linalg.norm(Q - P, axis=1)[ok & (mask == 1)]
        print("  it %2d  smooth %2d  maxd %.3f  matched %.1f%%  residual mean %.2f mm  p95 %.2f mm" % (it, k, maxd, 100 * ok[mask > 0].mean(), r.mean() * 1000, np.percentile(r, 95) * 1000))
# fold repair: the MH armpits and crotch are deep skin folds (already self-intersecting in the template) that
# the HF surface does not have; projecting them leaves crumpled / flipped triangles. Relax only the nodes of
# flipped, sharply turned or self-intersecting triangles (+2 rings) until none are left.
n0, fn0 = normals(N0)
body_tri = mask[TN].min(1) > 0.5
blk = np.maximum.reduce([hand_w['l'], hand_w['r'], toe_w['l'], toe_w['r']])
block_tri = blk[TN].max(1) > 0.05          # fingers / toes keep the MH shape, they do not lie on the HF surface
def bad_nodes(P):
    nn, fn = normals(P)
    # orientation against the surface's own smoothed normal field (a fold shows as faces pointing against
    # their neighbourhood; the MH original normal is no reference because its armpit / crotch folds open out)
    for _ in range(3): nn = 0.5 * nn + 0.5 * nb_sum(nn) / deg[:, None]
    nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-20)
    fu = fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-20)
    cosn = (fu * nn[TN].mean(1)).sum(1)
    turned = (cosn < 0.2) & body_tri
    bv = BVHTree.FromPolygons([Vector(p) for p in P], [tuple(int(i) for i in t) for t in TN])
    hit = np.zeros(len(TN), bool); nh = 0
    for a, b in bv.overlap(bv):
        if a < b and body_tri[a] and body_tri[b] and not set(TN[a]) & set(TN[b]):
            hit[a] = hit[b] = True; nh += 1
    sel = np.zeros(NN, bool); sel[TN[turned | hit].ravel()] = True
    return sel, int((cosn < 0).sum()), int(turned.sum()), nh
for rep in range(25):
    sel, nflip, nturn, nh = bad_nodes(P)
    print("  fold repair %2d: flipped %d, facing > 78 deg off their neighbourhood %d, self-intersecting pairs below the neck %d, nodes %d" % (rep, nflip, nturn, nh, sel.sum()))
    if not sel.any(): break
    for _ in range(2): sel = sel | (nb_sum(sel[:, None].astype(float))[:, 0] > 0)
    sel &= (mask > 0) & (blk < 0.05)
    for _ in range(12):
        avg = nb_sum(P) / deg[:, None]
        P[sel] = 0.5 * P[sel] + 0.5 * avg[sel]
n, fn = normals(P)
P[mask == 0] = N0[mask == 0]

# ------------------------------------------------------------------ write back in the original vertex order, export
Vout = P[inv]
flipped = int(((fn * fn0).sum(1) < 0).sum())
print("faces reversed vs the MH original (opened folds included): %d of %d" % (flipped, len(TN)))
for mod in list(mh.modifiers): mh.modifiers.remove(mod)
mh.vertex_groups.clear()
for o in list(bpy.data.objects):
    if o not in (mh, hf): bpy.data.objects.remove(o, do_unlink=True)
set_co(mh, Vout)
mh.name = "SK_Surtaysha_MHwrap"; mh.data.name = "SK_Surtaysha_MHwrap"
np.savez(os.path.join(WORK, "wrap.npz"), V=Vout, V0=V0, dy=dy, mask=mask[inv], inv=inv)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "mh_wrap.blend"))
bpy.ops.object.select_all(action='DESELECT'); mh.select_set(True); bpy.context.view_layer.objects.active = mh
bpy.ops.export_scene.fbx(filepath=OUT_WRAP, use_selection=True, apply_unit_scale=True, global_scale=1.0, axis_forward='-Y', axis_up='Z',
                         bake_space_transform=False, object_types={'MESH'}, use_mesh_modifiers=False, mesh_smooth_type='FACE', add_leaf_bones=False)
print("exported", OUT_WRAP, os.path.getsize(OUT_WRAP), "bytes; verts", len(mh.data.vertices))
