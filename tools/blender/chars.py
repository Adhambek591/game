# Character pipeline for the Meshy-rigged models (26-bone rig, no fingers):
#   1. finger bones: two-segment chains per hand (<Side>Fingers1 at the knuckles, <Side>Fingers2 mid-finger), parented to the hand.
#      The hand's vertices past the knuckle plane are re-weighted to them with a smooth ramp, so Unity can curl a real fist round a grip.
#   2. LOD: a decimated copy (target ~18k triangles) for crowds on phones, same skeleton and weights.
# Run: blender -b --python chars.py -- <in.glb> <out.glb> <out_low.glb> <height_m>
import bpy, bmesh, math, sys
from mathutils import Vector

src, out, out_low, height = sys.argv[sys.argv.index('--') + 1:][:4]; height = float(height)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
S = height / 1.75

# world-space bone positions from the rest pose
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
added = {}
for side in ('Left', 'Right'):
    hand, fore = eb.get(side + 'Hand'), eb.get(side + 'ForeArm')
    if not hand or not fore: continue
    hw, fw = arm.matrix_world @ hand.head, arm.matrix_world @ fore.head
    d = (hw - fw).normalized()
    k1 = hw + d * .085 * S; k2 = k1 + d * .04 * S; tip = k2 + d * .045 * S
    inv = arm.matrix_world.inverted()
    b1 = eb.new(side + 'Fingers1'); b1.head = inv @ k1; b1.tail = inv @ k2; b1.parent = hand; b1.use_connect = False; b1.roll = hand.roll
    b2 = eb.new(side + 'Fingers2'); b2.head = inv @ k2; b2.tail = inv @ tip; b2.parent = b1; b2.use_connect = True; b2.roll = hand.roll
    added[side] = (k1, d)
bpy.ops.object.mode_set(mode='OBJECT')

# re-weight: vertices mostly bound to the hand, beyond the knuckle plane
mw = mesh.matrix_world; vg = mesh.vertex_groups
for side, (k1, d) in added.items():
    gh = vg.get(side + 'Hand');
    if not gh: continue
    g1 = vg.new(name=side + 'Fingers1'); g2 = vg.new(name=side + 'Fingers2'); L = .04 * S; moved = 0
    for v in mesh.data.vertices:
        w = 0
        for g in v.groups:
            if g.group == gh.index: w = g.weight
        if w < .35: continue
        t = (mw @ v.co - k1).dot(d)
        if t <= -.008 * S: continue
        ramp = min(1, max(0, (t + .008 * S) / (.02 * S)))
        f1 = w * ramp * (1 if t < L else max(0, 1 - (t - L) / (.012 * S)))
        f2 = w * ramp * (0 if t < L else min(1, (t - L) / (.012 * S)))
        gh.add([v.index], w - f1 - f2, 'REPLACE')
        if f1 > 0: g1.add([v.index], f1, 'REPLACE')
        if f2 > 0: g2.add([v.index], f2, 'REPLACE')
        moved += 1
    print('FINGERS', side, moved, 'verts')

def export(path):
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); mesh.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False)

export(out)
tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
ratio = min(1.0, 18000 / max(1, tris))
bpy.context.view_layer.objects.active = mesh
dm = mesh.modifiers.new('dec', 'DECIMATE'); dm.ratio = ratio
while mesh.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
bpy.ops.object.modifier_apply(modifier='dec')
export(out_low)
print('CHAR DONE', tris, '->', sum(len(p.vertices) - 2 for p in mesh.data.polygons))
