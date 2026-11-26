# Builds Surtaysha's armour + costume game meshes (low poly, UV'd) around the male proxy.
# blender -b --factory-startup --python build.py   -> out/armor_low.blend
import bpy, sys, math, random, importlib, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sk; importlib.reload(sk)
from sk import *
from mathutils import Vector, Matrix

ONLY = None
if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1:
    ONLY = sys.argv[sys.argv.index('--') + 1].split(',')

bpy.ops.wm.open_mainfile(filepath=OUT + r"\proxy.blend")
for o in list(bpy.data.objects):
    if o.name != 'SUR_BodyProxy': bpy.data.objects.remove(o)
proxy = bpy.data.objects['SUR_BodyProxy']
# The kit's design constants (boot height, radii, clearances) are written for the 185 cm body. The final body is the same
# shape at another size, so the pieces are built at design size and brought back to the real body at the end.
DESIGN_K = float(os.environ.get('SUR_DESIGN_K', '1.0'))
if DESIGN_K != 1.0:
    proxy.data.transform(Matrix.Scale(DESIGN_K, 4)); proxy.data.update()
    for _n in BONES: BONES[_n] = {e: [c * DESIGN_K for c in BONES[_n][e]] for e in BONES[_n]}
    print('DESIGN_K', DESIGN_K, 'pelvis', BONES['pelvis']['head'])

def mat(name, col, metal=0.0, rough=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*col, 1); m.metallic = metal; m.roughness = rough
    return m
M_LAM = mat('M_Lamellar', (0.25, 0.26, 0.28), 1, 0.4)
M_TRIM = mat('M_Trim', (0.20, 0.10, 0.05))
M_HELM = mat('M_Helmet', (0.75, 0.55, 0.2), 1, 0.3)
M_ARM = mat('M_Armor', (0.3, 0.3, 0.32), 1, 0.4)
M_CLOTH = mat('M_Cloth', (0.12, 0.08, 0.06))
M_WPN = mat('M_Weapon', (0.6, 0.6, 0.62), 1, 0.3)
M_PLUME = mat('M_Plume', (0.02, 0.02, 0.02))
rng = random.Random(7)
PLATES, LACES = plate_library()

# ------------------------------------------------------------------ torso surface
# (z, half-width a, front depth bf, back depth bb, exponent)
TORSO_V1 = [(1.08, 0.222, 0.183, 0.100, 2.5), (1.20, 0.232, 0.192, 0.115, 2.5), (1.32, 0.242, 0.193, 0.135, 2.6),
         (1.44, 0.232, 0.180, 0.150, 2.6), (1.52, 0.200, 0.140, 0.140, 2.4)]
import fit; importlib.reload(fit)
FIT = fit.Fit(proxy, BONES)
TORSO = FIT.hug(TORSO_V1, 0.016)          # cuirass ~1-1.5 cm over the chest
json.dump({'TORSO': TORSO, 'source': LM.get('source', 'standin')}, open(OUT + "/fit.json", 'w'), indent=1)
print('FIT TORSO', [tuple(round(x, 3) for x in r) for r in TORSO])
def torso_S(u, v, grow=0.0, tab=None):
    tab = tab or TORSO
    a, bf, bb, n = interp_table(tab, v)
    a += grow; bf += grow; bb += grow
    s, c = math.sin(u), math.cos(u)
    x = a * math.copysign(abs(s) ** (2 / n), s)
    y = -bf * abs(c) ** (2 / n) if c > 0 else bb * abs(c) ** (2 / n)
    return Vector((x, y, v))
axis_c = lambda p: Vector((0, 0, p.z))

parts = {}
import bmesh
NO_FIX = ('SUR_Helmet_Liner', 'SUR_Helmet_Plume')
def fix_normals(ob):
    """orient every connected component outward (signed area-weighted test about its centroid)"""
    if ob.name in NO_FIX: return
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
    seen = set(); flipped = 0
    for f0 in bm.faces:
        if f0.index in seen: continue
        comp = []; stack = [f0]; seen.add(f0.index)
        while stack:
            f = stack.pop(); comp.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen:
                        seen.add(g.index); stack.append(g)
        vs = {v for f in comp for v in f.verts}
        c = sum((v.co for v in vs), Vector()) / len(vs)
        score = sum(f.normal.dot(f.calc_center_median() - c) * f.calc_area() for f in comp)
        if score < 0:
            for f in comp: f.normal_flip()
            flipped += 1
    bm.to_mesh(ob.data); bm.free(); ob.data.update()
    if flipped: print('normals flipped', ob.name, flipped)

def done(ob, bone_name, group):
    ob['ue_follow_bone'] = bone_name; ob['ue_group'] = group
    parts[ob.name] = ob
    return ob

def want(n):
    return ONLY is None or n in ONLY

import build_parts; importlib.reload(build_parts); from build_parts import *
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pieces.py"), encoding="utf-8").read())
def _xw(names):
    xs = [ (o.matrix_world @ v.co).x for n in names for o in [bpy.data.objects.get(n)] if o for v in o.data.vertices]
    return (max(xs) - min(xs)) if xs else 0.0
_hw = _xw(['SUR_Helmet_Bowl']); _pw = _xw(['SUR_Pauldron_Lamellar_L', 'SUR_Pauldron_Lamellar_R', 'SUR_Pauldron_Trim_L', 'SUR_Pauldron_Trim_R'])
print('RATIO helmet %.3f m : pauldrons %.3f m = 1 : %.2f (turnaround ~1 : 2.6)' % (_hw, _pw, _pw / max(_hw, 1e-6)))
if DESIGN_K != 1.0:
    for _o in list(parts.values()) + [proxy]:
        _o.data.transform(Matrix.Scale(1.0 / DESIGN_K, 4)); _o.data.update()
bpy.ops.wm.save_as_mainfile(filepath=os.environ.get('SUR_OUT_BLEND') or OUT + r"\armor_low.blend")   # SUR_OUT_BLEND: partial test builds
for o in parts.values():
    me = o.data
    print('PART %-28s tris %6d  bone %s' % (o.name, sum(len(p.vertices) - 2 for p in me.polygons), o.get('ue_follow_bone')))
