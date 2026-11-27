# Wolf-headed soldier: R_askar body (head + helmet removed) + R_bori wolf head with its fur mane, one skinned mesh on the R_askar armature.
# Two material slots (askar atlas for the body, bori atlas for the head) = one glTF mesh with two primitives on one skin, so the
# soldier colour variants (props/var/askar_*.jpg) still fit the body UVs and the wolf variants (bori_*.jpg) still fit the head UVs.
# Run:  blender -b --factory-startup --python build.py -- [scale] [dz] [dy] [tilt_deg] [noexport]
import bpy, bmesh, os, sys, math
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); import rlib
M = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'models'))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
num = [a for a in argv if a.replace('.', '', 1).replace('-', '', 1).isdigit()]
S = float(num[0]) if len(num) > 0 else 0.62      # wolf head scale (bori head of a 2.0 m brute -> 1.75 m soldier)
DZ = float(num[1]) if len(num) > 1 else -0.015     # extra lift (m)
DY = float(num[2]) if len(num) > 2 else 0.02     # extra shift along Y (m, model faces -Y)
TILT = float(num[3]) if len(num) > 3 else 6.0   # pitch the snout up (+) / down (-) about the head joint (deg)
KEEPW = float(os.environ.get("KEEPW", "0.12"))                                    # min head-joint weight for a wolf vertex to be kept (head + mane)
NOEXP = 'noexport' in argv
HEADB = {"Head", "head_end", "headfront"}; WOLFB = set(os.environ.get("WOLFB", "Head,head_end,headfront").split(","))

bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(f):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.path.join(M, f + '.glb'))
    for o in [o for o in bpy.data.objects if o not in before]:
        if o.type == 'MESH' and not o.vertex_groups: bpy.data.objects.remove(o)
    new = [o for o in bpy.data.objects if o not in before]
    return next(o for o in new if o.type == 'ARMATURE'), next(o for o in new if o.type == 'MESH')
aA, aM = imp('R_askar'); aA.name = 'Armature'; aM.name = 'char1'
bA, bM = imp('R_bori')
def headw(v, gi, B=HEADB): return sum(g.weight for g in v.groups if gi.get(g.group) in B)

# ---- 1. soldier: remove head + modelled helmet = vertices mostly skinned to the head joints
gi = {g.index: g.name for g in aM.vertex_groups}
bm = bmesh.new(); bm.from_mesh(aM.data); bm.verts.ensure_lookup_table()
kill = [bm.verts[v.index] for v in aM.data.vertices if headw(v, gi) >= 0.5]
print('askar head verts removed', len(kill))
bmesh.ops.delete(bm, geom=kill, context='VERTS'); bm.to_mesh(aM.data); bm.free()

# ---- 2. wolf: keep the head incl. the mane that is skinned to it
gi2 = {g.index: g.name for g in bM.vertex_groups}
bm = bmesh.new(); bm.from_mesh(bM.data); bm.verts.ensure_lookup_table()
keep = {v.index for v in bM.data.vertices if headw(v, gi2, WOLFB) >= KEEPW}
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in range(len(bm.verts)) if i not in keep], context='VERTS')
bm.verts.ensure_lookup_table(); seen = set(); isl = []
for v in bm.verts:
    if v in seen: continue
    st = [v]; comp = []; seen.add(v)
    while st:
        x = st.pop(); comp.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y not in seen: seen.add(y); st.append(y)
    isl.append(comp)
isl.sort(key=len, reverse=True); print('wolf islands', [len(c) for c in isl[:12]])
bmesh.ops.delete(bm, geom=[v for c in isl if len(c) < 12 for v in c], context='VERTS'); bm.to_mesh(bM.data); bm.free()
print('wolf head verts', len(bM.data.vertices))

# ---- 3. place: bori Head joint -> askar Head joint, uniform scale, optional pitch (all in world space)
def jw(arm, n): return arm.matrix_world @ arm.data.bones[n].head_local
pB, pA = jw(bA, 'Head'), jw(aA, 'Head')
R = Matrix.Rotation(math.radians(-TILT), 4, 'X')
T = Matrix.Translation(pA + Vector((0, DY, DZ))) @ R @ Matrix.Scale(S, 4) @ Matrix.Translation(-pB)
mwB = bM.matrix_world.copy(); invA = aM.matrix_world.inverted()
for v in bM.data.vertices: v.co = invA @ (T @ (mwB @ v.co))   # into the askar mesh's local space
bM.parent = aA; bM.matrix_world = aM.matrix_world.copy()
mod = next((m for m in bM.modifiers if m.type == 'ARMATURE'), None) or bM.modifiers.new('Armature', 'ARMATURE'); mod.object = aA
bpy.data.objects.remove(bA)
for o in bpy.data.objects: o.select_set(False)
bpy.context.view_layer.objects.active = aM; aM.select_set(True); bM.select_set(True); bpy.ops.object.join()
aM.data.materials[0].name = 'soldier'; aM.data.materials[1].name = 'wolfhead'; aM.data.name = 'Mesh_0'
print('joined verts', len(aM.data.vertices), 'mats', [m.name for m in aM.data.materials], 'groups', [g.name for g in aM.vertex_groups])

# ---- 4. check renders
rlib.setup((800, 1100)); O = HERE; hz = pA.z
rlib.shot(os.path.join(O, 'check_front.png'), (0, 0, .9), 4.2, 0, 4)
rlib.shot(os.path.join(O, 'check_side.png'), (0, 0, .9), 4.2, 90, 4)
rlib.shot(os.path.join(O, 'check_back.png'), (0, 0, .9), 4.2, 180, 4)
rlib.shot(os.path.join(O, 'check_close.png'), (0, -.05, hz + .05), 1.15, 35, 6)
rlib.shot(os.path.join(O, 'check_close_side.png'), (0, -.05, hz + .05), 1.15, 90, 2)
rlib.shot(os.path.join(O, 'check_close_back.png'), (0, -.05, hz + .02), 1.15, 160, 10)
rlib.shot(os.path.join(O, 'check_close_low.png'), (0, -.05, hz), 1.0, -25, -15)
rlib.shot(os.path.join(O, 'check_top.png'), (0, 0, hz - .1), 1.6, 20, 60)
if not NOEXP:
    for o in bpy.data.objects: o.select_set(o in (aA, aM))
    bpy.ops.export_scene.gltf(filepath=os.path.join(M, 'R_boriaskar.glb'), export_format='GLB', use_selection=True, export_animations=False,
        export_skins=True, export_image_format='JPEG', export_image_quality=88, export_yup=True, export_apply=False, export_morph=False)
    print('exported')
