import bpy, sys
from mathutils import Vector
src = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); body = max([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
B = arm.data.bones
def hw(n): return arm.matrix_world @ B[n].head_local
LT, RT, LK, RK, LF, RF, hip = hw('LeftUpLeg'), hw('RightUpLeg'), hw('LeftLeg'), hw('RightLeg'), hw('LeftFoot'), hw('RightFoot'), hw('Hips')
up = Vector((0, 0, 1)); rgt = RT - LT; rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt)
def dseg(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); return (p - (a + ab * t)).length
def legdist(p): return min(dseg(p, LT, LK), dseg(p, LK, LF), dseg(p, RT, RK), dseg(p, RK, RF))
P = [body.matrix_world @ v.co for v in body.data.vertices]
print('Z hip %.3f thigh %.3f knee %.3f ankle %.3f' % (hip.z, LT.z, LK.z, LF.z))
z = LT.z
while z > LF.z:
    sl = [p for p in P if abs(p.z - z) < .006]
    if sl:
        ds = sorted(legdist(p) for p in sl); w = max(abs((p - hip).dot(rgt)) for p in sl); dep = max((p - hip).dot(fwd) for p in sl) - min((p - hip).dot(fwd) for p in sl)
        print('z %.2f n %4d min %.3f med %.3f frac<.075 %.2f halfwidth %.3f depth %.3f' % (z, len(sl), ds[0], ds[len(ds)//2], sum(1 for d in ds if d < .075)/len(ds), w, dep))
    z -= .02
