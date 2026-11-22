# Topology report for the author: tris per piece, non-quads, lamellar plate islands, cloth grid edge lengths, edge loops at joints.
# blender -b out/costume_low.blend --python check_topo.py
import bpy, bmesh, json, os, statistics
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HERE, 'out', 'landmarks.json')))['bones']
rep = {'pieces': {}, 'total_tris': 0}

def islands(bm):
    seen = set(); out = []
    for f0 in bm.faces:
        if f0.index in seen: continue
        st = [f0]; seen.add(f0.index); comp = []
        while st:
            f = st.pop(); comp.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen: seen.add(g.index); st.append(g)
        out.append(comp)
    return out

def loops_near(o, joint, axis, radius=0.06):
    """count distinct edge-loop rings of a tube crossing a +-radius window around a joint (by ring centre spacing)"""
    me = o.data
    vs = [o.matrix_world @ v.co for v in me.vertices]
    ts = sorted(set(round((p - joint).dot(axis), 3) for p in vs if abs((p - joint).dot(axis)) < radius and (p - joint - axis * (p - joint).dot(axis)).length < 0.15))
    return ts

for o in sorted([o for o in bpy.data.objects if o.type == 'MESH' and o.get('ue_group')], key=lambda o: o.name):
    me = o.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    nq = sum(1 for p in me.polygons if len(p.vertices) != 4)
    bm = bmesh.new(); bm.from_mesh(me)
    isl = islands(bm)
    d = {'tris': tris, 'non_quads': nq, 'islands': len(isl)}
    if 'Lamellar' in o.name:
        sizes = [len(c) for c in isl]
        plates = [c for c in isl if len(c) == 30]
        laces = [c for c in isl if len(c) == 8]
        d['plates'] = len(plates); d['laces'] = len(laces); d['other_islands'] = len(isl) - len(plates) - len(laces)
    if o.get('chaos_cloth'):
        L = [e.calc_length() for e in bm.edges]
        d['edge_cm'] = [round(min(L) * 100, 2), round(statistics.median(L) * 100, 2), round(max(L) * 100, 2)]
    bm.free()
    rep['pieces'][o.name] = d; rep['total_tris'] += tris
    print('TOPO %-30s tris %6d non-quads %d islands %5d %s' % (o.name, tris, nq, len(isl), {k: v for k, v in d.items() if k not in ('tris', 'non_quads', 'islands')}))
# edge loops across the joints (ring spacing in cm inside +-6 cm of the joint)
def ring_spacing(name, j0, j1):
    o = bpy.data.objects.get(name)
    if not o: return None
    a = Vector(B[j0]['head']); b = Vector(B[j1]['head']); ax = (b - a).normalized()
    me = o.data; vs = [o.matrix_world @ v.co for v in me.vertices]
    near = [p for p in vs if abs((p - a).dot(ax)) < 0.06]
    return len(near)
def ring_centres(o, n=24):
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    rows = []
    for k in range(0, len(vs) - n + 1, n):
        blk = vs[k:k + n]
        c = sum(blk, Vector()) / n
        if rows and (c - rows[-1]).length > 0.08: break       # left the front grid
        rows.append(c)
    return rows
for name, j in (('GUL_Sleeve_L', 'upperarm_l'), ('GUL_Sleeve_L', 'lowerarm_l'), ('GUL_Trousers_L', 'thigh_l'), ('GUL_Trousers_L', 'calf_l'),
                ('GUL_Tunic_Torso', 'pelvis')):
    o = bpy.data.objects[name]
    jp = Vector(B[j]['head'])
    rows = ring_centres(o, 64 if name == 'GUL_Tunic_Torso' else 24)
    near = [c for c in rows if (c - jp).length < 0.06 or (name == 'GUL_Tunic_Torso' and abs(c.z - jp.z) < 0.06)]
    sp = [round((rows[i + 1] - rows[i]).length * 100, 1) for i in range(len(rows) - 1)]
    print('LOOPS %-16s at %-11s edge loops within 6 cm: %d   ring spacing cm min/median/max %s' % (name, j, len(near), (min(sp), statistics.median(sp), max(sp))))
    rep.setdefault('joint_loops', {})['%s@%s' % (name, j)] = len(near)
json.dump(rep, open(os.path.join(HERE, 'out', 'topology_report.json'), 'w'), indent=1)
print('TOTAL TRIS', rep['total_tris'])
