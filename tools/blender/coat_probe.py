# Probe: radial distance of vertices from the thigh axes per height slice (coat shell vs trousers), and dark (hair) vertices.
import bpy, sys
from mathutils import Vector
from mathutils.geometry import intersect_point_line
src = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE'); body = max([o for o in bpy.context.scene.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
B = arm.data.bones
def hw(n): return arm.matrix_world @ B[n].head_local
hip = hw('Hips'); lt, rt, lk, rk = hw('LeftUpLeg'), hw('RightUpLeg'), hw('LeftLeg'), hw('RightLeg'); lf = hw('LeftFoot')
print('Z hips', round(hip.z, 3), 'thigh', round(lt.z, 3), 'knee', round(lk.z, 3), 'ankle', round(lf.z, 3), 'head', round(hw('Head').z, 3))
def dseg(p, a, b):
    t = max(0, min(1, (p - a).dot(b - a) / (b - a).length_squared)); return (p - (a + (b - a) * t)).length
mw = body.matrix_world; vs = [mw @ v.co for v in body.data.vertices]
for frac in (0.95, .8, .65, .5, .35, .2, .05, -.1, -.25):
    z = lk.z + (lt.z - lk.z) * frac
    ds = sorted(min(dseg(p, lt, lk), dseg(p, rt, rk)) for p in vs if abs(p.z - z) < .012)
    if not ds: continue
    n = len(ds); hist = [0] * 16
    for d in ds: hist[min(15, int(d / .01))] += 1
    print('slice frac %.2f z %.3f n %d  hist(1cm bins) %s' % (frac, z, n, hist))
print('PROBE DONE')
