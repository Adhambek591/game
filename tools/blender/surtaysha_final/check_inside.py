# Robust cover test for the trousers: a body vertex is covered if a sideways ray (away from the midline) crosses the
# trouser surface an odd number of times. blender -b out/armor_low.blend --python check_inside.py
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body = bpy.data.objects['SUR_BodyProxy']; BV = [body.matrix_world @ v.co for v in body.data.vertices]
tr = bpy.data.objects['SUR_Trousers']; tr.data.calc_loop_triangles()
t = BVHTree.FromPolygons([tr.matrix_world @ v.co for v in tr.data.vertices], [tuple(l.vertices) for l in tr.data.loop_triangles])
zs = [(tr.matrix_world @ v.co).z for v in tr.data.vertices]; z0, z1 = min(zs) + 0.03, max(zs) - 0.03
bad = []
for p in BV:
    if not (z0 < p.z < z1 and abs(p.x) < 0.27): continue
    d = Vector((1 if p.x >= 0 else -1, 0, 0)); o = p.copy(); n = 0
    while True:
        h = t.ray_cast(o, d, 2.0)
        if h[0] is None: break
        n += 1; o = h[0] + d * 1e-5
    if n % 2 == 0: bad.append(p)
print('UNCOVERED body verts: %d of the leg/seat region' % len(bad))
if bad:
    print('  z %.3f..%.3f  |x| %.3f..%.3f  y %.3f..%.3f' % (min(p.z for p in bad), max(p.z for p in bad), min(abs(p.x) for p in bad), max(abs(p.x) for p in bad), min(p.y for p in bad), max(p.y for p in bad)))
    import collections
    c = collections.Counter(round(p.z, 1) for p in bad); print('  by height', sorted(c.items()))
