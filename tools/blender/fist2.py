# Pose the 15-bone fingers open and as a fist; render the right hand for both. Run: blender -b --python fist2.py -- <in.glb> <png>
import bpy, math, sys
from mathutils import Vector
a_ = sys.argv[sys.argv.index("--") + 1:]; src, png = a_[:2]; SIGN = float(a_[2]) if len(a_) > 2 else -1
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
h = arm.matrix_world @ arm.data.bones['RightHand'].head_local; f = arm.matrix_world @ arm.data.bones['RightForeArm'].head_local; d = (h - f).normalized(); c = h + d * .08
bpy.ops.object.light_add(type='SUN', rotation=(.6, .3, .4)); bpy.context.active_object.data.energy = 3
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1
bpy.ops.object.camera_add(location=c + Vector((-.36, -.12, .06))); cam = bpy.context.active_object; sc.camera = cam
cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 55
sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in sc.render.bl_rna.properties['engine'].enum_items] else 'CYCLES'
sc.render.resolution_x, sc.render.resolution_y = 600, 500
def pose(k):
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
    for fn in ('Index', 'Middle', 'Ring', 'Pinky', 'Thumb'):
        for i, a in enumerate((70, 95, 70) if fn != 'Thumb' else (25, 35, 30)):
            pb = arm.pose.bones.get('Right' + fn + str(i + 1))
            if pb: pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(SIGN * a * k), 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
for k, tag in ((0, 'open'), (1, 'fist')):
    pose(k); sc.render.filepath = png.replace('.png', '_' + tag + '.png'); bpy.ops.render.render(write_still=True)
print('FIST2 DONE')
