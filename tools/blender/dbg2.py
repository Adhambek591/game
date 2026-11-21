import bpy, sys
from mathutils import Vector
src = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
print('DBG arm mw rot', [round(x, 2) for x in arm.matrix_world.to_euler()])
for n in ('RightHand', 'RightIndex1', 'RightIndex2', 'RightThumb1'):
    b = arm.data.bones.get(n)
    if not b: print('DBG missing', n); continue
    m = arm.matrix_world.to_3x3() @ b.matrix_local.to_3x3()
    print('DBG', n, 'X', [round(v, 2) for v in m.col[0]], 'Y', [round(v, 2) for v in m.col[1]], 'Z', [round(v, 2) for v in m.col[2]])
lu = arm.matrix_world @ arm.data.bones['LeftUpLeg'].head_local; ru = arm.matrix_world @ arm.data.bones['RightUpLeg'].head_local
print('DBG legs L', [round(v, 2) for v in lu], 'R', [round(v, 2) for v in ru])
h = arm.matrix_world @ arm.data.bones['RightHand'].head_local; f = arm.matrix_world @ arm.data.bones['RightForeArm'].head_local
print('DBG hand', [round(v, 2) for v in h], 'fore', [round(v, 2) for v in f])
