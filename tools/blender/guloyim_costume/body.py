# Guloyim's real MetaHuman body = fitting target + preview mannequin (never edited, never re-rigged).
# blender -b --factory-startup --python body.py   -> out/body.blend (object GUL_Body, rest/A-pose) + out/landmarks.json
# Preferred: SK_Guloyim_BodyOnly.fbx (the body UE uses, no head) + the head/neck of SK_Guloyim_BodyDirect.fbx (same skeleton)
# so the scarf and band still have a head to sit on.
import bpy, bmesh, json, os
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
BODYONLY = os.path.join(HERE, "body", "SK_Guloyim_BodyOnly.fbx")
HEADSRC = os.path.join(HERE, "body", "SK_Guloyim_BodyDirect.fbx")
SRC = [os.path.join(HERE, "body", "SK_Guloyim_BodyDirect.fbx"),
       os.path.join(HERE, "body", "SK_Guloyim_Final_FullBody.fbx"),
       r"F:\qirq-qiz-unity\Assets\QQ\Models\MH\MH_gulayim_FullBody.fbx",
       r"F:\qirq-qiz\tools\metahuman\out\gulayim_MHC_gulayim_clean_FullBody.fbx"]
SKIP = ('_in_', '_out_', 'bulge', 'half', 'side', 'palm', 'dip', 'pip', 'mcp', 'Cor', 'corrective', 'fwd', 'bck', 'slide')

def load(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    meshes = [o for o in new if o.type == 'MESH']
    body = sorted(meshes, key=lambda o: -len(o.data.vertices))[0]
    for o in meshes:
        if o is not body: bpy.data.objects.remove(o)
    m = body.matrix_world.copy(); body.parent = None
    for md in list(body.modifiers): body.modifiers.remove(md)
    body.data.transform(m); body.matrix_world.identity()
    return arm, body, new

bpy.ops.wm.read_factory_settings(use_empty=True)
if os.path.exists(BODYONLY) and os.path.exists(HEADSRC):
    src = BODYONLY + ' + head of ' + os.path.basename(HEADSRC)
    arm, body, new1 = load(BODYONLY)
    arm2, head, new2 = load(HEADSRC)
    # keep only the head / neck of the second mesh (above the BodyOnly cut)
    zcut = max(v.co.z for v in body.data.vertices) - 0.004
    bm = bmesh.new(); bm.from_mesh(head.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < zcut], context='VERTS')
    bm.to_mesh(head.data); bm.free()
    bpy.context.view_layer.objects.active = body
    for o in bpy.context.view_layer.objects: o.select_set(False)
    body.select_set(True); head.select_set(True)
    bpy.ops.object.join()
else:
    src = None
    for s in SRC:
        if os.path.exists(s):
            arm, body, _ = load(s); src = s; break
    assert src, 'no MetaHuman body mesh found'
mw = arm.matrix_world
L = {}
for b in arm.data.bones:
    if b.name.endswith(('_l', '_r')) and any(t in b.name for t in SKIP): continue
    L[b.name] = {'head': list(mw @ b.head_local), 'tail': list(mw @ b.tail_local)}
for o in list(bpy.data.objects):
    if o is not body: bpy.data.objects.remove(o)
body.name = 'GUL_Body'; body.data.name = 'GUL_Body'
vs = [v.co for v in body.data.vertices]
json.dump({'bones': L, 'height': max(p.z for p in vs), 'source': src}, open(os.path.join(OUT, 'landmarks.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'body.blend'))
print('BODY', src, 'verts', len(vs), 'height', round(max(p.z for p in vs), 3))
