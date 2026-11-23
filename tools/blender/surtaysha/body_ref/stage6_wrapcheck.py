# Stage 6: check the wrapped MetaHuman-topology body (re-imported from the exported FBX).
#  vertex count / order vs the MH body, flipped faces, self-intersections, distance to the HF surface,
#  silhouette IoU front + side against the HF mesh, leg gap; sheet -> Builds\surtaysha_wrap_check.png
#  (front | side silhouettes: grey = both, orange = HF only, blue = wrap only; then the wrap shaded with wires)
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
from mathutils.bvhtree import BVHTree
low_priority(); reset()
OUT_WRAP = os.path.join(BODY, "SK_Surtaysha_MHwrap.fbx")
SHEET = r"F:\qirq-qiz-unity\Builds\surtaysha_wrap_check.png"
Z = np.load(os.path.join(WORK, "wrap.npz")); dy = float(Z["dy"]); mask = Z["mask"]; V0 = Z["V0"]; inv = Z["inv"]
objs = [o for o in import_fbx(OUT_WRAP)]
assert len(objs) == 1 and objs[0].type == 'MESH', "FBX must hold exactly one mesh"
wr = objs[0]; bake_world(wr); wr.name = "WRAP"
V = co(wr)
print("re-imported FBX: 1 mesh, %d verts (MH body %d), %d tris; max |re-imported - written| %.6f m -> order %s" % (
    len(V), len(V0), len(wr.data.polygons), np.abs(V - Z["V"]).max(), "identical" if np.abs(V - Z["V"]).max() < 1e-4 else "CHANGED"))
print("height %.2f cm, min z %.2f cm; head nodes moved (max) %.6f m" % ((V[:, 2].max() - V[:, 2].min()) * 100, V[:, 2].min() * 100, np.abs(V - V0)[mask == 0].max()))
bpy.ops.wm.append(directory=os.path.join(WORK, "hf_posed.blend", "Object"), filename="SK_Surtaysha_HF3D_apose")
hf = bpy.data.objects["SK_Surtaysha_HF3D_apose"]; hf.name = "HF"
set_co(hf, co(hf) + np.array([0, dy, 0]))

# ---- faces: flipped vs the MH original, degenerate, self-intersections
wr.data.calc_loop_triangles()
T = np.empty(len(wr.data.loop_triangles) * 3, dtype=np.int32); wr.data.loop_triangles.foreach_get("vertices", T); T = T.reshape(-1, 3)
fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]]); fn0 = np.cross(V0[T[:, 1]] - V0[T[:, 0]], V0[T[:, 2]] - V0[T[:, 0]])
cosn = (fn * fn0).sum(1) / np.maximum(np.linalg.norm(fn, axis=1) * np.linalg.norm(fn0, axis=1), 1e-20)
fl = cosn < 0
cen = V[T].mean(1)
print("faces reversed vs the MH original (includes MH armpit / crotch folds that opened out): %d of %d; turned > 60 deg: %d" % (fl.sum(), len(T), (cosn < 0.5).sum()))
def region(c):
    if c[2] < 0.12: return "foot"
    if abs(c[0]) > 0.45 and c[2] < 1.15: return "hand"
    if c[2] > 1.5: return "neck/head"
    return "body"
for r in ("foot", "hand", "neck/head", "body"):
    print("   flipped in %-9s %d" % (r, sum(1 for c in cen[fl] if region(c) == r)))
TI = inv[T]
def self_hits(P):
    bv = BVHTree.FromPolygons([Vector(p) for p in P], [tuple(int(i) for i in t) for t in T])
    n = 0
    for a, b in bv.overlap(bv):
        if a < b and not set(TI[a]) & set(TI[b]): n += 1
    return n
print("self-intersecting triangle pairs: wrap %d (MH original %d)" % (self_hits(V), self_hits(V0)))
ar = np.linalg.norm(fn, axis=1) / np.maximum(np.linalg.norm(fn0, axis=1), 1e-20)
print("triangle area ratio wrap/MH on the fitted part: median %.2f, 1%% %.2f, 99%% %.2f" % tuple(np.percentile(ar[mask[T].min(1) > 0.99], [50, 1, 99])))

# ---- distance to the HF surface
hf.data.calc_loop_triangles(); HV = co(hf)
HT = np.empty(len(hf.data.loop_triangles) * 3, dtype=np.int32); hf.data.loop_triangles.foreach_get("vertices", HT); HT = HT.reshape(-1, 3)
bvh = BVHTree.FromPolygons([Vector(v) for v in HV], [tuple(int(i) for i in t) for t in HT])
d = np.array([bvh.find_nearest(Vector(p))[3] for p in V])
for nm, mk in (("body (neck down, no hands/feet)", (mask > 0.99) & ~((np.abs(V[:, 0]) > 0.45) & (V[:, 2] < 1.15)) & (V[:, 2] > 0.12)),
               ("hands", (np.abs(V[:, 0]) > 0.45) & (V[:, 2] < 1.15)), ("feet", V[:, 2] < 0.12)):
    print("distance to HF, %-32s mean %.2f mm  p95 %.2f mm  max %.1f mm" % (nm, d[mk].mean() * 1000, np.percentile(d[mk], 95) * 1000, d[mk].max() * 1000))

# real flips: a face pointing against the smoothed normal field of its own neighbourhood
E = np.unique(np.sort(np.concatenate([TI[:, [0, 1]], TI[:, [1, 2]], TI[:, [2, 0]]]), axis=1), axis=0); NN = inv.max() + 1
deg = np.bincount(E.ravel(), minlength=NN).astype(float)
nn = np.zeros((NN, 3))
for i in range(3):
    for c in range(3): nn[:, c] += np.bincount(TI[:, i], fn[:, c], NN)
nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-20)
for _ in range(3):
    sm = np.zeros_like(nn)
    for c in range(3): sm[:, c] = np.bincount(E[:, 0], nn[E[:, 1], c], NN) + np.bincount(E[:, 1], nn[E[:, 0], c], NN)
    nn = 0.5 * nn + 0.5 * sm / deg[:, None]
nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-20)
fu = fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-20); f0u = fn0 / np.maximum(np.linalg.norm(fn0, axis=1, keepdims=True), 1e-20)
cosh = (fu * nn[TI].mean(1)).sum(1)
below = mask[T].min(1) > 0.5
print("FLIPPED FACES below the neck (pointing against their neighbourhood): wrap %d ; more than 78 deg off: %d" % ((cosh[below] < 0).sum(), (cosh[below] < 0.2).sum()))

# ---- leg gap
Pw = sample_surface(wr); Ph = sample_surface(hf)
print("leg gap (cm): z  HF  wrap")
for z in (0.80, 0.76, 0.72, 0.68, 0.64, 0.60, 0.50, 0.40, 0.20):
    g = [inner_gap(C, None, z) for C in (Ph, Pw)]
    print("   z=%.2f  %s" % (z, "  ".join("%5.1f" % (x * 100) if x and x > 0.0015 else "touch" for x in g)))

# ---- silhouettes + sheet
W_, H_ = 1200, 1700
sc = setup_render(W_, H_); sc.render.film_transparent = True
wr.data.materials.clear(); hf.data.materials.clear()
wr.data.materials.append(mat("w", (0.75, 0.78, 0.84, 1))); hf.data.materials.append(mat("h", (1.0, 0.5, 0.15, 1)))
for p in wr.data.polygons: p.use_smooth = True
SCALE = 1.96
def grab(path):
    im = bpy.data.images.load(path); a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)[::-1].copy()
    bpy.data.images.remove(im); return a
cams = {"front": ortho_cam("front", (0, -6, 0.94), (0, 0, 0.94), SCALE), "side": ortho_cam("side", (6, -0.06, 0.94), (0, -0.06, 0.94), SCALE)}
panels = []
neck_row = int((0.5 - (1.55 - 0.94) / SCALE) * H_)             # image row of z = 1.55 m
for nm, cam in cams.items():
    sil = {}
    for o, other in ((wr, hf), (hf, wr)):
        other.hide_render = True; o.hide_render = False
        path = os.path.join(WORK, "wchk_%s_%s.png" % (nm, o.name)); render(cam, path); sil[o.name] = grab(path)[..., 3] > 0.5
    a, b = sil["WRAP"], sil["HF"]
    iou = (a & b).sum() / (a | b).sum(); iou_b = (a & b)[neck_row:].sum() / (a | b)[neck_row:].sum()
    print("silhouette IoU %-5s: whole figure %.4f | neck down (z < 1.55 m) %.4f" % (nm, iou, iou_b))
    img = np.full((H_, W_, 3), 0.95, np.float32)
    img[a & b] = (0.55, 0.55, 0.55); img[b & ~a] = (1.0, 0.45, 0.05); img[a & ~b] = (0.1, 0.35, 1.0)
    img[neck_row:neck_row + 2, :, :] *= 0.7
    panels.append(img)
# shaded wrap with wireframe (edge flow), front and back three-quarter
hf.hide_render = True; wr.hide_render = False
wire = wr.modifiers.new("wire", 'WIREFRAME'); wire.thickness = 0.0006; wire.use_replace = False; wire.material_offset = 1
wr.data.materials.append(mat("line", (0.05, 0.05, 0.08, 1)))
for nm, loc, look in (("wfront", (0, -6, 0.94), (0, 0, 0.94)), ("wback", (3.5, 5, 1.6), (0, 0, 0.94))):
    cam = ortho_cam(nm, loc, look, SCALE); path = os.path.join(WORK, "wchk_%s.png" % nm); render(cam, path); g = grab(path)
    img = np.full((H_, W_, 3), 0.95, np.float32); al = g[..., 3:4]; img = img * (1 - al) + g[..., :3] * al
    panels.append(img)
sheet = np.concatenate([np.concatenate([p, np.ones((H_, 10, 3), np.float32)], axis=1) for p in panels], axis=1)[:, :-10]
sheet = np.concatenate([sheet, np.ones(sheet.shape[:2] + (1,), np.float32)], axis=2)
out = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
out.pixels.foreach_set(sheet[::-1].ravel()); out.filepath_raw = SHEET; out.file_format = 'PNG'; out.save()
for i, p in enumerate(panels):
    q = np.concatenate([p, np.ones(p.shape[:2] + (1,), np.float32)], axis=2)
    im = bpy.data.images.new("p%d" % i, W_, H_, alpha=False); im.pixels.foreach_set(q[::-1].ravel()); im.filepath_raw = os.path.join(WORK, "wpanel_%d.png" % i); im.file_format = 'PNG'; im.save()
print("sheet saved", SHEET)
