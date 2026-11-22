# Probe the MetaHuman female body FBX: objects, mesh sizes, armature, key bones, torso slices.
# blender -b --factory-startup --python probe_body.py -- <fbx>
import bpy, sys
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
fbx = args[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
for o in bpy.context.scene.objects:
    extra = ''
    if o.type == 'MESH':
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        extra = 'verts %d polys %d  zmin %.3f zmax %.3f xmax %.3f mods %s vg %d' % (
            len(vs), len(o.data.polygons), min(v.z for v in vs), max(v.z for v in vs), max(abs(v.x) for v in vs),
            [m.type for m in o.modifiers], len(o.vertex_groups))
    if o.type == 'ARMATURE':
        extra = 'bones %d' % len(o.data.bones)
    print('OBJ', o.type, o.name, extra)
arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
if arm:
    arm = arm[0]; mw = arm.matrix_world
    for b in ['pelvis', 'spine_01', 'spine_03', 'spine_05', 'neck_01', 'head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l',
              'thigh_l', 'calf_l', 'foot_l', 'ball_l']:
        if b in arm.data.bones:
            pb = arm.data.bones[b]
            print('B %-12s %s' % (b, tuple(round(v, 3) for v in mw @ pb.head_local)))
