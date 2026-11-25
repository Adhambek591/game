# Stage 7 (Guloyim): (a) bust under the hair rebuilt from the approved turnaround - the side-view front profile
# of the reference is registered to the model and the under-hair part of the chest is moved onto it;
# (b) the wrap re-exported WELDED on the standard 51,619-vertex MetaHuman body, in the vertex order of
# SK_Surtaysha_MHBody.fbx (same template: triangle i / corner k of one file is triangle i / corner k of the
# other, verified by the UVs). Run with QQ_CHAR=guloyim after stage5.
# Writes body\SK_Guloyim_MHwrap51k.fbx and Builds\guloyim_wrap51k_check.png.
import bpy, sys, os, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
from reflib import *
from mathutils.bvhtree import BVHTree
assert CHAR == "guloyim"
low_priority()
OUT = os.path.join(BODY, "SK_Guloyim_MHwrap51k.fbx")
SHEET = os.path.join(os.path.dirname(CFG["SHEET_WRAP"]), "guloyim_wrap51k_check.png")
S_FBX = r"F:\qirq-qiz\tools\blender\surtaysha\body\SK_Surtaysha_MHBody.fbx"
bpy.ops.wm.open_mainfile(filepath=os.path.join(WORK, "mh_wrap.blend"))
wr = bpy.data.objects[CFG["WRAP_NAME"]]; hf = bpy.data.objects[CFG["APOSE_NAME"]]      # hf is already shifted by dy in this file
Z = np.load(os.path.join(WORK, "wrap.npz")); inv = Z["inv"]; mask_v = Z["mask"]
V = co(wr); NV = len(V); NN = inv.max() + 1
first = np.zeros(NN, int); first[inv[::-1]] = np.arange(NV)[::-1]
P = V[first].copy(); mask = mask_v[first]
wr.data.calc_loop_triangles()
T = np.empty(len(wr.data.loop_triangles) * 3, dtype=np.int32); wr.data.loop_triangles.foreach_get("vertices", T); T = T.reshape(-1, 3)
TL = np.empty(len(wr.data.loop_triangles) * 3, dtype=np.int32); wr.data.loop_triangles.foreach_get("loops", TL); TL = TL.reshape(-1, 3)
TN = inv[T]
E = np.unique(np.sort(np.concatenate([TN[:, [0, 1]], TN[:, [1, 2]], TN[:, [2, 0]]]), axis=1), axis=0)
deg = np.bincount(E.ravel(), minlength=NN).astype(float)
def nb_sum(X):
    out = np.zeros_like(X)
    for c in range(X.shape[1]): out[:, c] = np.bincount(E[:, 0], X[E[:, 1], c], NN) + np.bincount(E[:, 1], X[E[:, 0], c], NN)
    return out
def node_normals(P):
    fn = np.cross(P[TN[:, 1]] - P[TN[:, 0]], P[TN[:, 2]] - P[TN[:, 0]]); n = np.zeros_like(P)
    for i in range(3):
        for c in range(3): n[:, c] += np.bincount(TN[:, i], fn[:, c], NN)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12), fn
def sstep(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def cloud(P, spacing=0.0025, seed=3):
    a, b, c = P[TN[:, 0]], P[TN[:, 1]], P[TN[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1); rng = np.random.default_rng(seed)
    idx = np.repeat(np.arange(len(TN)), rng.poisson(area / spacing ** 2)); r1 = np.sqrt(rng.random(len(idx))); r2 = rng.random(len(idx))
    return np.vstack([P, (1 - r1)[:, None] * a[idx] + (r1 * (1 - r2))[:, None] * b[idx] + (r1 * r2)[:, None] * c[idx]])

# ------------------------------------------------------------------ under-hair nodes (their shape was interpolated)
HV = co(hf); hf.data.calc_loop_triangles()
HT = np.empty(len(hf.data.loop_triangles) * 3, dtype=np.int32); hf.data.loop_triangles.foreach_get("vertices", HT); HT = HT.reshape(-1, 3)
ht = hair_tris(hf)
bvh = BVHTree.FromPolygons([Vector(v) for v in HV], [tuple(int(i) for i in t) for t in HT])
U = np.array([ht[bvh.find_nearest(Vector(p))[2]] for p in P]) & (mask > 0)
u = U.astype(float)[:, None]
for _ in range(6): u = 0.5 * u + 0.5 * nb_sum(u) / deg[:, None]
u = np.clip(u[:, 0] * 1.5, 0, 1)

# ------------------------------------------------------------------ reference side view: registration on the belly
img = load_ref(); col, figmask = ref_profile(img)
Hb = sample_surface(hf, skip_hair=True)
err, SC, FL, X0 = register(col, Hb, zr=((0.95, 1.12),), height=HEIGHT)
print("reference registered: %.1f px/m, floor row %.0f, x0 %.1f, belly fit error %.1f mm (1 px = %.1f mm)" % (SC, FL, X0, err / SC * 1000, 1000 / SC))
def ref_y(z):
    r = FL - np.asarray(z) * SC; r0 = np.floor(r).astype(int); f = r - r0
    return ((1 - f) * col[r0] + f * col[r0 + 1] - X0) / SC
ZS = np.arange(1.10, 1.47, 0.005)
def smooth1(a, k=7):
    return np.convolve(np.pad(a, k // 2, mode='edge'), np.ones(k) / k, mode='valid')
yr = smooth1(ref_y(ZS))
y_before = model_profile(cloud(P), ZS)
yhf = model_profile(Hb, ZS)

# ------------------------------------------------------------------ under the strands: follow the hair surface
# The strands lie on the chest, so the hair surface minus the strand thickness is real information about the
# bust there (better than pure interpolation). Raise under-hair chest nodes to 8 mm under the hair surface
# (never lower them), smoothed so no strand is imprinted.
THICK = 0.008
n, _ = node_normals(P)
chest = U & (n[:, 1] < -0.2) & (np.abs(P[:, 0]) < 0.17) & (P[:, 2] > 1.14) & (P[:, 2] < 1.42)
D = np.zeros_like(P); cnt = 0
for i in np.where(chest)[0]:
    h = bvh.ray_cast(Vector(P[i]), Vector(n[i]), 0.05)
    if h[0] is not None and ht[h[2]] and h[3] > THICK:
        D[i] = n[i] * (h[3] - THICK); cnt += 1
for _ in range(6): D = 0.5 * D + 0.5 * nb_sum(D) / deg[:, None]
P = P + D * mask[:, None]
print("under the strands: %d chest nodes raised toward the hair surface, mean %.1f mm, max %.1f mm (after smoothing)" % (cnt, np.linalg.norm(D[chest], axis=1).mean() * 1000, np.linalg.norm(D, axis=1).max() * 1000))

# ------------------------------------------------------------------ move the under-hair bust onto the reference profile
Z0, Z1 = 1.16, 1.42                         # bust range; tapered at both ends
taper = np.clip((ZS - Z0) / 0.03, 0, 1) * np.clip((Z1 - ZS) / 0.04, 0, 1)
P0 = P.copy()
for it in range(4):
    C = cloud(P)
    yf = model_profile(C, ZS)                                   # front-most point per height
    ys = model_profile(C, ZS, xmax=0.012)                       # sternum line (between the breasts)
    d = smooth1(np.clip(yr - yf, -0.02, 0.01)) * taper          # wanted change of the front profile
    n, _ = node_normals(P)
    z = P[:, 2]
    dz = np.interp(z, ZS, d, left=0, right=0); yfz = np.interp(z, ZS, yf); ysz = np.interp(z, ZS, ys)
    g = np.clip((ysz - P[:, 1]) / np.maximum(ysz - yfz, 0.012), 0, 1)        # 0 on the sternum plane .. 1 at the apex
    front = (n[:, 1] < -0.2) & (np.abs(P[:, 0]) < 0.17) & (z > Z0 - 0.02) & (z < Z1 + 0.02)
    D = np.zeros_like(P); D[:, 1] = dz * g * u * front
    for _ in range(3): D = 0.5 * D + 0.5 * nb_sum(D) / deg[:, None]
    P = P + D * (mask[:, None])
    print("  pass %d: mean |front profile - ref| in the bust range %.1f mm (max %.1f), nodes moved %d, max move %.1f mm" % (
        it, np.abs((yr - yf)[taper > 0.5]).mean() * 1000, np.abs((yr - yf)[taper > 0.5]).max() * 1000, (np.abs(D[:, 1]) > 1e-4).sum(), np.abs(P - P0).max() * 1000))
y_after = model_profile(cloud(P), ZS)
print("bust front profile (mm, - = more forward):   z    ref   HF body faces   wrap before   wrap after")
for i in range(0, len(ZS), 4):
    print("     %.2f  %7.1f  %7.1f  %7.1f  %7.1f" % (ZS[i], yr[i] * 1000, yhf[i] * 1000, y_before[i] * 1000, y_after[i] * 1000))
print("is there a groove where the strands lay? front-most y (mm) per x band: wrap | HF surface incl. hair (hair lies on top of the skin)")
Cw = cloud(P); Chf = sample_surface(hf)
for zq in (1.34, 1.30, 1.26, 1.22):
    row = []
    for xa, xb in ((0.00, 0.02), (0.03, 0.05), (0.05, 0.07), (0.07, 0.09), (0.09, 0.11), (0.11, 0.13)):
        w = Cw[(np.abs(Cw[:, 2] - zq) < 0.004) & (np.abs(Cw[:, 0]) >= xa) & (np.abs(Cw[:, 0]) < xb) & (Cw[:, 1] < 0), 1].min()
        h = Chf[(np.abs(Chf[:, 2] - zq) < 0.004) & (np.abs(Chf[:, 0]) >= xa) & (np.abs(Chf[:, 0]) < xb) & (Chf[:, 1] < 0), 1].min()
        row.append("%6.1f|%6.1f" % (w * 1000, h * 1000))
    print("   z=%.2f  |x| 0-2: %s  3-5: %s  5-7: %s  7-9: %s  9-11: %s  11-13 cm: %s" % (zq, *row))
bust = lambda y: (np.interp(np.arange(1.30, 1.16, -0.005), ZS, y).min() - np.interp(1.12, ZS, y)) * 1000
print("bust projection in front of the under-bust line (mm): ref %.1f | HF body faces %.1f | wrap before %.1f | wrap after %.1f" % (-bust(yr), -bust(yhf), -bust(y_before), -bust(y_after)))
# no fold made by the move
nn, fn = node_normals(P)
for _ in range(3): nn = 0.5 * nn + 0.5 * nb_sum(nn) / deg[:, None]
nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-20)
fu = fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-20)
cosn = (fu * nn[TN].mean(1)).sum(1); body = (mask[TN].min(1) > 0.5) & (P[TN][:, :, 2].mean(1) > 0.95) & (np.abs(P[TN][:, :, 0].mean(1)) < 0.25)
print("faces pointing against their neighbourhood on the torso: %d" % (cosn[body] < 0).sum())

# ------------------------------------------------------------------ upper back: no hump
# The upper back lay under the hair (MH shape blended into HF) and bulged at the shoulder blades / trapezius.
# Give it the profile of a slim straight back: from the real back below the hair up to the neck base the
# back line is the straight chord plus a gentle (15 mm) thoracic curve, the same across the back (flat between
# the shoulder blades), fading out toward the shoulders. Only what stands out beyond that line is pressed in.
def back_profile(C, zs, xa, xb, tol=0.004):
    o = np.argsort(C[:, 2]); Zc = C[o, 2]; Yc = C[o, 1]; Xc = np.abs(C[o, 0]); out = np.full(len(zs), np.nan)
    for i, zq in enumerate(zs):
        a_, b_ = np.searchsorted(Zc, zq - tol), np.searchsorted(Zc, zq + tol)
        k = (Xc[a_:b_] >= xa) & (Xc[a_:b_] < xb)
        if k.any(): out[i] = Yc[a_:b_][k].max()
    return out
BZ = np.arange(1.08, 1.50, 0.005)
ZA, ZB = 1.15, 1.445                       # real back below the hair .. neck base
XFLAT, XEND = 0.125, 0.205                 # flat across the back up to XFLAT, blended out by XEND (shoulders)
C = cloud(P)
bk_before = back_profile(C, BZ, 0, XFLAT); bk_side_before = back_profile(C, BZ, 0, 0.30)
ya_, yb_n = np.interp(ZA, BZ, bk_before), np.interp(ZB, BZ, back_profile(C, BZ, 0, 0.05))
tt = np.clip((BZ - ZA) / (ZB - ZA), 0, 1)
target = ya_ + (yb_n - ya_) * tt + 0.015 * 4 * tt * (1 - tt)
ztap = np.clip((BZ - (ZA - 0.03)) / 0.03, 0, 1) * np.clip(((ZB + 0.02) - BZ) / 0.03, 0, 1)
Pb = P.copy()
for it in range(3):
    C = cloud(P); n, _ = node_normals(P)
    cur = back_profile(C, BZ, 0, XEND)
    excess = np.nan_to_num(np.maximum(cur - target, 0)) * ztap
    z = P[:, 2]; ex = np.interp(z, BZ, excess, left=0, right=0); tg = np.interp(z, BZ, target); cu = np.interp(z, BZ, np.nan_to_num(cur))
    yref = tg - 0.05                                        # only the outer 5 cm shell of the back is squeezed
    wx = 1 - sstep((np.abs(P[:, 0]) - XFLAT) / (XEND - XFLAT))
    sel = (n[:, 1] > 0.1) & (P[:, 1] > yref) & (ex > 0) & (mask > 0)
    newy = yref + (P[:, 1] - yref) * (tg - yref) / np.maximum(cu - yref, 1e-4)
    D = np.zeros_like(P); D[sel, 1] = (np.minimum(newy, P[:, 1]) - P[:, 1])[sel] * wx[sel]
    for _ in range(4): D = 0.5 * D + 0.5 * nb_sum(D) / deg[:, None]
    P = P + D * mask[:, None]
    print("  back pass %d: largest excess over the straight-back line %.1f mm, nodes moved %d" % (it, excess.max() * 1000, (np.abs(D[:, 1]) > 1e-4).sum()))
# relax the pressed area lightly so it runs smoothly into the shoulders
mv = np.linalg.norm(P - Pb, axis=1) > 5e-4
for _ in range(2): mv = mv | (nb_sum(mv[:, None].astype(float))[:, 0] > 0)
mv &= mask > 0
for _ in range(8):
    avg = nb_sum(P) / deg[:, None]; P[mv] = 0.6 * P[mv] + 0.4 * avg[mv]
C = cloud(P); bk_after = back_profile(C, BZ, 0, XFLAT); bk_side_after = back_profile(C, BZ, 0, 0.30)
print("upper back (mm, back-most y):   z   centre |x|<12.5 before  after   straight-back line | whole width before  after")
for i in range(0, len(BZ), 6):
    print("     %.2f   %6.1f  %6.1f  %6.1f | %6.1f  %6.1f" % (BZ[i], bk_before[i] * 1000, bk_after[i] * 1000, target[i] * 1000, bk_side_before[i] * 1000, bk_side_after[i] * 1000))
print("upper back: max move %.1f mm, nodes moved > 0.5 mm: %d; nodes outside the back region moved: %d" % (
    np.abs(P - Pb).max() * 1000, (np.linalg.norm(P - Pb, axis=1) > 5e-4).sum(), ((np.linalg.norm(P - Pb, axis=1) > 1e-6) & ((Pb[:, 2] < ZA - 0.08) | (Pb[:, 1] < 0))).sum()))

# ------------------------------------------------------------------ weld onto the 51,619-vertex body, Surtaysha's MH order
objs = import_fbx(S_FBX)
sm = [o for o in objs if o.type == 'MESH'][0]
for mod in list(sm.modifiers): sm.modifiers.remove(mod)
bake_world(sm); sm.vertex_groups.clear()
for o in objs:
    if o is not sm: bpy.data.objects.remove(o, do_unlink=True)
SV = co(sm); NS = len(SV)
sm.data.calc_loop_triangles()
TS = np.empty(len(sm.data.loop_triangles) * 3, dtype=np.int32); sm.data.loop_triangles.foreach_get("vertices", TS); TS = TS.reshape(-1, 3)
TSL = np.empty(len(sm.data.loop_triangles) * 3, dtype=np.int32); sm.data.loop_triangles.foreach_get("loops", TSL); TSL = TSL.reshape(-1, 3)
assert len(TS) == len(T), "triangle counts differ: %d vs %d" % (len(TS), len(T))
def uvs(ob):
    a = np.empty(len(ob.data.loops) * 2); ob.data.uv_layers[0].data.foreach_get("uv", a); return a.reshape(-1, 2)
# The two files share the UV layout but not the triangle order: pair the triangles by their UV triangle
# (corners rotated to a canonical start), then read the vertex map off the paired corners.
def canon(U, Vt):
    k = np.round(U * 1e4).astype(np.int64)
    keys, verts = [], []
    for i in range(len(k)):
        c = k[i]; j = min(range(3), key=lambda q: (c[q][0], c[q][1]))
        o = [j, (j + 1) % 3, (j + 2) % 3]
        keys.append(tuple(c[o].ravel())); verts.append(Vt[i][o])
    return keys, np.array(verts)
kS, vS = canon(uvs(sm)[TSL], TS)
kG, vG = canon(uvs(wr)[TL], TN)
dG = {}
for i, kk in enumerate(kG): dG.setdefault(kk, []).append(i)
s2g = -np.ones(NS, int); used = 0; conflicts = 0
for i, kk in enumerate(kS):
    js = dG.get(kk)
    if js is None or len(js) != 1: continue
    used += 1
    for a_, b_ in zip(vS[i], vG[js[0]]):
        if s2g[a_] >= 0 and s2g[a_] != b_: conflicts += 1
        s2g[a_] = b_
# triangles whose UV triangle occurs more than once (overlapping UV islands): take the candidate that agrees
# with the corners already mapped, and repeat while that settles more vertices
keyS0 = np.round(SV / 1e-5).astype(np.int64); _, invS0 = np.unique(keyS0, axis=0, return_inverse=True); invS0 = invS0.ravel()
nm = -np.ones(invS0.max() + 1, int)                    # welded Surtaysha-order position -> her node
def spread():
    k = s2g >= 0; nm[invS0[k]] = s2g[k]
    f = (s2g < 0) & (nm[invS0] >= 0); s2g[f] = nm[invS0[f]]
spread()
for rnd in range(200):
    prog = 0
    for i, kk in enumerate(kS):
        if (s2g[vS[i]] >= 0).all(): continue
        js = dG.get(kk)
        if js is None or not (s2g[vS[i]] >= 0).any(): continue
        ok = [j for j in js if all(s2g[a_] in (-1, b_) for a_, b_ in zip(vS[i], vG[j])) and any(s2g[a_] == b_ for a_, b_ in zip(vS[i], vG[j]))]
        if len(ok) == 1:
            for a_, b_ in zip(vS[i], vG[ok[0]]): s2g[a_] = b_
            prog += 1
    spread()
    if not prog: break
# what is left are separate little shells whose UVs repeat (left / right copies): pick the copy on the same
# side and height of the body (positions normalised by the body height), then let the final check judge
V0g_ = Z["V0"][first]; hS, hG = SV[:, 2].max(), V0g_[:, 2].max(); left = 0
for i, kk in enumerate(kS):
    if (s2g[vS[i]] >= 0).all(): continue
    js = dG.get(kk)
    if js is None: continue
    cs = SV[vS[i]].mean(0) / hS
    j = min(js, key=lambda j: np.linalg.norm(V0g_[vG[j]].mean(0) / hG - cs))
    for a_, b_ in zip(vS[i], vG[j]):
        if s2g[a_] < 0: s2g[a_] = b_
    left += 1
spread()
print("51k map: %d triangles of separate repeated-UV shells placed by side / height" % left)
print("51k map: %d of %d triangles paired by UV directly, vertex conflicts %d, unmapped vertices after resolving the repeated UV triangles %d" % (used, len(kS), conflicts, (s2g < 0).sum()))
assert conflicts == 0 and (s2g >= 0).all()
# full check: every triangle of the Surtaysha-order mesh, taken through the map, is a triangle of her mesh
tri_g = {tuple(sorted(t)) for t in TN}
miss = sum(1 for t in s2g[TS] if tuple(sorted(t)) not in tri_g)
print("triangles of the 51k mesh that exist in her MH mesh through the map: %d of %d" % (len(TS) - miss, len(TS)))
if miss:
    edge_g = {tuple(sorted(e)) for t in TN for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0]))}
    for t, ts in zip(s2g[TS], TS):
        if tuple(sorted(t)) not in tri_g:
            print("   missing tri: her nodes %s, distinct %d, edges present in her mesh %d/3, S pos %s, in key table %s" % (
                t, len(set(t)), sum(tuple(sorted(e)) in edge_g for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0]))), SV[ts].mean(0).round(3), "?"))
assert miss <= 8
keyS = np.round(SV / 1e-5).astype(np.int64); _, invS = np.unique(keyS, axis=0, return_inverse=True); invS = invS.ravel()
pairs = np.unique(np.stack([invS, s2g], axis=1), axis=0)
cover = len(np.unique(s2g))
print("welded positions: Surtaysha MH %d, Guloyim MH %d, position pairs %d; her nodes covered by the map %d of %d" % (invS.max() + 1, NN, len(pairs), cover, NN))
# (the 4 triangles above are 2 face quads cut along the other diagonal in one file - same vertices; one extra
#  pair = two template vertices that share a position)
assert cover == NN and abs(len(pairs) - NN) <= 4
V0g = Z["V0"][first]
print("template sanity (Guloyim MH vs Surtaysha MH through the map): median %.1f cm apart, head top z %.3f vs %.3f" % (
    np.median(np.linalg.norm(V0g[s2g] - SV, axis=1)) * 100, V0g[s2g][np.argmax(SV[:, 2]), 2], SV[:, 2].max()))
OUTV = P[s2g]
set_co(sm, OUTV)
sm.name = "SK_Guloyim_MHwrap51k"; sm.data.name = "SK_Guloyim_MHwrap51k"
bpy.ops.object.select_all(action='DESELECT'); sm.select_set(True); bpy.context.view_layer.objects.active = sm
bpy.ops.export_scene.fbx(filepath=OUT, use_selection=True, apply_unit_scale=True, global_scale=1.0, axis_forward='-Y', axis_up='Z',
                         bake_space_transform=False, object_types={'MESH'}, use_mesh_modifiers=False, mesh_smooth_type='FACE', add_leaf_bones=False)
# re-import check
chk = [o for o in import_fbx(OUT) if o.type == 'MESH']
assert len(chk) == 1
bake_world(chk[0]); CV = co(chk[0])
print("exported %s: %d verts (Surtaysha MH body %d), max |re-imported - written| %.6f m, height %.2f cm, min z %.2f cm" % (
    OUT, len(CV), NS, np.abs(CV - OUTV).max(), (CV[:, 2].max() - CV[:, 2].min()) * 100, CV[:, 2].min() * 100))
head = mask[s2g] == 0
print("head vertices unchanged vs her MH head: max move %.6f m (%d verts)" % (np.abs(OUTV[head] - V0g[s2g][head]).max(), head.sum()))
bpy.data.objects.remove(chk[0], do_unlink=True)
np.savez(os.path.join(WORK, "wrap51k.npz"), V=OUTV, s2g=s2g)

# ------------------------------------------------------------------ check sheet
# panel 1: the reference side view (bust crop, x4) with the profiles; panel 2: side render of the 51k mesh
# with the same reference profile; panel 3: profile plot in mm
def poly(im, pts, colr, r=1):
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for t in np.linspace(0, 1, n):
            x = int(round(x0 + (x1 - x0) * t)); y = int(round(y0 + (y1 - y0) * t))
            if 0 <= y < im.shape[0] and 0 <= x < im.shape[1]: im[max(y - r, 0):y + r + 1, max(x - r, 0):x + r + 1] = colr
RED, BLU, GRN, YEL = (0.95, 0.1, 0.1), (0.1, 0.35, 1.0), (0.1, 0.8, 0.2), (1.0, 0.85, 0.0)
PH = 1320
zt, zb = 1.50, 1.02
r0, r1 = int(FL - zt * SC), int(FL - zb * SC); c0, c1 = int(X0 - 0.19 * SC), int(X0 + 0.14 * SC)
crop = img[r0:r1, c0:c1]; k = PH // crop.shape[0]
p1 = np.repeat(np.repeat(crop, k, 0), k, 1)
def to_p1(y, z): return [((X0 + yy * SC - c0) * k, (FL - zz * SC - r0) * k) for yy, zz in zip(y, z)]
poly(p1, to_p1(y_before, ZS), BLU, 2); poly(p1, to_p1(y_after, ZS), RED, 2); poly(p1, to_p1(ref_y(ZS), ZS), GRN, 1)
p1 = np.pad(p1, ((0, PH - p1.shape[0]), (0, 0), (0, 0)), constant_values=0.95)
# panel 2
W2 = 1150
sc_ = setup_render(W2, PH); sc_.render.film_transparent = True
for o in bpy.data.objects: o.hide_render = o is not sm
sm.data.materials.clear(); sm.data.materials.append(mat("w", (0.78, 0.78, 0.8, 1)))
for p in sm.data.polygons: p.use_smooth = True
OS = (zt - zb)                                                   # ortho scale = visible height
cam = ortho_cam("side", (6, 0.0, 0.5 * (zt + zb)), (0, 0.0, 0.5 * (zt + zb)), OS)
path = os.path.join(WORK, "s7_side.png"); render(cam, path)
im = bpy.data.images.load(path); g = np.array(im.pixels[:], dtype=np.float32).reshape(PH, W2, 4)[::-1].copy(); bpy.data.images.remove(im)
p2 = np.full((PH, W2, 3), 0.95, np.float32); p2 = p2 * (1 - g[..., 3:4]) + g[..., :3] * g[..., 3:4]
def to_p2(y, z):
    out = []
    for yy, zz in zip(y, z):
        q = cam.matrix_world.inverted() @ Vector((0, yy, zz)); out.append(((0.5 + q.x / (OS * W2 / PH)) * W2, (0.5 - q.y / OS) * PH))
    return out
poly(p2, to_p2(ref_y(ZS), ZS), GRN, 2); poly(p2, to_p2(y_before, ZS), BLU, 1)
okb = ~np.isnan(bk_side_before) & ~np.isnan(bk_side_after)
poly(p2, to_p2(bk_side_before[okb], BZ[okb]), BLU, 2); poly(p2, to_p2(bk_side_after[okb], BZ[okb]), RED, 1)       # back line before / after
# panel 4: back view
W4 = 1000
sc_ = setup_render(W4, PH); sc_.render.film_transparent = True
camb = ortho_cam("back", (0, 6, 0.5 * (zt + zb)), (0, 0, 0.5 * (zt + zb)), OS * W4 / PH)
pathb = os.path.join(WORK, "s7_back.png"); render(camb, pathb)
im = bpy.data.images.load(pathb); gb = np.array(im.pixels[:], dtype=np.float32).reshape(PH, W4, 4)[::-1].copy(); bpy.data.images.remove(im)
p4 = np.full((PH, W4, 3), 0.95, np.float32); p4 = p4 * (1 - gb[..., 3:4]) + gb[..., :3] * gb[..., 3:4]
# panel 3: plot, 1 cm grid, x = depth (front to the left), y = height
W3 = 700; p3 = np.full((PH, W3, 3), 1.0, np.float32)
ya, yb_ = -0.16, -0.02
def to_p3(y, z): return [((yy - ya) / (yb_ - ya) * W3, (zt - zz) / (zt - zb) * PH) for yy, zz in zip(y, z)]
for yy in np.arange(ya, yb_ + 1e-6, 0.01):
    x = int((yy - ya) / (yb_ - ya) * W3); p3[:, x:x + 1] = 0.85
for zz in np.arange(zb, zt + 1e-6, 0.01):
    y = int((zt - zz) / (zt - zb) * PH); p3[y:y + 1, :] = 0.85 if round(zz * 100) % 10 else 0.6
poly(p3, to_p3(yhf, ZS), YEL, 2); poly(p3, to_p3(y_before, ZS), BLU, 2); poly(p3, to_p3(ref_y(ZS), ZS), GRN, 2); poly(p3, to_p3(y_after, ZS), RED, 2)
gap = np.ones((PH, 12, 3), np.float32)
sheet = np.concatenate([p1, gap, p2, gap, p4, gap, p3], axis=1)
sheet = np.concatenate([sheet, np.ones(sheet.shape[:2] + (1,), np.float32)], axis=2)
out = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
out.pixels.foreach_set(sheet[::-1].ravel()); out.filepath_raw = SHEET; out.file_format = 'PNG'; out.save()
print("sheet saved", SHEET, sheet.shape[1], "x", sheet.shape[0])
