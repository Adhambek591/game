# find vertices that move absurdly far in the leg pose (bad weights) and report their groups
import bpy, sys, math
from mathutils import Vector, Matrix
src = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); body = max([o for o in sc.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
dg = bpy.context.evaluated_depsgraph_get()
def coords():
    e = body.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = e.to_mesh(); r = [body.matrix_world @ v.co for v in m.vertices]; e.to_mesh_clear(); return r
a = coords()
pb = arm.pose.bones['LeftLeg']; pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(60), 0, 0)
pb2 = arm.pose.bones['LeftUpLeg']; pb2.rotation_mode = 'XYZ'; pb2.rotation_euler = (math.radians(-60), 0, 0)
bpy.context.view_layer.update(); b = coords()
lk = arm.matrix_world @ arm.pose.bones['LeftLeg'].head
far = []
for i, (p, q) in enumerate(zip(a, b)):
    v = body.data.vertices[i]; lw = sum(g.weight for g in v.groups if body.vertex_groups[g.group].name.startswith('Left') and ('Leg' in body.vertex_groups[g.group].name or 'Foot' in body.vertex_groups[g.group].name or 'Toe' in body.vertex_groups[g.group].name))
    if (q - p).length > .15 and lw < .6: far.append(i)
print('SPIKE count', len(far), 'of', len(a))
from collections import Counter
cnt = Counter()
for i in far[:4000]:
    v = body.data.vertices[i]
    key = tuple(sorted((body.vertex_groups[g.group].name, round(g.weight, 2)) for g in v.groups if g.weight > .01))
    cnt[key] += 1
for k, c in cnt.most_common(8): print('SPIKE', c, k)
for i in far[:5]: print('SPIKE v', i, [round(x, 3) for x in a[i]], '->', [round(x, 3) for x in b[i]])
