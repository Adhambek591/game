import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
for f in sys.argv[sys.argv.index('--') + 1:]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'ARMATURE':
            names = [b.name for b in o.data.bones]
            print('INS', f.split('/')[-1], 'ARM', o.name, len(names), 'scale', tuple(round(x, 3) for x in o.scale), 'rot', tuple(round(x, 3) for x in o.rotation_euler))
            print('INS bones', names)
        elif o.type == 'MESH':
            zs = [(o.matrix_world @ v.co).z for v in o.data.vertices]
            print('INS mesh', o.name, len(o.data.vertices), 'z %.3f..%.3f' % (min(zs), max(zs)), 'mats', [s.material.name if s.material else None for s in o.material_slots], 'uv', [u.name for u in o.data.uv_layers], 'vg', len(o.vertex_groups), 'parent', o.parent.name if o.parent else None)
