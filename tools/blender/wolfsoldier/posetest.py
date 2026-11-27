# re-import the exported R_boriaskar.glb and bend neck/head/arms to check that the wolf head follows its joints and the collar does not tear
import bpy, os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); import rlib
M = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'models'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(M, 'R_boriaskar.glb'))
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not o.vertex_groups: bpy.data.objects.remove(o)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); P = arm.pose.bones
def rot(n, x=0, y=0, z=0):
    b = P[n]; b.rotation_mode = 'XYZ'; b.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
rot('neck', 15, 20, 0); rot('Head', -10, 25, 8); rot('LeftArm', 0, 0, -50); rot('RightArm', 0, 0, 50); rot('Spine', 10, 0, 0)
bpy.context.view_layer.update()
rlib.setup((800, 1000))
rlib.shot(os.path.join(HERE, 'check_pose_close.png'), (0, 0, 1.45), 1.3, 30, 8)
rlib.shot(os.path.join(HERE, 'check_pose_side.png'), (0, 0, 1.45), 1.3, 100, 5)
rlib.shot(os.path.join(HERE, 'check_pose_full.png'), (0, 0, .9), 4.2, 25, 6)
