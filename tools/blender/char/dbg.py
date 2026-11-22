import bpy, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
for o in bpy.context.scene.objects:
    if o.type != 'MESH': continue
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); m = e.to_mesh()
    zs = [ (o.matrix_world @ v.co) for v in m.vertices ]
    print('DBG', o.name, len(zs), 'z %.2f..%.2f' % (min(p.z for p in zs), max(p.z for p in zs)), 'x %.2f..%.2f' % (min(p.x for p in zs), max(p.x for p in zs)), 'mats', [s.material.name for s in o.material_slots])
