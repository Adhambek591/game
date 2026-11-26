# torso slices of a proxy body with the same method as body_proxy.py -> json (used as the design reference)
import bpy, json, sys
from mathutils import Vector
lmf, outf = sys.argv[sys.argv.index('--') + 1:][:2]
L = json.load(open(lmf))['bones']; Bv = lambda n: Vector(L[n]['head'])
body = bpy.data.objects['SUR_BodyProxy']
def segd(p, a, b):
    d = b - a; t = max(0, min(1, (p - a).dot(d) / d.length_squared)); return (p - (a + d * t)).length
ARMS = [(Bv('upperarm_' + s), Bv('lowerarm_' + s)) for s in 'lr'] + [(Bv('lowerarm_' + s), Bv('hand_' + s)) for s in 'lr']
vs = [body.matrix_world @ v.co for v in body.data.vertices]
sl = {}
for i in range(60, 200):
    z = i * 0.01
    tor = [p for p in vs if abs(p.z - z) < 0.006 and (z < 0.95 or all(segd(p, a, b) > 0.085 or abs(p.x) < 0.12 for a, b in ARMS)) and abs(p.x) < 0.34]
    if tor: sl[round(z, 2)] = {'xmin': min(p.x for p in tor), 'xmax': max(p.x for p in tor), 'ymin': min(p.y for p in tor), 'ymax': max(p.y for p in tor)}
json.dump(sl, open(outf, 'w'), indent=0)
for z in (1.1, 1.2, 1.3, 1.4, 1.5, 1.57): print('REF', z, {k: round(v, 3) for k, v in sl[round(z, 2)].items()})
