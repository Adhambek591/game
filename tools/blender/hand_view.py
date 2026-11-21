# Render the right hand of a rigged model in its bind pose from the palm side and the back, to see whether fingers are separate.
# Run: blender -b --python hand_view.py -- <in.glb> <png>
import bpy, sys
from mathutils import Vector
src, png = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
h = arm.matrix_world @ arm.data.bones['RightHand'].head_local; f = arm.matrix_world @ arm.data.bones['RightForeArm'].head_local
d = (h - f).normalized(); c = h + d * .07
bpy.ops.object.light_add(type='SUN', rotation=(.6, .3, .4)); bpy.context.active_object.data.energy = 3
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
bpy.ops.object.camera_add(location=c + Vector((0, -.32, .02))); cam = bpy.context.active_object; sc.camera = cam
cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 60
sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in sc.render.bl_rna.properties['engine'].enum_items] else 'CYCLES'
sc.render.resolution_x, sc.render.resolution_y = 700, 500; sc.render.filepath = png; bpy.ops.render.render(write_still=True)
cam.location = c + Vector((0, 0, .32)); cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = png.replace('.png', '_top.png'); bpy.ops.render.render(write_still=True); print('HAND DONE')
