import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=sys.argv[-1])
o = next(x for x in bpy.data.objects if x.name.endswith('_LOD0'))
mw = o.matrix_world
for i, s in enumerate(o.material_slots):
    ps = [p for p in o.data.polygons if p.material_index == i]
    if not ps: print('SL', i, s.material.name, 0); continue
    cs = [mw @ p.center for p in ps]
    area = sum(p.area for p in ps)
    print('SL', i, s.material.name, len(ps), 'area %.5f' % area, 'z %.3f..%.3f' % (min(c.z for c in cs), max(c.z for c in cs)), 'y %.3f..%.3f' % (min(c.y for c in cs), max(c.y for c in cs)), 'x %.3f..%.3f' % (min(c.x for c in cs), max(c.x for c in cs)))
