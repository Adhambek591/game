# measure circumferences of a body mesh (proxy or the real MetaHuman FBX) -> prints cm
import bpy, sys, json, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LM = json.load(open(r"F:\qirq-qiz\tools\blender\surtaysha\out\landmarks.json"))['bones']
B = lambda n: Vector(LM[n]['head'])
ob = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith(args[0] if args else 'SUR_BodyProxy')][0]
V = [ob.matrix_world @ v.co for v in ob.data.vertices]
def hull_perim(pts2):
    pts = sorted(set((round(p[0], 4), round(p[1], 4)) for p in pts2))
    if len(pts) < 3: return 0
    def cr(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    h = lo[:-1] + up[:-1]
    return sum(math.dist(h[i], h[(i+1) % len(h)]) for i in range(len(h)))
def slice_circ(a, b, t, rmax):
    c = a.lerp(b, t); d = (b - a).normalized()
    x = d.orthogonal().normalized(); y = d.cross(x)
    pts = [((p - c).dot(x), (p - c).dot(y)) for p in V if abs((p - c).dot(d)) < 0.006 and ((p - c) - d * (p - c).dot(d)).length < rmax]
    return hull_perim(pts) * 100
def segd(p, a, b):
    d = b - a; t = max(0, min(1, (p - a).dot(d) / d.length_squared)); return (p - (a + d * t)).length
ARMS = [(B('upperarm_' + s), B('lowerarm_' + s)) for s in 'lr'] + [(B('lowerarm_' + s), B('hand_' + s)) for s in 'lr']
def zslice(z, xlim):
    pts = [(p.x, p.y) for p in V if abs(p.z - z) < 0.006 and abs(p.x) < xlim and all(segd(p, a, b) > 0.075 or abs(p.x) < 0.12 for a, b in ARMS)]
    return hull_perim(pts) * 100
print('MEAS upperarm_mid', round(slice_circ(B('upperarm_l'), B('lowerarm_l'), 0.45, 0.12), 1))
print('MEAS forearm_max', round(max(slice_circ(B('lowerarm_l'), B('hand_l'), t, 0.10) for t in (0.15, 0.22, 0.3)), 1))
print('MEAS neck', round(slice_circ(B('neck_01'), B('head'), 0.4, 0.12), 1))
for z in (1.25, 1.30, 1.35, 1.40):
    print('MEAS chest z', z, round(zslice(z, 0.30 if z < 1.38 else 0.26), 1))
print('MEAS waist z1.10', round(zslice(1.10, 0.3), 1))
sh = [p for p in V if abs(p.z - B('upperarm_l').z) < 0.025]
print('MEAS shoulder breadth (deltoids)', round((max(p.x for p in sh) - min(p.x for p in sh)) * 100, 1))
print('MEAS height', round(max(p.z for p in V) * 100, 1))
