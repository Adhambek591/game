# The right bracer was not built (the landmark file has a wrong hand_r joint): mirror the left one, baked UVs and all,
# inside the baked armor_low.blend. blender -b out/armor_low.blend --python mirror_bracers.py
import bpy, bmesh
from mathutils.bvhtree import BVHTree
k = bpy.data.objects['SUR_Robe_Torso']; k.data.calc_loop_triangles(); kt = BVHTree.FromPolygons([v.co.copy() for v in k.data.vertices], [tuple(t.vertices) for t in k.data.loop_triangles])
for n in ('SUR_Bracer', 'SUR_Bracer_Gold', 'SUR_Bracer_Straps'):
    o = bpy.data.objects[n]
    if any(v.co.x < 0 for v in o.data.vertices): print('MIRROR', n, 'already two-sided'); continue
    bm = bmesh.new(); bm.from_mesh(o.data); r = bmesh.ops.duplicate(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:])
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]; nf = [g for g in r['geom'] if isinstance(g, bmesh.types.BMFace)]
    for v in nv: v.co.x = -v.co.x
    bmesh.ops.reverse_faces(bm, faces=nf); bm.to_mesh(o.data); bm.free()
    d = [(v.co - kt.find_nearest(v.co)[0]).dot(kt.find_nearest(v.co)[1]) for v in o.data.vertices if v.co.x < 0]
    print('MIRROR', n, 'verts now', len(o.data.vertices), 'right side signed distance to the kaftan sleeve min %.1f mm max %.1f mm' % (min(d) * 1000, max(d) * 1000))
bpy.ops.wm.save_mainfile()
