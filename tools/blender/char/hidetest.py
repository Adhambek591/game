import bpy, sys, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=sys.argv[-2])
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 400, 700
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.8, .8, .8, 1)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.0
cam.location = (0, 6 if 'BACK' in sys.argv[-1] else -6, 0.75); cam.rotation_euler = (math.radians(90), 0, math.radians(180) if 'BACK' in sys.argv[-1] else 0); cam.data.ortho_scale = 1.3
names = sys.argv[-1].split(',')
for o in sc.objects:
    if o.type == 'MESH' and any(o.name.startswith(n) for n in names): o.hide_render = True
print('HT', [o.name for o in sc.objects if o.type == 'MESH'])
sc.render.filepath = sys.argv[-2][:-4] + '_hide.png'; bpy.ops.render.render(write_still=True)
