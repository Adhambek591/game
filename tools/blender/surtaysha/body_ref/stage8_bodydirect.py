# Stage 8: the wrap itself as the in-game body. Takes the MetaHuman body FBX with its skeleton and skin
# weights, puts the wrap positions on the vertices (same vertex order, weights carry over 1:1), moves every
# joint with the surface around it (local affine fit of the skin near the joint, old shape -> new shape; bone
# names, hierarchy and bone axes unchanged), tests the deformation in a pose and exports skeletal mesh +
# armature. Surtaysha: head region scaled so head / height = 1/7 (factor printed).
# QQ_CHAR=surtaysha (after stage5) or guloyim (after stage7). Writes body\SK_<Name>_BodyDirect.fbx and
# Builds\<name>_bodydirect_check.png.
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
low_priority(); reset()
NAME = "Guloyim" if CHAR == "guloyim" else "Surtaysha"
OUT = os.path.join(BODY, "SK_%s_BodyDirect.fbx" % NAME)
SHEET = os.path.join(os.path.dirname(CFG["SHEET_WRAP"]), "%s_bodydirect_check.png" % NAME.lower())

# ------------------------------------------------------------------ MH body with skeleton + weights
objs = import_fbx(MH_FBX)
arm = [o for o in objs if o.type == 'ARMATURE'][0]; me = [o for o in objs if o.type == 'MESH'][0]
empties = [o for o in objs if o.type == 'EMPTY']
bpy.context.view_layer.update()
MW = me.matrix_world.copy(); AW = arm.matrix_world.copy()
NV = len(me.data.vertices)
loc = np.empty(NV * 3); me.data.vertices.foreach_get("co", loc); loc = loc.reshape(-1, 3)
Mw = np.array(MW); V0 = loc @ Mw[:3, :3].T + Mw[:3, 3]                       # world, metres
print("%s: %d verts, %d bones, %d vertex groups; mesh under %s" % (NAME, NV, len(arm.data.bones), len(me.vertex_groups), [e.name for e in empties]))

# ------------------------------------------------------------------ wrap positions in this vertex order
Z = np.load(os.path.join(WORK, "wrap.npz")); mask = Z["mask"]; dy = float(Z["dy"])
if CHAR == "guloyim":
    K = np.load(os.path.join(WORK, "wrap51k.npz")); inv = Z["inv"]
    Pn = np.zeros((inv.max() + 1, 3)); Pn[K["s2g"]] = K["V"]                 # node positions of the final 51k wrap
    V1 = Pn[inv]
else:
    V1 = Z["V"].copy()
assert len(V1) == NV and np.abs(Z["V0"] - V0).max() < 1e-4, "vertex order of the MH FBX changed"
HEAD_SCALE = 1.0
bones0 = {b.name: np.array(AW @ b.head_local) for b in arm.data.bones}
if CHAR != "guloyim":
    # head / height = 1/7: scale the unchanged MH head about the head joint (blend through the neck)
    piv = bones0["head"]; chin = float(Z["chin"]); top = V1[:, 2].max()
    hh = top - chin
    s = (piv[2] - (piv[2] - chin) * 0 + 0) and 1.0
    # height(s) = piv + (top - piv) s ; head(s) = hh s ; head / height = 1/7
    s = piv[2] / (7 * hh - (top - piv[2]))
    HEAD_SCALE = float(s)
    w = (1 - mask)[:, None]
    V1 = piv + (V1 - piv) * (1 + (s - 1) * w)
    print("head scale %.4f about the head joint: head %.1f -> %.1f cm, height %.1f -> %.1f cm, head/height 1/%.2f -> 1/%.2f" % (
        s, hh * 100, hh * s * 100, top * 100, V1[:, 2].max() * 100, top / hh, V1[:, 2].max() / (hh * s)))

# ------------------------------------------------------------------ joints follow the skin around them
gn = [g.name for g in me.vertex_groups]; gi = {n: i for i, n in enumerate(gn)}
gv = [[] for _ in gn]; gw = [[] for _ in gn]
for v in me.data.vertices:
    for g in v.groups:
        if g.weight > 0.02: gv[g.group].append(v.index); gw[g.group].append(g.weight)
gv = [np.array(a, dtype=int) for a in gv]
par = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
kids = {}
for b, p in par.items(): kids.setdefault(p, []).append(b)
def cand(b):
    """vertices skinned to the bone, its parent or its children: the skin around the joint"""
    out = []
    for n in [b, par.get(b)] + kids.get(b, []):
        if n in gi and len(gv[gi[n]]): out.append(gv[gi[n]])
    return np.unique(np.concatenate(out)) if out else np.arange(0)
bones1 = {}
stats = []
for b, h in bones0.items():
    c = cand(b); q = b
    while len(c) < 60 and par.get(q):                         # helper bones without skin: climb to the parent
        q = par[q]; c = np.unique(np.concatenate([c, cand(q)]))
    if len(c) < 60: c = np.arange(NV)
    d = np.linalg.norm(V0[c] - h, axis=1)
    k = np.argsort(d)[:min(300, len(c))]; c = c[k]; d = d[k]
    sig = max(d[min(80, len(d) - 1)], 0.02)
    wt = np.exp(-0.5 * (d / sig) ** 2) + 1e-3
    X = np.hstack([V0[c] - h, np.ones((len(c), 1))]) * np.sqrt(wt)[:, None]; Y = (V1[c] - h) * np.sqrt(wt)[:, None]
    A, *_ = np.linalg.lstsq(X.T @ X + 1e-9 * np.eye(4), X.T @ Y, rcond=None)
    L = A[:3]                                                  # linear part: keep it sane (no flips / wild shear)
    sv = np.linalg.svd(L, compute_uv=False)
    if sv.min() < 0.4 or sv.max() > 2.5 or np.linalg.det(L) < 0:
        ca, cb = np.average(V0[c], 0, wt), np.average(V1[c], 0, wt); h1 = h + (cb - ca)       # fall back to the local shift
    else:
        h1 = h + A[3]
    bones1[b] = h1; stats.append(np.linalg.norm(h1 - h))
# the head and neck bones stay exactly where the MH head component expects them
for b in ("head", "neck_01", "neck_02"):
    print("   %s kept at the MH position (the skin fit would have moved it %.1f mm)" % (b, np.linalg.norm(bones1[b] - bones0[b]) * 1000))
    bones1[b] = bones0[b].copy()
stats = np.array(stats)
print("joints moved: median %.1f mm, max %.1f mm (%s)" % (np.median(stats) * 1000, stats.max() * 1000, list(bones0)[int(stats.argmax())]))
print("head bone moved %.3f mm, neck_02 %.2f mm, neck_01 %.2f mm" % tuple(np.linalg.norm(bones1[b] - bones0[b]) * 1000 for b in ("head", "neck_02", "neck_01")))
# compare with the joints fitted by slicing (stage 2/3), where those exist
pj = os.path.join(WORK, "posed.json")
JP = {k: np.array(v) + np.array([0, dy, 0]) for k, v in json.load(open(pj))["HFp"].items()}
print("skin-driven joints vs the sliced HF joints (cm):", ", ".join("%s %.1f" % (b, np.linalg.norm(bones1[b] - JP[b]) * 100) for b in ("upperarm_l", "lowerarm_l", "hand_l", "thigh_l", "calf_l", "foot_l", "pelvis", "spine_05")))
for s_ in ("upperarm", "lowerarm", "thigh", "calf"):
    a, b = bones1[s_ + "_l"] * np.array([-1, 1, 1]), bones1[s_ + "_r"]
    if np.linalg.norm(a - b) > 0.01: print("   left/right asymmetry %s %.1f mm" % (s_, np.linalg.norm(a - b) * 1000))

# ------------------------------------------------------------------ write: vertices, then the rest pose (= bind pose)
Mi = np.linalg.inv(Mw)
me.data.vertices.foreach_set("co", (V1 @ Mi[:3, :3].T + Mi[:3, 3]).ravel()); me.data.update()
AWi = AW.inverted()
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for eb in arm.data.edit_bones: eb.use_connect = False
for eb in arm.data.edit_bones:
    dlt = (AWi @ Vector(bones1[eb.name])) - eb.head
    eb.head = eb.head + dlt; eb.tail = eb.tail + dlt          # translate only: bone axes (and roll) stay as in MH
bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.view_layer.update()
chk = max(np.linalg.norm(np.array(AW @ b.head_local) - bones1[b.name]) for b in arm.data.bones)
print("rest pose written: max joint error %.6f m" % chk)
me.name = "SK_%s_BodyDirect" % NAME; me.data.name = me.name

# ------------------------------------------------------------------ renders: A-pose next to the HF body, then a pose test
W_, H_ = 760, 1300
sc = setup_render(W_, H_); sc.render.film_transparent = True
bpy.ops.wm.append(directory=os.path.join(WORK, "hf_posed.blend", "Object"), filename=CFG["APOSE_NAME"])
hf = bpy.data.objects[CFG["APOSE_NAME"]]
set_co(hf, co(hf) + np.array([0, dy, 0]))
hf.data.materials.clear(); hf.data.materials.append(mat("hf", (0.86, 0.66, 0.5, 1)))
me.data.materials.clear(); me.data.materials.append(mat("b", (0.72, 0.76, 0.84, 1)))
me.data.polygons.foreach_set("material_index", np.zeros(len(me.data.polygons), dtype=np.int32))
for o in (hf, me):
    for p in o.data.polygons: p.use_smooth = True
SCALE = HEIGHT * 1.08; zc = HEIGHT * 0.5
def shot(cam, ob, tag):
    for o in (hf, me): o.hide_render = o is not ob
    path = os.path.join(WORK, "bd_%s.png" % tag); render(cam, path)
    im = bpy.data.images.load(path); g = np.array(im.pixels[:], dtype=np.float32).reshape(H_, W_, 4)[::-1].copy(); bpy.data.images.remove(im)
    p = np.full((H_, W_, 3), 0.94, np.float32); return p * (1 - g[..., 3:4]) + g[..., :3] * g[..., 3:4]
cf = ortho_cam("front", (0, -6, zc), (0, 0, zc), SCALE); cs = ortho_cam("side", (6, -0.05, zc), (0, -0.05, zc), SCALE)
panels = [shot(cf, hf, "hf_front"), shot(cf, me, "a_front"), shot(cs, hf, "hf_side"), shot(cs, me, "a_side")]

# pose test: arms down, elbows bent, a step with a bent knee
def rot_axis(a, t):
    a = np.asarray(a, float); a = a / np.linalg.norm(a); Kx = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + np.sin(t) * Kx + (1 - np.cos(t)) * (Kx @ Kx)
def turn(bone, axis_world, deg):
    """rotate a pose bone (and its children) about a world axis through its joint"""
    bpy.context.view_layer.update()
    pb = arm.pose.bones[bone]
    Mb = np.array(AW @ pb.matrix); h = Mb[:3, 3].copy()
    R = np.eye(4); R[:3, :3] = rot_axis(axis_world, np.radians(deg)); T1 = np.eye(4); T1[:3, 3] = h; T0 = np.eye(4); T0[:3, 3] = -h
    pb.matrix = AWi @ Matrix((T1 @ R @ T0 @ Mb).tolist())
    bpy.context.view_layer.update()
def jw(b): return np.array(AW @ arm.pose.bones[b].matrix)[:3, 3]
for s_, sg in (("l", 1), ("r", -1)):
    up = jw("lowerarm_" + s_) - jw("upperarm_" + s_)
    turn("upperarm_" + s_, np.cross(up, [0, 0, -1]), 30)                                   # arm down toward the body
    up = jw("lowerarm_" + s_) - jw("upperarm_" + s_); fo = jw("hand_" + s_) - jw("lowerarm_" + s_)
    turn("lowerarm_" + s_, np.cross(up, fo), 55)                                           # bend the elbow further
turn("thigh_l", [1, 0, 0], 32); turn("calf_l", [1, 0, 0], -50)                             # left leg forward, knee bent
turn("thigh_r", [1, 0, 0], -18); turn("calf_r", [1, 0, 0], -12)                            # right leg back
bpy.context.view_layer.update()
# deformation numbers: evaluated mesh, longest edge stretch vs the bind pose (tearing shows as huge stretch)
dg = bpy.context.evaluated_depsgraph_get(); ev = me.evaluated_get(dg); em = ev.to_mesh()
P = np.empty(NV * 3); em.vertices.foreach_get("co", P); P = P.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]
E = np.empty(len(em.edges) * 2, dtype=np.int32); em.edges.foreach_get("vertices", E); E = E.reshape(-1, 2)
l0 = np.linalg.norm(V1[E[:, 0]] - V1[E[:, 1]], axis=1); l1 = np.linalg.norm(P[E[:, 0]] - P[E[:, 1]], axis=1)
r = l1[l0 > 1e-4] / l0[l0 > 1e-4]
print("pose test: edge length ratio posed/bind: median %.3f, 0.1%% %.2f, 99.9%% %.2f, max %.2f; vertices moved > 1 cm: %d; unweighted verts: %d" % (
    np.median(r), np.percentile(r, 0.1), np.percentile(r, 99.9), r.max(), (np.linalg.norm(P - V1, axis=1) > 0.01).sum(), sum(1 for v in me.data.vertices if not v.groups)))
ev.to_mesh_clear()
c34 = ortho_cam("p34", (4, -4.5, zc + 0.5), (0, -0.05, zc), SCALE)
panels += [shot(cf, me, "pose_front"), shot(cs, me, "pose_side"), shot(c34, me, "pose_34")]
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
sheet = np.concatenate([np.concatenate([p, np.ones((H_, 8, 3), np.float32)], axis=1) for p in panels], axis=1)[:, :-8]
sheet = np.concatenate([sheet, np.ones(sheet.shape[:2] + (1,), np.float32)], axis=2)
out = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
out.pixels.foreach_set(sheet[::-1].ravel()); out.filepath_raw = SHEET; out.file_format = 'PNG'; out.save()
print("sheet saved", SHEET, sheet.shape[1], "x", sheet.shape[0], "(HF front | body front | HF side | body side | pose front | pose side | pose 3/4)")

# ------------------------------------------------------------------ export skeletal mesh + armature
bpy.data.objects.remove(hf, do_unlink=True)
me.hide_render = False
bpy.ops.object.select_all(action='DESELECT')
for o in empties + [arm, me]: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.fbx(filepath=OUT, use_selection=True, object_types={'EMPTY', 'ARMATURE', 'MESH'}, apply_unit_scale=True, global_scale=1.0,
                         axis_forward='-Y', axis_up='Z', bake_space_transform=False, use_mesh_modifiers=False, mesh_smooth_type='FACE',
                         add_leaf_bones=False, use_armature_deform_only=False, bake_anim=False, primary_bone_axis='Y', secondary_bone_axis='X')
json.dump(dict(head_scale=HEAD_SCALE, joints={k: [float(x) for x in v] for k, v in bones1.items()}), open(os.path.join(WORK, "bodydirect.json"), "w"))
# re-import check
bpy.ops.wm.read_factory_settings(use_empty=True)
ro = import_fbx(OUT); bpy.context.view_layer.update()
ra = [o for o in ro if o.type == 'ARMATURE'][0]; rm = [o for o in ro if o.type == 'MESH'][0]
rl = np.empty(len(rm.data.vertices) * 3); rm.data.vertices.foreach_get("co", rl); Mr = np.array(rm.matrix_world)
RV = rl.reshape(-1, 3) @ Mr[:3, :3].T + Mr[:3, 3]
jerr = max(np.linalg.norm(np.array(ra.matrix_world @ b.head_local) - bones1[b.name]) for b in ra.data.bones)
print("re-imported %s: objects %s; %d verts (MH %d), %d bones (MH %d), %d vertex groups, armature modifier %s" % (
    OUT, [(o.type, o.name) for o in ro], len(RV), NV, len(ra.data.bones), len(bones0), len(rm.vertex_groups), any(m.type == 'ARMATURE' for m in rm.modifiers)))
print("   max vertex error %.6f m, max joint error %.6f m, height %.2f cm, min z %.2f cm, scale chain %s" % (
    np.abs(RV - V1).max() if len(RV) == NV else -1, jerr, (RV[:, 2].max() - RV[:, 2].min()) * 100, RV[:, 2].min() * 100, tuple(round(x, 4) for x in rm.matrix_world.to_scale())))
print("   bone names identical: %s; parents identical: %s" % (set(b.name for b in ra.data.bones) == set(bones0), all((b.parent.name if b.parent else None) == par[b.name] for b in ra.data.bones)))
