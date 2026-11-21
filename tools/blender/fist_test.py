# Pose the new finger bones into a fist and render a close-up of the right hand. Run: blender -b --python fist_test.py -- <in.glb> <png>
import bpy, math, sys
from mathutils import Vector
src, png = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
for side in ('Left', 'Right'):
    for n, ang in (('Fingers1', 80), ('Fingers2', 85)):
        pb = arm.pose.bones.get(side + n)
        if pb: pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(ang), 0, 0)
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
hand = arm.matrix_world @ arm.pose.bones['RightHand'].head
bpy.ops.object.light_add(type='SUN', rotation=(.8, .2, .5)); bpy.context.active_object.data.energy = 3
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
bpy.ops.object.camera_add(location=hand + Vector((.05, -.6, .1))); cam = bpy.context.active_object; sc.camera = cam
cam.rotation_euler = (hand - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 50
sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in sc.render.bl_rna.properties['engine'].enum_items] else 'CYCLES'
sc.render.resolution_x, sc.render.resolution_y = 800, 600; sc.render.filepath = png; bpy.ops.render.render(write_still=True); print('FIST DONE')
