# Body-through-costume check: which body vertices lie OUTSIDE the piece that should cover them, and by how much.
# blender -b out/armor_low.blend --python check_poke.py
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body = bpy.data.objects['SUR_BodyProxy']; BV = [body.matrix_world @ v.co for v in body.data.vertices]
def tree(names):
    vs = []; fs = []
    for n in names:
        o = bpy.data.objects.get(n)
        if not o: continue
        o.data.calc_loop_triangles(); b = len(vs); vs += [o.matrix_world @ v.co for v in o.data.vertices]
        fs += [tuple(b + i for i in t.vertices) for t in o.data.loop_triangles]
    return BVHTree.FromPolygons(vs, fs)
def report(tag, names, sel):
    t = tree(names); out = []
    for p in BV:
        if not sel(p): continue
        q, n, i, d = t.find_nearest(p)
        if q is None: continue
        s = (p - q).dot(n)
        if s > 0.0005: out.append((s, p))
    out.sort(key=lambda a: -a[0])
    print('POKE %-10s %5d body verts outside, max %.1f mm' % (tag, len(out), out[0][0] * 1000 if out else 0.0))
    for s, p in out[:6]: print('   %.1f mm at (%.3f, %.3f, %.3f)' % (s * 1000, p.x, p.y, p.z))
    if out:
        ys = [p.y for s, p in out]; zs = [p.z for s, p in out]; xs = [abs(p.x) for s, p in out]
        print('   region |x| %.3f..%.3f  y %.3f..%.3f  z %.3f..%.3f' % (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
bt = max((bpy.data.objects['SUR_Boot_L'].matrix_world @ v.co).z for v in bpy.data.objects['SUR_Boot_L'].data.vertices)
print('boot top z %.3f' % bt)
report('boot L', ['SUR_Boot_L', 'SUR_Boot_Sole_L'], lambda p: p.x > 0 and p.z < bt - 0.02)
report('boot R', ['SUR_Boot_R', 'SUR_Boot_Sole_R'], lambda p: p.x < 0 and p.z < bt - 0.02)
tr = bpy.data.objects.get('SUR_Trousers')
if tr:
    zs = [(tr.matrix_world @ v.co).z for v in tr.data.vertices]
    report('trousers', ['SUR_Trousers'], lambda p: min(zs) + 0.03 < p.z < max(zs) - 0.02 and abs(p.x) < 0.27)
