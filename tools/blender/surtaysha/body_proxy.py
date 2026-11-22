# Body for fitting Surtaysha's kit.
#  * If the real MetaHuman body exists (body/SK_Surtaysha_MHBody.fbx, exported from UE) it is used as is.
#  * Otherwise a burly ~185 cm stand-in is made from the MetaHuman skeleton/body: pose-scaled, then inflated
#    per bone region to the author's measurements (shoulders ~58 cm, upper arm ~45 cm round, forearm ~36,
#    neck ~48, chest ~125).
# Output: out/proxy.blend (object SUR_BodyProxy) and out/landmarks.json (bones, torso slices, source).
import bpy, json, os, math
from mathutils import Vector
OUT = r"F:\qirq-qiz\tools\blender\surtaysha\out"
REAL = r"F:\qirq-qiz\tools\blender\surtaysha\body\SK_Surtaysha_MHBody.fbx"
SKIP = ('_in_', '_out_', 'bulge', 'half', 'side', 'palm', 'dip', 'pip', 'mcp', 'Cor', 'corrective', 'fwd', 'bck', 'slide')

bpy.ops.wm.read_factory_settings(use_empty=True)
use_real = os.path.exists(REAL)
bpy.ops.import_scene.fbx(filepath=REAL if use_real else r"F:\qirq-qiz\tools\metahuman\out\gulayim_MHC_gulayim_clean_FullBody.fbx")
arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE'][0]
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
lod0 = [o for o in meshes if 'LOD0' in o.name] or sorted(meshes, key=lambda o: -len(o.data.vertices))[:1]
body = lod0[0]
for o in meshes:
    if o is not body: bpy.data.objects.remove(o)
B = arm.data.bones; P = arm.pose.bones

def chain_dir(n):
    b = B[n]
    if b.children:
        c = max(b.children, key=lambda c: (c.head_local - b.head_local).length if not any(t in c.name for t in ('twist', 'corrective', 'Cor', '_in', '_out', 'fwd', 'bck', 'latiss', 'pec', 'scap')) else 0)
        return (c.head_local - b.head_local).normalized()
    return (b.tail_local - b.head_local).normalized()
def S(n, along, a2, a3=None):
    if a3 is None: a3 = a2
    b = B[n]; d = chain_dir(n); M = b.matrix_local.to_3x3()
    axes = [M.col[i].normalized() for i in range(3)]
    li = max(range(3), key=lambda i: abs(axes[i].dot(d)))
    sc = [0, 0, 0]; others = [i for i in range(3) if i != li]
    sc[li] = along; sc[others[0]] = a2; sc[others[1]] = a3
    P[n].scale = sc

if not use_real:
    for n in ['neck_01', 'clavicle_l', 'clavicle_r', 'thigh_l', 'thigh_r']:
        B[n].inherit_scale = 'NONE'
    S('pelvis', 1.0, 1.04); S('spine_02', 1.0, 1.10); S('spine_03', 1.0, 1.10); S('spine_04', 1.02, 1.04)
    S('clavicle_l', 1.30, 1.0); S('clavicle_r', 1.30, 1.0)
    for s in 'lr':
        S('upperarm_' + s, 1.04, 1.30); S('lowerarm_' + s, 1.0, 1.08)
        S('thigh_' + s, 1.0, 1.20); S('calf_' + s, 1.0, 1.04); S('hand_' + s, 1.12, 1.12)
    S('neck_01', 1.0, 1.35); S('head', 1.04, 1.05)
bpy.context.view_layer.update()
bpy.context.view_layer.objects.active = body
for m in list(body.modifiers):
    if m.type == 'ARMATURE': bpy.ops.object.modifier_apply(modifier=m.name)
mw = arm.matrix_world
L = {}
for pb in P:
    if pb.name.endswith(('_l', '_r')) and any(t in pb.name for t in SKIP): continue
    L[pb.name] = {'head': list(mw @ pb.head), 'tail': list(mw @ pb.tail)}
# bake the world transform into the mesh, drop the armature
mwb = body.matrix_world.copy(); body.parent = None
body.data.transform(mwb); body.matrix_world.identity()
k = 1.0
if not use_real:
    h = max(v.co.z for v in body.data.vertices); k = 1.85 / h
    for v in body.data.vertices: v.co *= k
    for n in L: L[n] = {e: [c * k for c in L[n][e]] for e in L[n]}
Bv = lambda n: Vector(L[n]['head'])

def radial(p, a, b, f):
    d = (b - a); t = max(0.0, min(1.0, (p - a).dot(d) / d.length_squared)); c = a + d * t
    return (p - c) * (f - 1.0)

if not use_real:
    # ---- inflate to the burly target by bone region (weights blend the regions smoothly)
    vg = {g.index: g.name for g in body.vertex_groups}
    def region(name):
        s = name[-1] if name.endswith(('_l', '_r')) else ''
        if 'upperarm' in name: return 'UA' + s
        if 'lowerarm' in name or 'wrist' in name: return 'FA' + s
        if name.startswith(('hand', 'thumb', 'index', 'middle', 'ring', 'pinky')): return 'HD' + s
        if 'clavicle' in name and 'pec' not in name: return 'CL' + s
        if name.startswith('neck') : return 'NK'
        if name.startswith(('spine_04', 'spine_05')) or 'pec' in name: return 'CH'
        if name.startswith(('spine_01', 'spine_02', 'spine_03', 'pelvis')): return 'WA'
        if name.startswith('thigh'): return 'TH' + s
        if name.startswith(('calf', 'ankle')): return 'CA' + s
        return None
    F_UA, F_FA, F_HD, F_NK, F_TH, F_CA = 1.27, 1.07, 1.06, 1.12, 1.12, 1.07
    SHIFT = 0.028
    for v in body.data.vertices:
        p = v.co.copy(); acc = Vector(); shift = 0.0
        ws = {}
        for g in v.groups:
            r = region(vg.get(g.group, ''))
            if r: ws[r] = ws.get(r, 0.0) + g.weight
        tot = sum(ws.values())
        if tot <= 0: continue
        for r, w in ws.items():
            w /= tot; s = r[2:] if len(r) > 2 else ''
            if r.startswith('UA'): acc += radial(p, Bv('upperarm_' + s), Bv('lowerarm_' + s), F_UA) * w; shift += w
            elif r.startswith('FA'): acc += radial(p, Bv('lowerarm_' + s), Bv('hand_' + s), F_FA) * w; shift += w
            elif r.startswith('HD'): acc += (p - Bv('hand_' + s)) * (F_HD - 1) * w; shift += w
            elif r.startswith('CL'): shift += 0.6 * w; acc += Vector((0, 0, 0.012)) * w
            elif r == 'NK': acc += radial(p, Bv('neck_01'), Bv('head'), F_NK) * w
            elif r == 'CH':
                f = 1.0 + 0.17 * min(1.0, max(0.0, (p.z - 1.18) / 0.10))
                acc += Vector((p.x * (f - 1), (p.y + 0.03) * (f - 1) * 0.95, 0)) * w
            elif r == 'WA':
                f = 1.24 - 0.10 * min(1.0, max(0.0, (1.02 - p.z) / 0.10))
                acc += Vector((p.x * (f - 1), (p.y + 0.04) * (f - 1), 0)) * w
            elif r.startswith('TH'): acc += radial(p, Bv('thigh_' + s), Bv('calf_' + s), F_TH) * w
            elif r.startswith('CA'): acc += radial(p, Bv('calf_' + s), Bv('foot_' + s), F_CA) * w
        sx = 1 if p.x > 0 else -1
        v.co = p + acc + Vector((sx * SHIFT * min(shift, 1.0), 0, 0))
    for n in list(L):
        if any(n.startswith(t) for t in ('upperarm', 'lowerarm', 'hand', 'thumb', 'index', 'middle', 'ring', 'pinky')) and n.endswith(('_l', '_r')):
            sx = 1 if n.endswith('_l') else -1
            L[n] = {e: [c + (sx * SHIFT if i == 0 else 0) for i, c in enumerate(L[n][e])] for e in L[n]}
body.data.update()
body.name = 'SUR_BodyProxy'; body.data.name = 'SUR_BodyProxy'
bpy.data.objects.remove(arm)

# torso-only slices (arms excluded by distance to the arm bones)
def segd(p, a, b):
    d = b - a; t = max(0, min(1, (p - a).dot(d) / d.length_squared)); return (p - (a + d * t)).length
ARMS = [(Bv('upperarm_' + s), Bv('lowerarm_' + s)) for s in 'lr'] + [(Bv('lowerarm_' + s), Bv('hand_' + s)) for s in 'lr']
vs = [v.co.copy() for v in body.data.vertices]
sl = {}
for i in range(0, 200):
    z = i * 0.01
    tor = [p for p in vs if abs(p.z - z) < 0.006 and (z < 0.95 or all(segd(p, a, b) > 0.085 or abs(p.x) < 0.12 for a, b in ARMS))]
    if z > 0.6: tor = [p for p in tor if abs(p.x) < 0.34]
    if not tor: continue
    sl[round(z, 2)] = {'xmin': min(p.x for p in tor), 'xmax': max(p.x for p in tor), 'ymin': min(p.y for p in tor), 'ymax': max(p.y for p in tor)}
json.dump({'bones': L, 'slices': sl, 'height': max(p.z for p in vs), 'source': 'real' if use_real else 'standin'},
          open(os.path.join(OUT, 'landmarks.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'proxy.blend'))
print('PROXY source', 'real' if use_real else 'standin', 'height', round(max(p.z for p in vs), 3))
for z in (1.10, 1.20, 1.30, 1.40, 1.50):
    s = sl.get(round(z, 2)); print('SL', z, {k: round(v, 3) for k, v in s.items()} if s else None)
for n in ('upperarm_l', 'lowerarm_l', 'hand_l', 'neck_01', 'head'):
    print('LM', n, [round(c, 3) for c in L[n]['head']])
