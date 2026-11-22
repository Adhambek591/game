# front / side / back / 3-4 + face renders of any glb (to compare with the reference sheet)
import bpy, sys, math
from mathutils import Vector
src, outp = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.82, .80, .78, 1)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'
ms = [o for o in sc.objects if o.type == 'MESH' and not o.name.startswith('Icosphere')]
for o in sc.objects:
    if o.name.startswith('Icosphere'): o.hide_render = True
pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
c = (lo + hi) / 2; H = hi.z - lo.z; print('RG bbox', tuple(round(x, 3) for x in lo), tuple(round(x, 3) for x in hi))
cam.data.ortho_scale = H * 1.08; sc.render.resolution_x, sc.render.resolution_y = 520, 900
for i, ang in enumerate((0, 90, 180, 35)):
    a = math.radians(ang); d = Vector((math.sin(a), -math.cos(a), 0))
    cam.location = Vector((c.x, c.y, c.z)) + d * 6; cam.rotation_euler = (math.radians(90), 0, a)
    sc.render.filepath = outp + '_v%d.png' % i; bpy.ops.render.render(write_still=True)
cam.data.ortho_scale = H * .26; sc.render.resolution_x = sc.render.resolution_y = 600
cam.location = Vector((c.x, c.y - 6, hi.z - H * .1)); cam.rotation_euler = (math.radians(90), 0, 0)
sc.render.filepath = outp + '_face.png'; bpy.ops.render.render(write_still=True)
