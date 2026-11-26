import bpy, json
from mathutils import Vector
o = bpy.data.objects['SUR_BodyProxy']; me = o.data
L = json.load(open(r'F:\qirq-qiz\tools\blender\surtaysha_final\out\landmarks.json'))['bones']
gname = {g.index: g.name for g in o.vertex_groups}
OUTK = ('hand_', 'thumb', 'index', 'middle', 'ring', 'pinky', 'head', 'neck_02', 'FACIAL', 'thigh', 'calf', 'foot', 'ball', 'toe')
import collections
c = collections.Counter(); tors = 0
for v in me.vertices:
    p = v.co
    if 1.0 < p.z < 1.4 and abs(p.x) < 0.2:
        tors += 1
        for g in v.groups:
            n = gname.get(g.group, '?')
            if g.weight > 0.3 and any(k in n for k in OUTK): c[n] += 1
print('TORSO verts', tors, 'out-weighted groups', c.most_common(12))
# connectivity
import bmesh
bm = bmesh.new(); bm.from_mesh(me); seen = set(); comps = []
for v0 in bm.verts:
    if v0 in seen: continue
    st = [v0]; seen.add(v0); n = 0; zs = []
    while st:
        v = st.pop(); n += 1; zs.append(v.co.z)
        for e in v.link_edges:
            w = e.other_vert(v)
            if w not in seen: seen.add(w); st.append(w)
    comps.append((n, round(min(zs), 2), round(max(zs), 2)))
print('COMPONENTS', sorted(comps, reverse=True)[:8])
