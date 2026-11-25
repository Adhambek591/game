# Stage 9: BODY-ONLY skinned mesh. The MH FullBody FBX holds the head on UV tile 0 and the body on UV tile 1
# (no polygon mixes the two); this keeps the body part only (its vertices in their original relative order,
# weights, material slot), with the wrap shape and the re-fitted skeleton of stage 8. The neck seam vertices
# are put exactly where the MH head's seam is (Surtaysha: where it is after the head is scaled 1.0549 about
# the head joint in UE), and that correction fades out over the collar.
# QQ_CHAR=surtaysha|guloyim, after stage 8. Writes body\SK_<Name>_BodyOnly.fbx + Builds\<name>_bodyonly_check.png
import bpy, sys, os, json, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
low_priority(); reset()
NAME = "Guloyim" if CHAR == "guloyim" else "Surtaysha"
OUT = os.path.join(BODY, "SK_%s_BodyOnly.fbx" % NAME)
SHEET = os.path.join(os.path.dirname(CFG["SHEET_WRAP"]), "%s_bodyonly_check.png" % NAME.lower())
BD = json.load(open(os.path.join(WORK, "bodydirect.json")))
HS = float(BD["head_scale"]); JN = {k: np.array(v) for k, v in BD["joints"].items()}
SHIFT_UV = os.environ.get("QQ_KEEP_UV_TILE", "0") != "1"

objs = import_fbx(MH_FBX)
arm = [o for o in objs if o.type == 'ARMATURE'][0]; me = [o for o in objs if o.type == 'MESH'][0]
empties = [o for o in objs if o.type == 'EMPTY']
bpy.context.view_layer.update()
AW = arm.matrix_world.copy(); AWi = AW.inverted(); Mw = np.array(me.matrix_world); Mi = np.linalg.inv(Mw)
NV = len(me.data.vertices)
loc = np.empty(NV * 3); me.data.vertices.foreach_get("co", loc); V0 = loc.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]
piv = np.array(AW @ arm.data.bones["head"].head_local)

# ---- body / head split by UV tile
nl = len(me.data.loops); uv = np.empty(nl * 2); me.data.uv_layers[0].data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
lv = np.empty(nl, dtype=np.int32); me.data.loops.foreach_get("vertex_index", lv)
tile = np.floor(uv[:, 0] + 1e-6).astype(int)
vt = np.full(NV, -1); vt[lv] = tile
body = vt == 1
bi = np.where(body)[0]
print("%s: body verts %d (file indices %d..%d, contiguous %s), head verts %d; material slots %s" % (
    NAME, body.sum(), bi[0], bi[-1], bi[-1] - bi[0] + 1 == len(bi), (~body).sum(), [m.name for m in me.data.materials]))

# ---- wrap positions (as in stage 8, without any head scaling: the head is not part of this mesh)
Z = np.load(os.path.join(WORK, "wrap.npz")); dy = float(Z["dy"])
if CHAR == "guloyim":
    K = np.load(os.path.join(WORK, "wrap51k.npz")); inv = Z["inv"]
    Pn = np.zeros((inv.max() + 1, 3)); Pn[K["s2g"]] = K["V"]; V1 = Pn[inv]
else:
    V1 = Z["V"].copy()

# ---- neck seam: body vertices that share a position with a head vertex in the MH original
key = np.round(V0 / 1e-5).astype(np.int64)
_, inv0 = np.unique(key, axis=0, return_inverse=True); inv0 = inv0.ravel()
cnt = np.zeros((inv0.max() + 1, 2), int)
np.add.at(cnt[:, 0], inv0[~body], 1); np.add.at(cnt[:, 1], inv0[body], 1)
seam_node = (cnt[:, 0] > 0) & (cnt[:, 1] > 0)
seam = body & seam_node[inv0]
target = piv + (V0 - piv) * HS                              # where the head's seam is (head scaled about the head joint)
err0 = np.linalg.norm(V1[seam] - target[seam], axis=1)
print("neck seam: %d body vertices on %d positions; before the fix they are %.1f mm (max %.1f) from the head seam (head scale %.4f)" % (seam.sum(), seam_node.sum(), err0.mean() * 1000, err0.max() * 1000, HS))
# correction field: exact on the seam, diffused over the body surface, zero beyond RINGS rings
me.data.calc_loop_triangles()
T = np.empty(len(me.data.loop_triangles) * 3, dtype=np.int32); me.data.loop_triangles.foreach_get("vertices", T); T = T.reshape(-1, 3)
TB = T[body[T].all(1)]
nid = inv0                                                   # welded positions as graph nodes
E = np.unique(np.sort(np.concatenate([nid[TB[:, [0, 1]]], nid[TB[:, [1, 2]]], nid[TB[:, [2, 0]]]]), axis=1), axis=0)
NN = inv0.max() + 1
deg = np.maximum(np.bincount(E.ravel(), minlength=NN), 1).astype(float)
def nb(X):
    out = np.zeros_like(X)
    for c in range(X.shape[1]): out[:, c] = np.bincount(E[:, 0], X[E[:, 1], c], NN) + np.bincount(E[:, 1], X[E[:, 0], c], NN)
    return out
RINGS = 14
ring = np.full(NN, 999); ring[seam_node] = 0; front = seam_node.copy()
for r in range(1, RINGS + 1):
    grow = (nb(front[:, None].astype(float))[:, 0] > 0) & (ring == 999)
    ring[grow] = r; front = grow
band = (ring > 0) & (ring <= RINGS)
Dn = np.zeros((NN, 3)); fix = np.zeros((NN, 3)); fix[inv0[seam]] = (target - V1)[seam]
Dn[seam_node] = fix[seam_node]
for _ in range(600):
    avg = nb(Dn) / deg[:, None]; Dn[band] = avg[band]; Dn[ring > RINGS] = 0
V2 = V1 + Dn[inv0] * body[:, None]
if CFG["HAIR"]:
    # the chest that lay under the hair strands carries fine wrinkles from the strand edges: Taubin smoothing
    # (shrink-free: +0.5 / -0.53 steps) on the front of the chest only, so the bust keeps its volume
    Pt = np.zeros((NN, 3)); Pt[inv0[body]] = V2[body]
    zs_ = float(V0[seam, 2].mean())
    reg = np.zeros(NN, bool)
    cb = body & (V2[:, 1] < -0.02) & (np.abs(V2[:, 0]) < 0.17) & (V2[:, 2] > zs_ - 0.24) & (V2[:, 2] < zs_ - 0.01)
    reg[inv0[cb]] = True; reg &= ~seam_node
    bust0 = Pt[reg, 1].min()
    for _ in range(12):
        for lam in (0.5, -0.53):
            avg = nb(Pt) / deg[:, None]; Pt[reg] = Pt[reg] + lam * (avg[reg] - Pt[reg])
    print("chest wrinkles: Taubin smoothing on %d nodes, largest move %.1f mm, front-most point of the bust %.1f -> %.1f mm" % (
        reg.sum(), np.linalg.norm(Pt[inv0[body]] - V2[body], axis=1).max() * 1000, bust0 * 1000, Pt[reg, 1].min() * 1000))
    V2[body] = Pt[inv0[body]]
# relax the collar band (seam fixed) so the pulled-in surface has no wrinkles
Pn2 = np.zeros((NN, 3)); Pn2[inv0[body]] = V2[body]
soft = band & (ring <= 6)                       # only the collar itself: the bust and shoulder blades keep their shape
for _ in range(10):
    avg = nb(Pn2) / deg[:, None]; Pn2[soft] = 0.5 * Pn2[soft] + 0.5 * avg[soft]
V2[body] = Pn2[inv0[body]]
err1 = np.linalg.norm(V2[seam] - target[seam], axis=1)
moved = np.linalg.norm(V2 - V1, axis=1)[body]
print("neck seam after: max %.6f m from the head seam; collar blend touches %d body vertices (max %.1f mm, beyond the collar 0)" % (err1.max(), (moved > 1e-5).sum(), moved.max() * 1000))

# ---- head part kept aside for the check render (scaled like UE will scale the face component)
head_ob = me.copy(); head_ob.data = me.data.copy(); head_ob.name = "HEADREF"; bpy.context.scene.collection.objects.link(head_ob)
head_ob.parent = None; head_ob.matrix_world = Matrix.Identity(4)
for m in list(head_ob.modifiers): head_ob.modifiers.remove(m)
head_ob.data.vertices.foreach_set("co", (piv + (V0 - piv) * HS).ravel())
bmh = bmesh.new(); bmh.from_mesh(head_ob.data); bmh.verts.ensure_lookup_table()
bmesh.ops.delete(bmh, geom=[v for v in bmh.verts if body[v.index]], context='VERTS'); bmh.to_mesh(head_ob.data); bmh.free()

# ---- write the body: positions, rest pose, drop the head vertices, UVs to the 0..1 tile
me.data.vertices.foreach_set("co", (V2 @ Mi[:3, :3].T + Mi[:3, 3]).ravel())
if SHIFT_UV:
    uv2 = uv.copy(); uv2[tile == 1, 0] -= 1.0
    me.data.uv_layers[0].data.foreach_set("uv", uv2.ravel())
bm = bmesh.new(); bm.from_mesh(me.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not body[v.index]], context='VERTS')
bm.to_mesh(me.data); bm.free(); me.data.update()
NB = len(me.data.vertices)
lb = np.empty(NB * 3); me.data.vertices.foreach_get("co", lb); VB = lb.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]
print("body-only mesh: %d verts, %d tris; order = original body order: %s; UVs %s" % (NB, len(me.data.polygons), np.abs(VB - V2[body]).max() < 1e-5,
      "moved from tile 1 to 0..1 (set QQ_KEEP_UV_TILE=1 to keep the FullBody tile)" if SHIFT_UV else "kept on tile 1"))
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for eb in arm.data.edit_bones: eb.use_connect = False
for eb in arm.data.edit_bones:
    dlt = (AWi @ Vector(JN[eb.name])) - eb.head; eb.head = eb.head + dlt; eb.tail = eb.tail + dlt
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
me.name = "SK_%s_BodyOnly" % NAME; me.data.name = me.name
used = {g.group for v in me.data.vertices for g in v.groups}
print("vertex groups %d (with weights on the body %d); unweighted body verts %d; material slots kept: %s" % (
    len(me.vertex_groups), len(used), sum(1 for v in me.data.vertices if not v.groups), [m.name for m in me.data.materials]))

# ---- check render: front | side | neck close-up with the MH head (red) on the body
W_, H_ = 760, 1300
sc = setup_render(W_, H_); sc.render.film_transparent = True
slot0 = [m for m in me.data.materials]
viewm = mat("view_body", (0.72, 0.76, 0.84, 1)); head_ob.data.materials.clear(); head_ob.data.materials.append(mat("view_head", (0.9, 0.45, 0.4, 1)))
me.data.materials[0] = viewm
for o in (me, head_ob):
    for p in o.data.polygons: p.use_smooth = True
SCALE = HEIGHT * 1.08; zc = HEIGHT * 0.5
def shot(cam, show_head, tag, w=W_):
    sc.render.resolution_x = w
    head_ob.hide_render = not show_head
    path = os.path.join(WORK, "bo_%s.png" % tag); render(cam, path)
    im = bpy.data.images.load(path); g = np.array(im.pixels[:], dtype=np.float32).reshape(H_, w, 4)[::-1].copy(); bpy.data.images.remove(im)
    p = np.full((H_, w, 3), 0.94, np.float32); return p * (1 - g[..., 3:4]) + g[..., :3] * g[..., 3:4]
zn = float(V0[seam, 2].mean())
panels = [shot(ortho_cam("f", (0, -6, zc), (0, 0, zc), SCALE), False, "front"), shot(ortho_cam("s", (6, -0.05, zc), (0, -0.05, zc), SCALE), False, "side"),
          shot(ortho_cam("nf", (0, -6, zn + 0.05), (0, 0, zn + 0.05), 0.62 * H_ / W_), True, "neck_front"),
          shot(ortho_cam("nb", (4, 4.5, zn + 0.4), (0, 0, zn + 0.05), 0.62 * H_ / W_), True, "neck_back"),
          shot(ortho_cam("nt", (-4.5, -3, zn + 0.9), (0, 0, zn), 0.62 * H_ / W_), False, "neck_open")]
sheet = np.concatenate([np.concatenate([p, np.ones((H_, 8, 3), np.float32)], axis=1) for p in panels], axis=1)[:, :-8]
sheet = np.concatenate([sheet, np.ones(sheet.shape[:2] + (1,), np.float32)], axis=2)
out = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
out.pixels.foreach_set(sheet[::-1].ravel()); out.filepath_raw = SHEET; out.file_format = 'PNG'; out.save()
print("sheet saved", SHEET, "(body front | body side | neck with the MH head in red, front | same from behind | open neck of the body alone)")
me.data.materials[0] = slot0[0]
bpy.data.objects.remove(head_ob, do_unlink=True)

# ---- export + re-import check
bpy.ops.object.select_all(action='DESELECT')
for o in empties + [arm, me]: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.fbx(filepath=OUT, use_selection=True, object_types={'EMPTY', 'ARMATURE', 'MESH'}, apply_unit_scale=True, global_scale=1.0,
                         axis_forward='-Y', axis_up='Z', bake_space_transform=False, use_mesh_modifiers=False, mesh_smooth_type='FACE',
                         add_leaf_bones=False, use_armature_deform_only=False, bake_anim=False, primary_bone_axis='Y', secondary_bone_axis='X')
bpy.ops.wm.read_factory_settings(use_empty=True)
ro = import_fbx(OUT); bpy.context.view_layer.update()
ra = [o for o in ro if o.type == 'ARMATURE'][0]; rm = [o for o in ro if o.type == 'MESH'][0]
rl = np.empty(len(rm.data.vertices) * 3); rm.data.vertices.foreach_get("co", rl); Mr = np.array(rm.matrix_world)
RV = rl.reshape(-1, 3) @ Mr[:3, :3].T + Mr[:3, 3]
ruv = np.empty(len(rm.data.loops) * 2); rm.data.uv_layers[0].data.foreach_get("uv", ruv); ruv = ruv.reshape(-1, 2)
jerr = max(np.linalg.norm(np.array(ra.matrix_world @ b.head_local) - JN[b.name]) for b in ra.data.bones)
print("re-imported %s: %d verts, %d tris, %d bones, %d vertex groups, materials %s, UV u range %.3f..%.3f" % (
    OUT, len(RV), len(rm.data.polygons), len(ra.data.bones), len(rm.vertex_groups), [m.name for m in rm.data.materials], ruv[:, 0].min(), ruv[:, 0].max()))
print("   max vertex error %.6f m, max joint error %.6f m, top of the body %.2f cm, min z %.2f cm" % (np.abs(RV - V2[body]).max() if len(RV) == body.sum() else -1, jerr, RV[:, 2].max() * 100, RV[:, 2].min() * 100))
