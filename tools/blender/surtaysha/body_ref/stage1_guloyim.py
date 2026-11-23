# Stage 1 (Guloyim): import the HF3D glb, weld, close the mesh, scale to 171 cm with the feet at z=0, and
# find the hair. The hair is striated (strand grooves) while skin and cloth are smooth, so it is detected as
# the rough region connected to the top of the head; the faces get a 'hair' attribute (1 = hair).
# The hair faces are never used as a target later: under them the wrap keeps the MetaHuman shape, carried
# by the smoothed displacement field (that is the rebuilt skull / neck / upper back).
# Run with QQ_CHAR=guloyim. Saves work_g/hf_clean.blend + mask renders.
import bpy, sys, os, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
assert CHAR == "guloyim"
low_priority(); reset()
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=HF_FBX)
ob = [o for o in bpy.data.objects if o not in before and o.type == 'MESH'][0]
bake_world(ob); ob.name = "HF"
bm = bmesh.new(); bm.from_mesh(ob.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
fix_nonmanifold(bm)
# floating bits
bm.verts.ensure_lookup_table(); seen = set(); comps = []
for v in bm.verts:
    if v in seen: continue
    st = [v]; seen.add(v); comp = [v]
    while st:
        x = st.pop()
        for e in x.link_edges:
            o = e.other_vert(x)
            if o not in seen: seen.add(o); st.append(o); comp.append(o)
    comps.append(comp)
comps.sort(key=len, reverse=True)
for c in comps[1:]:
    print("floating component removed:", len(c)); bmesh.ops.delete(bm, geom=c, context='VERTS')
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(ob.data); bm.free()
V = co(ob)
s = HEIGHT / (V[:, 2].max() - V[:, 2].min())
V = (V - np.array([0.5 * (V[:, 0].min() + V[:, 0].max()), 0, V[:, 2].min()])) * s
set_co(ob, V)
print("scaled x%.4f to %.3f m" % (s, V[:, 2].max()))
mesh_stats(ob, "guloyim clean")

# ---- hair = rough (striated) surface connected to the top of the head
NV = len(V)
ne = len(ob.data.edges); E = np.empty(ne * 2, dtype=np.int32); ob.data.edges.foreach_get("vertices", E); E = E.reshape(-1, 2)
deg = np.bincount(E.ravel(), minlength=NV).astype(float)
def nb_sum(X):
    out = np.zeros_like(X)
    for c in range(X.shape[1]):
        out[:, c] = np.bincount(E[:, 0], X[E[:, 1], c], NV) + np.bincount(E[:, 1], X[E[:, 0], c], NV)
    return out
# roughness = how much the vertex normals disagree with their neighbourhood (strand grooves: tens of degrees,
# skin / cloth: a few degrees), averaged over a ~2 cm patch
Nv = np.empty(NV * 3); ob.data.vertex_normals.foreach_get("vector", Nv); Nv = Nv.reshape(-1, 3)
Ns = Nv.copy()
for _ in range(4): Ns = 0.5 * Ns + 0.5 * nb_sum(Ns) / deg[:, None]
Ns /= np.maximum(np.linalg.norm(Ns, axis=1, keepdims=True), 1e-12)
R = np.degrees(np.arccos(np.clip((Nv * Ns).sum(1), -1, 1)))[:, None]
for _ in range(4): R = 0.5 * R + 0.5 * nb_sum(R) / deg[:, None]
R = R[:, 0]
L = levels(sample_surface(ob))
THR = float(os.environ.get("QQ_HAIR_THR", "4.5"))
print("levels", {k: round(v, 3) for k, v in L.items()})
print("roughness deg: all 50/75/90/95/99", np.percentile(R, [50, 75, 90, 95, 99]).round(1), "; back of head 10/50", np.percentile(R[(V[:, 2] > 1.5) & (V[:, 1] > 0.05)], [10, 50]).round(1),
      "; thigh 50/99", np.percentile(R[(V[:, 2] < 0.7) & (V[:, 2] > 0.3)], [50, 99]).round(1), "; belly 50/99", np.percentile(R[(V[:, 2] < 1.1) & (V[:, 2] > 0.85) & (np.abs(V[:, 0]) < 0.12)], [50, 99]).round(1))
zlo = L["armpit"] - 0.10                      # hair ends above the band of the top
cand = (R > THR) & (V[:, 2] > zlo) & (np.abs(V[:, 0]) < 0.24)
# the face is rough too (eyes, nose, lips): it is in front of the ears and above the chin - not hair
face = (V[:, 2] > L['chin'] - 0.01) & (V[:, 1] < -0.035) & (np.abs(V[:, 0]) < 0.062) & (V[:, 2] < L['top'] - 0.075)
cand &= ~face
# keep what is connected to the hair on top of the head; erode first so thin rough lines (strap rims, the
# neckline of the top) cannot carry the flood onto the shoulders
adj = [[] for _ in range(NV)]
for a, b in E: adj[a].append(b); adj[b].append(a)
core = cand.copy()
for _ in range(2): core &= ~(nb_sum((~core)[:, None].astype(float))[:, 0] > 0)
seed = np.where(core & (V[:, 2] > L['top'] - 0.06))[0]
hair = np.zeros(NV, bool); hair[seed] = True; st = list(seed)
while st:
    v = st.pop()
    for o in adj[v]:
        if core[o] and not hair[o]: hair[o] = True; st.append(o)
for _ in range(5):                             # undo the erosion + take the flanks of the strands
    grow = nb_sum(hair[:, None].astype(float))[:, 0] > 0
    hair |= grow & ~face & (V[:, 2] > zlo)
# fill pinholes: non-hair islands fully enclosed by hair
nh = ~hair; lab = -np.ones(NV, int); n = 0; sizes = []
for v0 in np.where(nh)[0]:
    if lab[v0] >= 0: continue
    st = [v0]; lab[v0] = n; k = 0
    while st:
        v = st.pop(); k += 1
        for o in adj[v]:
            if nh[o] and lab[o] < 0: lab[o] = n; st.append(o)
    sizes.append(k); n += 1
big = int(np.argmax(sizes))
for i, k in enumerate(sizes):
    if i != big and k < 1500:
        zc = V[lab == i, 2].mean()
        if not (face[lab == i].mean() > 0.5): hair[lab == i] = True
print("hair vertices %d (%.1f%%), z range %.3f..%.3f; other non-hair islands: %s" % (hair.sum(), 100 * hair.mean(), V[hair, 2].min(), V[hair, 2].max(), sorted(sizes, reverse=True)[:6]))
at = ob.data.attributes.new("hair", 'INT', 'FACE')
pv = np.zeros(len(ob.data.polygons), dtype=np.int32)
for p in ob.data.polygons:
    if sum(hair[v] for v in p.vertices) >= 2: pv[p.index] = 1
at.data.foreach_set("value", pv)
print("hair faces %d of %d" % (pv.sum(), len(pv)))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "hf_clean.blend"))

# ---- mask renders (hair red)
ob.data.materials.append(mat("skin", (0.8, 0.8, 0.8, 1))); ob.data.materials.append(mat("hair", (0.9, 0.15, 0.1, 1)))
mi = pv.copy(); ob.data.polygons.foreach_set("material_index", mi)
setup_render(1000, 1000)
views = {"front": ((0, -5, 1.33), (0, 0, 1.33), 0.85), "back": ((0, 5, 1.33), (0, 0, 1.33), 0.85), "side": ((-5, 0, 1.33), (0, 0, 1.33), 0.85), "34": ((-3, -4, 1.7), (0, 0, 1.33), 0.85)}
for k, (loc, look, sc) in views.items():
    render(ortho_cam(k, loc, look, sc), os.path.join(WORK, "hair_%s.png" % k))
