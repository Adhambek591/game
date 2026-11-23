# Stage 1: clean the HF3D body. Merge split vertices, cut the beard off at the jaw, remove the two braids
# that run from the ears across the neck onto the chest, cap / patch and smooth, close remaining holes,
# drop floating bits. Saves work/hf_clean.blend + inspection renders.
import bpy, sys, os, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from mathutils.bvhtree import BVHTree
low_priority(); reset()
ob = load_hf()
bm = bmesh.new(); bm.from_mesh(ob.data)
TAG = bm.verts.layers.int.new('tag')     # 1 = beard cap, 2 = braid patch (python refs do not survive the ops)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
fix_nonmanifold(bm)
bm.verts.ensure_lookup_table(); bm.verts.index_update(); bm.normal_update()
C = np.array([v.co for v in bm.verts])

def flood(seeds, zc, limit=9000):
    seen = set(int(s) for s in seeds if C[s, 2] < zc)
    stack = list(seen)
    while stack:
        v = bm.verts[stack.pop()]
        for e in v.link_edges:
            o = e.other_vert(v)
            if o.index not in seen and o.co.z < zc:
                seen.add(o.index); stack.append(o.index)
                if len(seen) > limit: return None
    return seen

# ---- 1. beard: hangs free of the neck below the chin -> horizontal cut at the highest level where the part
#         below the plane is connected to the head only through the plane; flat cap built from rings.
m = (np.abs(C[:, 0]) < 0.03) & (C[:, 1] < -0.125) & (C[:, 2] > 1.54) & (C[:, 2] < 1.60)
tip = np.where(m)[0][np.argmin(C[m, 2])]
print("beard tip", C[tip].round(4))
best = None
for zc in np.arange(1.640, 1.55, -0.002):
    s = flood([tip], zc)
    if s:
        P = C[list(s)]
        if P[:, 0].min() > -0.11 and P[:, 0].max() < 0.11 and P[:, 1].max() < -0.062 and P[:, 2].min() > 1.50:
            best = zc; break
assert best is not None, "beard: no free-hanging cut found"
zc = best - 0.003
sv = [bm.verts[i] for i in flood([tip], zc)]
print("beard: free below z=%.3f, cut at z=%.3f, %d verts" % (best, zc, len(sv)))
fs = {f for v in sv for f in v.link_faces}
geom = list(fs) + list({e for f in fs for e in f.edges}) + list({v for f in fs for v in f.verts})
r = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, zc), plane_no=(0, 0, 1), clear_inner=False, clear_outer=False)
cut_v = {g for g in r['geom_cut'] if isinstance(g, bmesh.types.BMVert)}
seeds = [v for v in sv if v.is_valid and v.co.z < zc - 1e-6]
seen = set(seeds); stack = list(seeds)
while stack:
    v = stack.pop()
    for e in v.link_edges:
        o = e.other_vert(v)
        if o not in seen and o not in cut_v and o.co.z < zc - 1e-7:
            seen.add(o); stack.append(o)
assert len(seen) < 3000, "beard flood leaked"
bmesh.ops.delete(bm, geom=list(seen), context='VERTS')
be = [e for e in bm.edges if e.is_boundary]
beset = set(be); used = set(); loops = []
for e in be:
    if e in used: continue
    loop = [e.verts[0]]; cur = e.verts[1]; used.add(e)
    while cur != loop[0]:
        loop.append(cur)
        nxt = [x for x in cur.link_edges if x in beset and x not in used]
        if not nxt: break
        used.add(nxt[0]); cur = nxt[0].other_vert(cur)
    loops.append(loop)
print("beard removed", len(seen), "verts; boundary loops:", [len(l) for l in loops])
new_verts = set()
for loop in loops:
    n = len(loop)
    if n < 8: continue                      # tiny source holes are closed by holes_fill below
    cen = sum((v.co for v in loop), Vector()) / n
    rad = max((v.co - cen).length for v in loop)
    rings = max(2, int(rad / 0.006))
    prev_ring = loop
    for k in range(1, rings):
        ring = [bm.verts.new(v.co.lerp(cen, k / rings)) for v in loop]
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((prev_ring[i], prev_ring[j], ring[j], ring[i]))
        new_verts.update(ring); prev_ring = ring
    cv = bm.verts.new(cen); new_verts.add(cv)
    for i in range(n):
        bm.faces.new((prev_ring[i], prev_ring[(i + 1) % n], cv))
    new_verts.update(loop)
for v in new_verts: v[TAG] = 1
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.verts.ensure_lookup_table(); bm.verts.index_update(); bm.normal_update()

# ---- 2. braids: thin ribbons from the ears across the neck onto the chest, partly fused to the skin.
#         Morphological opening of a voxel occupancy grid around the neck (erode/dilate by R) keeps the
#         neck, jaw and chest but drops everything thinner than 2R; vertices outside the opened volume go.
VOX = 0.0025; R = 0.011
x0, x1, y0, y1, z0, z1 = -0.18, 0.18, -0.21, 0.005, 1.44, 1.665
nx, ny, nz = int((x1 - x0) / VOX), int((y1 - y0) / VOX), int((z1 - z0) / VOX)
bvh = BVHTree.FromBMesh(bm)
occ = np.zeros((nx, ny, nz), bool)
ydir = Vector((0, 1, 0))
for ix in range(nx):
    px = x0 + (ix + 0.5) * VOX
    for iz in range(nz):
        pz = z0 + (iz + 0.5) * VOX
        y = -0.6; hits = []
        while True:
            h = bvh.ray_cast(Vector((px, y, pz)), ydir, 2.0)
            if h[0] is None: break
            hits.append(h[0].y); y = h[0].y + 1e-5
        for a in range(0, len(hits) - 1, 2):
            ia = int(np.ceil((hits[a] - y0) / VOX - 0.5)); ib = int(np.floor((hits[a + 1] - y0) / VOX - 0.5))
            if ib >= 0 and ia < ny:
                occ[ix, max(ia, 0):min(ib, ny - 1) + 1, iz] = True
k = int(np.ceil(R / VOX)) + 2
def offs(rad):
    return [(i, j, l) for i in range(-k, k + 1) for j in range(-k, k + 1) for l in range(-k, k + 1)
            if (i * i + j * j + l * l) * VOX * VOX <= rad * rad]
def morph(a, rad, erode):
    p = np.pad(a, k, mode='edge')
    out = np.ones_like(a) if erode else np.zeros_like(a)
    for i, j, l in offs(rad):
        sl = p[k + i:k + i + nx, k + j:k + j + ny, k + l:k + l + nz]
        out = (out & sl) if erode else (out | sl)
    return out
opened = morph(morph(occ, R, True), R + 0.5 * VOX, False)
print("voxels: solid %d, lost by opening %d (grid %dx%dx%d)" % (occ.sum(), (occ & ~opened).sum(), nx, ny, nz))
kill = []
mg = R + 2 * VOX
for v in bm.verts:
    c = v.co
    if not (x0 + mg < c.x < x1 - mg and y0 + mg < c.y < y1 - mg and z0 + mg < c.z < z1 - mg): continue
    p = c - v.normal * 0.003
    i, j, l = int((p.x - x0) / VOX), int((p.y - y0) / VOX), int((p.z - z0) / VOX)
    if 0 <= i < nx and 0 <= j < ny and 0 <= l < nz and not opened[i, j, l]:
        kill.append(v)
# keep only real clusters (drop stray single hits on sharp creases)
ks = set(kill); comps = []; seen = set()
for v in kill:
    if v in seen: continue
    st = [v]; seen.add(v); comp = [v]
    while st:
        x = st.pop()
        for e in x.link_edges:
            o = e.other_vert(x)
            if o in ks and o not in seen: seen.add(o); st.append(o); comp.append(o)
    comps.append(comp)
comps.sort(key=len, reverse=True)
print("thin clusters:", [(len(c), tuple(float(t) for t in np.mean([v.co for v in c], 0).round(3))) for c in comps[:8]])
kill = [v for c in comps if len(c) >= 15 and abs(np.mean([v.co.x for v in c])) > 0.04 for v in c]
print("braid vertices removed:", len(kill))
bmesh.ops.delete(bm, geom=kill, context='VERTS')
filled = close_holes(bm)
print('braid holes filled:', len(filled))
r = {'faces': filled}
r = bmesh.ops.triangulate(bm, faces=r['faces'], quad_method='BEAUTY', ngon_method='BEAUTY')
patch_f = set(r['faces'])
patch_v = {v for f in patch_f for v in f.verts}
for _ in range(2):          # refine the patches so they can be relaxed
    es = [e for e in {e for f in patch_f for e in f.edges} if e.calc_length() > 0.006 and all(ff in patch_f for ff in e.link_faces)]
    if not es: break
    before = set(bm.faces)
    rr = bmesh.ops.subdivide_edges(bm, edges=es, cuts=1, use_grid_fill=False)
    patch_v |= {g for g in rr['geom_inner'] if isinstance(g, bmesh.types.BMVert)}
    patch_f = {f for f in patch_f if f.is_valid} | (set(bm.faces) - before)
    big = [f for f in patch_f if len(f.verts) > 3]
    if big:
        t = bmesh.ops.triangulate(bm, faces=big)
        patch_f = {f for f in patch_f if f.is_valid} | set(t['faces'])
for v in patch_v:
    if v.is_valid and v[TAG] == 0: v[TAG] = 2
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

# ---- close whatever holes are left, remove small floating components
extra = close_holes(bm)
print('extra holes filled:', len(extra))
bmesh.ops.triangulate(bm, faces=[f for f in extra if f.is_valid and len(f.verts) > 4])
bm.verts.ensure_lookup_table()
seen = set(); comps = []
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
    print("floating component removed:", len(c), "verts")
    bmesh.ops.delete(bm, geom=c, context='VERTS')

# ---- smooth the caps / patches and a collar around them (rounds the cuts into the chin, neck and chest)
def relax(vs, rings, iters):
    region = {v for v in vs if v.is_valid}; frontier = set(region)
    for _ in range(rings):
        nxt = set()
        for v in frontier:
            for e in v.link_edges:
                o = e.other_vert(v)
                if o not in region: nxt.add(o)
        region |= nxt; frontier = nxt
    reg = list(region)
    for it in range(iters):
        new = {}
        for v in reg:
            nb = [e.other_vert(v).co for e in v.link_edges]
            new[v] = v.co.lerp(sum(nb, Vector()) / len(nb), 0.5)
        for v, p in new.items(): v.co = p
relax([v for v in bm.verts if v[TAG] == 2], 3, 40)      # braid patches
relax([v for v in bm.verts if v[TAG] == 1], 5, 60)      # chin: round the flat cut into the jaw
print('relaxed: cap', sum(1 for v in bm.verts if v[TAG] == 1), 'patch', sum(1 for v in bm.verts if v[TAG] == 2))
bm.verts.layers.int.remove(TAG)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(ob.data); bm.free(); ob.data.update()
st = mesh_stats(ob, "clean")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(WORK, "hf_clean.blend"))

ob.data.materials.append(mat("g", (0.8, 0.8, 0.8, 1)))
setup_render(1000, 1000)
views = {"front": ((0, -5, 1.58), (0, 0, 1.58), 0.36), "side": ((-5, 0, 1.58), (0, 0, 1.58), 0.36),
         "34": ((-3, -4, 1.75), (0.02, -0.06, 1.57), 0.36), "34b": ((-4, -2, 1.3), (0.02, -0.06, 1.57), 0.36),
         "wide": ((-3, -4, 1.9), (0, -0.05, 1.58), 0.60)}
for k, (loc, look, s) in views.items():
    render(ortho_cam(k, loc, look, s), os.path.join(WORK, "clean_%s.png" % k))
