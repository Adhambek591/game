# Builds Guloyim's costume + armour game meshes (low poly, quads, UV'd) fitted to her real MetaHuman body.
# blender -b --factory-startup --python build.py [-- piece,piece]   -> out/costume_low.blend
import bpy, bmesh, sys, math, random, importlib, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gsk; importlib.reload(gsk)
from gsk import *
import gfit; importlib.reload(gfit)
from mathutils import Vector, Matrix

ONLY = None
if '--' in sys.argv and len(sys.argv) > sys.argv.index('--') + 1:
    ONLY = sys.argv[sys.argv.index('--') + 1].split(',')

bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'body.blend'))
body = bpy.data.objects['GUL_Body']
FIT = gfit.BodyFit(body)

def mat(name, col, metal=0.0, rough=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*col, 1); m.metallic = metal; m.roughness = rough
    return m
M_LAM = mat('M_Lamellar', (0.25, 0.26, 0.28), 1, 0.4)
M_TRIM = mat('M_Trim', (0.20, 0.10, 0.05))
M_ARM = mat('M_Armor', (0.3, 0.3, 0.32), 1, 0.4)
M_CLOTH = mat('M_Cloth', (0.05, 0.08, 0.35))
M_JEWEL = mat('M_Jewel', (0.7, 0.7, 0.72), 1, 0.3)
M_WPN = mat('M_Weapon', (0.6, 0.6, 0.62), 1, 0.3)
M_AMU = mat('M_Amulet', (0.9, 0.7, 0.3), 1, 0.25)
rng = random.Random(7)
PLATES, LACES = plate_library()

parts = {}
def done(ob, bone_name, group):
    ob['ue_follow_bone'] = bone_name; ob['ue_group'] = group
    parts[ob.name] = ob
    return ob

def want(n):
    return ONLY is None or n in ONLY

def recalc_normals(ob):
    """consistent outward winding per connected part (closed solids); open sheets keep their built orientation"""
    if ob.get('sheet'): return
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

exec(open(os.path.join(HERE, "pieces.py"), encoding="utf-8").read())
for o in parts.values():
    recalc_normals(o)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'costume_low.blend'))
tot = 0
for o in sorted(parts.values(), key=lambda o: o.name):
    me = o.data
    t = sum(len(p.vertices) - 2 for p in me.polygons); tot += t
    ng = sum(1 for p in me.polygons if len(p.vertices) != 4)
    print('PART %-30s tris %6d  non-quads %d  bone %s' % (o.name, t, ng, o.get('ue_follow_bone')))
print('TOTAL TRIS', tot)
