# EXPERIMENT, RESULT REJECTED (2026-11-21): Meshy shells fuse coat+legs and braids+back, so reweighting tears the coat and
# braid bones drag membranes of back surface along. Kept for reference; do not ship its output. Real fix = layered character.
# Secondary rig pass for the Meshy/MPFB characters (P_*.glb). Meshy models are one fused shell: a long coat is the same surface
# as the legs, and the auto-rig weights it to the thighs (the coat lifts like a board and tears between the legs).
#  1. Coat band (hem .. hips): weights rebuilt as a gradient - hips at the top, the legs at the hem, left/right blended smoothly
#     across the middle line (no seam between the legs) - then Laplacian-smoothed inside the band.
#  2. Braids: dark-hair vertices hanging behind the head below the neck get chains of 4 bones each ("BraidL1..4", "BraidR1..4"),
#     driven at runtime by QQSpring (follow-through / overlapping action).
# Run: blender -b --python secondary.py -- <in.glb> <out.glb> [hem_frac]
import bpy, bmesh, sys, math
from mathutils import Vector, kdtree

args = sys.argv[sys.argv.index('--') + 1:]; src, out = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); body = max([o for o in sc.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
B = arm.data.bones
def hw(n): return arm.matrix_world @ B[n].head_local
up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()
hip, lt, lk, lf, head, neck = hw('Hips'), hw('LeftUpLeg'), hw('LeftLeg'), hw('LeftFoot'), hw('Head'), hw('neck')
me = body.data; mw = body.matrix_world; P = [mw @ v.co for v in me.vertices]; N = len(P)
G = {g.name: g for g in body.vertex_groups}
def W(vi):
    return {body.vertex_groups[g.group].name: g.weight for g in me.vertices[vi].groups if g.weight > 1e-5}

# ---------- 1. coat hem: the lowest height where the outline is still wider than the legs ----------
cx, cy = hip.x, hip.y
def width(z):
    xs = [abs((p - hip).dot(rgt)) for p in P if abs(p.z - z) < .01]
    return max(xs) if xs else 0
legw = width(lk.z - (lk.z - lf.z) * .5)   # half-width of the shins slice (both legs)
hem = None; z = hip.z - .05
while z > lf.z:
    if width(z) < legw * 1.12: hem = z; break
    z -= .01
hem = hem or lk.z
DO_COAT = 'nocoat' not in args
top = lt.z + .04
print('SEC hem', round(hem, 3), 'knee', round(lk.z, 3), 'thigh', round(lt.z, 3), 'legw', round(legw, 3))

def smooth(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
legset = ('LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'Hips')
band = [i for i in range(N) if DO_COAT and hem - .03 < P[i].z < top + .06 and any(k in legset for k in W(i))]
halfw = max(.06, width((hem + top) * .5) * .35)
neww = {}
for i in band:
    p = P[i]; u = smooth(hem, top, p.z)                     # 0 at hem, 1 at top
    hipsShare = .92 * smooth(.25, 1.0, u)
    lat = (p - hip).dot(rgt)                                  # + = right side
    rShare = smooth(-halfw, halfw, lat)
    old = W(i); shin = old.get('LeftLeg', 0) + old.get('RightLeg', 0)
    keepShin = shin * (1 - smooth(0, .3, u))                  # right at the hem the shin weights stay
    rest = max(0, 1 - hipsShare - keepShin)
    w = {'Hips': hipsShare, 'RightUpLeg': rest * rShare, 'LeftUpLeg': rest * (1 - rShare)}
    if keepShin > 0: w['LeftLeg'] = old.get('LeftLeg', 0) / max(1e-5, shin) * keepShin; w['RightLeg'] = old.get('RightLeg', 0) / max(1e-5, shin) * keepShin
    # blend in near the borders of the band so nothing pops
    edge = min(smooth(hem - .03, hem + .02, p.z), 1 - smooth(top, top + .06, p.z))
    blended = {}
    for k in set(w) | set(old):
        if k in legset or k in w: blended[k] = old.get(k, 0) * (1 - edge) + w.get(k, 0) * edge
        else: blended[k] = old.get(k, 0)
    neww[i] = blended
# Laplacian smoothing of the band weights over mesh edges (3 passes)
adj = [[] for _ in range(N)]
for e in me.edges: a, b = e.vertices; adj[a].append(b); adj[b].append(a)
bandset = set(band)
for it in range(3):
    nxt = {}
    for i in band:
        acc = dict(neww[i]); cnt = 1
        for j in adj[i]:
            src_w = neww.get(j) if j in bandset else W(j)
            for k, v in src_w.items(): acc[k] = acc.get(k, 0) + v
            cnt += 1
        nxt[i] = {k: v / cnt for k, v in acc.items()}
    neww = nxt
for i, w in neww.items():
    tot = sum(w.values()) or 1
    for k, v in w.items():
        if k not in G: G[k] = body.vertex_groups.new(name=k)
        if v / tot > 1e-4: G[k].add([i], v / tot, 'REPLACE')
        else: G[k].remove([i])
print('SEC coat verts', len(band))

# ---------- 2. braids ----------
img = None
for m in me.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links:
                fn = n.inputs['Base Color'].links[0].from_node
                if fn.type == 'TEX_IMAGE': img = fn.image
pix = list(img.pixels[:]) if img else None; IW, IH = img.size if img else (0, 0)
uv = me.uv_layers.active.data if me.uv_layers else None
lum = [1.0] * N
if pix and uv:
    acc = [[0, 0] for _ in range(N)]
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; u_, v_ = uv[li].uv; k = (int((v_ % 1) * (IH - 1)) * IW + int((u_ % 1) * (IW - 1))) * 4
            acc[vi][0] += .3 * pix[k] + .59 * pix[k + 1] + .11 * pix[k + 2]; acc[vi][1] += 1
    lum = [a / c if c else 1 for a, c in acc]
    sat = [0.0] * N; acc2 = [[0, 0] for _ in range(N)]
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; u_, v_ = uv[li].uv; k = (int((v_ % 1) * (IH - 1)) * IW + int((u_ % 1) * (IW - 1))) * 4
            r_, g_, b_ = pix[k], pix[k + 1], pix[k + 2]; acc2[vi][0] += (max(r_, g_, b_) - min(r_, g_, b_)) / max(.02, max(r_, g_, b_)); acc2[vi][1] += 1
    sat = [a / c if c else 1 for a, c in acc2]
# candidates: dark, behind the neck plane, below the head, above the hips
nz = neck.z
cand = [i for i in range(N) if lum[i] < .05 and sat[i] < .45 and (P[i] - neck).dot(fwd) < -.02 and hip.z + .02 < P[i].z < nz + .02]
sides = {'L': [i for i in cand if (P[i] - neck).dot(rgt) < 0], 'R': [i for i in cand if (P[i] - neck).dot(rgt) >= 0]}
made = []
for S, ids in sides.items():
    if len(ids) < 60: print('SEC braid', S, 'too few', len(ids)); continue
    zs = sorted(P[i].z for i in ids); zt, zb = zs[int(len(zs) * .97)], zs[int(len(zs) * .02)]
    if zt - zb < .12: print('SEC braid', S, 'too short'); continue
    # chain points: centroid of the braid vertices in 5 height slices
    pts = []
    for k in range(5):
        z0 = zt - (zt - zb) * k / 4; sl = [P[i] for i in ids if abs(P[i].z - z0) < (zt - zb) / 8 + .005]
        if not sl: sl = [min((P[i] for i in ids), key=lambda q: abs(q.z - z0))]
        c = sum(sl, Vector()) / len(sl); pts.append(c)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; inv = arm.matrix_world.inverted(); parent = eb['Head'] if pts[0].z > nz - .03 else eb['neck']
    names = []
    for k in range(4):
        b = eb.new('Braid%s%d' % (S, k + 1)); b.head = inv @ pts[k]; b.tail = inv @ pts[k + 1]; b.parent = parent; b.use_connect = False; parent = b; names.append(b.name)
    bpy.ops.object.mode_set(mode='OBJECT')
    # weights: by projection on the chain, the top segment shares with the head/neck so the root does not tear
    for nm in names:
        if nm not in G: G[nm] = body.vertex_groups.new(name=nm)
    rootname = 'Head' if pts[0].z > nz - .03 else 'neck'
    for i in ids:
        p = P[i]; best = None
        for k in range(4):
            a, b = pts[k], pts[k + 1]; t = max(0, min(1, (p - a).dot(b - a) / max(1e-6, (b - a).length_squared))); d = (p - (a + (b - a) * t)).length
            if best is None or d < best[0]: best = (d, k, t)
        d, k, t = best
        if d > .04: continue                                          # not part of the braid strand
        w = {names[k]: 1 - .5 * max(0, t - .5) * 2}
        if k < 3: w[names[k + 1]] = .5 * max(0, t - .5) * 2
        if k == 0: r = 1 - smooth(0, .6, t); w = {kk: vv * (1 - r) for kk, vv in w.items()}; w[rootname] = r
        for g in list(me.vertices[i].groups):
            gn = body.vertex_groups[g.group].name
            if gn in B or gn.startswith('Braid'): body.vertex_groups[g.group].remove([i])
        tot = sum(w.values())
        for kk, vv in w.items():
            if kk not in G: G[kk] = body.vertex_groups.new(name=kk)
            G[kk].add([i], vv / tot, 'REPLACE')
    made.append((S, len(ids), [tuple(round(c, 3) for c in q) for q in (pts[0], pts[-1])]))
print('SEC braids', made)

bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True)
for o in sc.objects:
    if o.type == 'MESH' and o.parent == arm: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_skins=True, export_animations=False)
print('SEC DONE')
