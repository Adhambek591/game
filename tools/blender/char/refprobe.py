import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
for o in bpy.context.scene.objects:
    print('RP', o.name, o.type, len(o.data.vertices) if o.type == 'MESH' else '', [s.material.name for s in o.material_slots] if o.type == 'MESH' else '')
    if o.type == 'ARMATURE': print('RP bones', [b.name for b in o.data.bones][:40])
