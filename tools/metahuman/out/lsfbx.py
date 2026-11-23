import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=sys.argv[-1])
for o in bpy.context.scene.objects:
    if o.type == 'MESH': print('LS', o.name, len(o.data.vertices), [m.name for m in o.data.materials][:6])
