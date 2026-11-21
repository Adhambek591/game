# Spring chains for parts that hang from a small base: helmet plumes and tails. Unlike braids lying along the back, these are
# joined to the body only at their root, so they can be weighted to their own chain in place (no cutting needed):
#   - the part is grown over mesh edges from a seed, keeping vertices of its colour inside a region;
#   - geodesic (edge-hop) distance from its attachment ring gives a 0..1 parameter along it;
#   - 4 bones (<Name>1..4) follow the centroids of 5 parameter bins; weights by the parameter, the root blends into the parent.
# Run: blender -b --python appendage.py -- <in.glb> <out.glb> <out_low.glb> <kind>[,<kind>]   kind: plume_red | plume_black | tail_fur
import bpy, bmesh, sys, math
from collections import deque
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]; src, out, out_low, kinds = args[0], args[1], args[2], args[3].split(',')
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); body = max([o for o in sc.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
Bn = arm.data.bones
def hw(n): return arm.matrix_world @ Bn[n].head_local
up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()
hip, head = hw('Hips'), hw('Head')
me = body.data; mw = body.matrix_world; P = [mw @ v.co for v in me.vertices]; N = len(P)
zmin = min(p.z for p in P); zmax = max(p.z for p in P); S = (zmax - zmin) / 1.75
img = None
for m in me.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links and n.inputs['Base Color'].links[0].from_node.type == 'TEX_IMAGE': img = n.inputs['Base Color'].links[0].from_node.image
pix = list(img.pixels[:]); IW, IH = img.size; uv = me.uv_layers.active.data
COL = [None] * N
for poly in me.polygons:
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index
        if COL[vi] is None:
            u, v = uv[li].uv; k = (int((v % 1) * (IH - 1)) * IW + int((u % 1) * (IW - 1))) * 4; COL[vi] = (pix[k], pix[k + 1], pix[k + 2])
adj = [[] for _ in range(N)]
for e in me.edges: a, b = e.vertices; adj[a].append(b); adj[b].append(a)
gname = {g.index: g.name for g in body.vertex_groups}
def lum(c): return .3 * c[0] + .59 * c[1] + .11 * c[2]

SPECS = {
    'plume_red':   ('Plume', 'Head', lambda i: COL[i] and COL[i][0] > .25 and COL[i][0] > 1.7 * COL[i][1] and COL[i][0] > 1.5 * COL[i][2], lambda p: p.z > head.z + .1 * S),
    'plume_black': ('Plume', 'Head', lambda i: COL[i] and lum(COL[i]) < .08, lambda p: p.z > hw('neck').z + .12 * S and (p - head).dot(fwd) < .05 * S),
    'tail_fur':    ('Tail', 'Hips', lambda i: COL[i] and lum(COL[i]) > .18 and (max(COL[i]) - min(COL[i])) / max(.02, max(COL[i])) < .25, lambda p: (p - hip).dot(fwd) < -.12 * S and p.z < hip.z + .05 * S),
}
made = []
for kind in kinds:
    name, parent, colok, regok = SPECS[kind]
    ok = [i for i in range(N) if regok(P[i]) and colok(i)]
    if len(ok) < 30: print('APP', kind, 'none', len(ok)); continue
    okset = set(ok)
    # biggest connected component of matching vertices
    seen = set(); comps = []
    for s0 in ok:
        if s0 in seen: continue
        comp = []; dq = deque([s0]); seen.add(s0)
        while dq:
            a = dq.popleft(); comp.append(a)
            for b in adj[a]:
                if b in okset and b not in seen: seen.add(b); dq.append(b)
        comps.append(comp)
    comp = max(comps, key=len); cset = set(comp)
    # attachment ring: component vertices touching non-component vertices, nearest the parent bone
    pref = head if parent == 'Head' else hip
    bnd = [i for i in comp if any(b not in cset for b in adj[i])]
    if len(bnd) < 6: bnd = list(comp)   # a separate island (glued on): attach at its vertices nearest the parent
    bnd.sort(key=lambda i: (P[i] - pref).length); root = bnd[:max(8, len(bnd) // 6)]
    dist = {i: 0 for i in root}; dq = deque(root)
    while dq:
        a = dq.popleft()
        for b in adj[a]:
            if b in cset and b not in dist: dist[b] = dist[a] + 1; dq.append(b)
    mx = max(dist.values()) or 1
    bins = [[] for _ in range(5)]
    for i, d in dist.items(): bins[min(4, int(d / mx * 5))].append(P[i])
    pts = [sum(b, Vector()) / len(b) for b in bins if b]
    if len(pts) < 3: print('APP', kind, 'too short'); continue
    pts = [sum((P[i] for i in root), Vector()) / len(root)] + pts[1:] + [max((P[i] for i in dist), key=lambda q: (q - pts[0]).length)]
    pts = pts[:5] if len(pts) > 5 else pts
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; inv = arm.matrix_world.inverted(); par = eb[parent]; bn = []
    for k in range(len(pts) - 1):
        b = eb.new('%s%d' % (name, k + 1)); b.head = inv @ pts[k]; b.tail = inv @ pts[k + 1]; b.parent = par; b.use_connect = False; par = b; bn.append(b.name)
    bpy.ops.object.mode_set(mode='OBJECT')
    for n_ in bn: body.vertex_groups.new(name=n_)
    G = {g.name: g for g in body.vertex_groups}
    nb = len(bn)
    for i, d in dist.items():
        t = d / mx; x = t * nb; k = min(nb - 1, int(x)); f = x - k
        w = {bn[k]: 1 - max(0, f - .5)}
        if f > .5 and k < nb - 1: w[bn[k + 1]] = f - .5
        if t < .12: r = 1 - t / .12; w = {kk: vv * (1 - r) for kk, vv in w.items()}; w[parent] = r
        for g in list(me.vertices[i].groups): body.vertex_groups[g.group].remove([i])
        tot = sum(w.values())
        for kk, vv in w.items(): G[kk].add([i], vv / tot, 'REPLACE')
    made.append((kind, len(comp), [tuple(round(c, 2) for c in q) for q in (pts[0], pts[-1])]))
print('APP', made)
def export(path):
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False)
export(out)
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
bpy.context.view_layer.objects.active = body; dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = min(1.0, 20000 / max(1, tris))
while body.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
bpy.ops.object.modifier_apply(modifier='dec'); export(out_low)
print('APP DONE')
