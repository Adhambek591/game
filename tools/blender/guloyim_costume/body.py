# Guloyim's real MetaHuman female body = fitting target + preview mannequin (never edited, never re-rigged).
# blender -b --factory-startup --python body.py   -> out/body.blend (object GUL_Body, rest/A-pose) + out/landmarks.json
import bpy, json, os
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
SRC = [r"F:\qirq-qiz-unity\Assets\QQ\Models\MH\MH_gulayim_FullBody.fbx",
       r"F:\qirq-qiz\tools\metahuman\out\gulayim_MHC_gulayim_clean_FullBody.fbx"]
SKIP = ('_in_', '_out_', 'bulge', 'half', 'side', 'palm', 'dip', 'pip', 'mcp', 'Cor', 'corrective', 'fwd', 'bck', 'slide')

bpy.ops.wm.read_factory_settings(use_empty=True)
src = None
for s in SRC:
    if not os.path.exists(s): continue
    bpy.ops.import_scene.fbx(filepath=s)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and len(o.data.vertices) > 20000]
    if meshes: src = s; break
    for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o)
assert src, 'no MetaHuman body mesh found'
arm = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE'][0]
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = sorted(meshes, key=lambda o: -len(o.data.vertices))[0]
for o in meshes:
    if o is not body: bpy.data.objects.remove(o)
mw = arm.matrix_world
L = {}
for b in arm.data.bones:
    if b.name.endswith(('_l', '_r')) and any(t in b.name for t in SKIP): continue
    L[b.name] = {'head': list(mw @ b.head_local), 'tail': list(mw @ b.tail_local)}
# rest pose: bake the world transform into the mesh (geometry unchanged), drop the armature
m = body.matrix_world.copy(); body.parent = None
for md in list(body.modifiers): body.modifiers.remove(md)
body.data.transform(m); body.matrix_world.identity()
bpy.data.objects.remove(arm)
for o in list(bpy.context.scene.objects):
    if o.type == 'EMPTY': bpy.data.objects.remove(o)
body.name = 'GUL_Body'; body.data.name = 'GUL_Body'
vs = [v.co for v in body.data.vertices]
json.dump({'bones': L, 'height': max(p.z for p in vs), 'source': src}, open(os.path.join(OUT, 'landmarks.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'body.blend'))
print('BODY', src, 'verts', len(vs), 'height', round(max(p.z for p in vs), 3))
