# Grey-clay front/side stills of a MetaHuman FBX: blender -b --python render_clay.py -- <fbx> <out_prefix>
import bpy, sys, math
fbx, pre = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=fbx)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in ms:
    if '_LOD' in o.name and not o.name.endswith('LOD0'): bpy.data.objects.remove(o, do_unlink=True)
ms = [o for o in bpy.context.scene.objects if o.type == 'MESH']
mat = bpy.data.materials.new('clay'); mat.use_nodes = True; mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.6, 0.6, 0.6, 1); mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
for o in ms:
    o.data.materials.clear(); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
zs = [(o.matrix_world @ v.co).z for o in ms for v in o.data.vertices]; top = max(zs); print('HEIGHT', round(top - min(zs), 3))
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
sc.render.resolution_x = 900; sc.render.resolution_y = 1200
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.75, 0.77, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.35
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun); sun.data.energy = 4.5; sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = top * 1.12
for nm, loc, rot in (('old', (0, -6, top / 2), (math.pi / 2, 0, 0)), ('yon', (6, 0, top / 2), (math.pi / 2, 0, math.pi / 2))):
    cam.location = loc; cam.rotation_euler = rot; sc.render.filepath = f'{pre}_{nm}.png'; bpy.ops.render.render(write_still=True)
