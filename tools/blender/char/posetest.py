# extreme-pose check of a rigged glb: arms up, deep lunge, knee up -> front + side renders in one sheet
import bpy, sys, math
from mathutils import Vector, Matrix, Quaternion
src, outp = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x, sc.render.resolution_y = 420, 760
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.82, .8, .78, 1)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.1
def rot(bone, axis, deg):
    pb = arm.pose.bones[bone]; bpy.context.view_layer.update()
    h = arm.matrix_world @ pb.head; q = Quaternion(axis, math.radians(deg))
    M = arm.matrix_world.inverted() @ (Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h)) @ arm.matrix_world
    pb.matrix = M @ pb.matrix; bpy.context.view_layer.update()
def reset():
    for pb in arm.pose.bones: pb.matrix_basis = Matrix()
    bpy.context.view_layer.update()
fwd = Vector((0, -1, 0)); rgt = Vector((1, 0, 0))
L = arm.pose.bones['LeftArm'].head.x  # sign of the character's left
sL = 1 if (arm.matrix_world @ arm.pose.bones['LeftArm'].head).x > 0 else -1
poses = {
  'arms_up': [('LeftArm', fwd, 70 * sL), ('RightArm', fwd, -70 * sL)],
  'lunge': [('LeftUpLeg', rgt, -75), ('LeftLeg', rgt, 85), ('RightUpLeg', rgt, 35), ('Spine02', rgt, -15)],
  'knee_up': [('RightUpLeg', rgt, -95), ('RightLeg', rgt, 100), ('LeftArm', fwd, 30 * sL)],
}
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
files = []
for name, ops in poses.items():
    reset()
    for b, ax, d in ops:
        if b in arm.pose.bones: rot(b, ax, d)
    for vi, a in enumerate((0, 90)):
        r = math.radians(a); d = Vector((math.sin(r), -math.cos(r), 0))
        cam.location = Vector((0, 0, .95)) + d * 6; cam.rotation_euler = (math.radians(90), 0, r)
        fp = outp + '_%s_%d.png' % (name, vi); sc.render.filepath = fp; bpy.ops.render.render(write_still=True); files.append(fp)
print('POSE', files)
