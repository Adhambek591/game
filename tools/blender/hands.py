# Replace the fused "mitten" hands of a Meshy-rigged character with real five-finger hands and a 15-bone finger rig per hand.
#   1. build a hand mesh in a canonical frame (wrist at origin, fingers +Y, back of hand +Z, thumb -X for the right hand):
#      palm block + capsule phalanges, fused with a voxel remesh and smoothed, then decimated to a game budget;
#   2. finger bones <Side><Finger><1..3> (Thumb, Index, Middle, Ring, Pinky) parented to <Side>Hand, rolled so local Z = back of hand;
#   3. weights: each new vertex to its nearest one or two bone segments (palm -> Hand), smooth inverse-distance blend;
#   4. fit to the character: wrist at the hand bone, fingers along forearm->hand, thumb toward the character's front, length matched
#      to the old hand; old hand faces deleted (the seam sits inside the cuff), skin colour sampled from the old hand's texture;
#   5. export full mesh and an ~18k-triangle LOD with the same skeleton.
# Run: blender -b --python hands.py -- <in.glb> <out.glb> <out_low.glb>
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

src, out, out_low = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); body = next(o for o in sc.objects if o.type == 'MESH')

# ---------------- canonical right hand (metres, hand length wrist->middle tip = 0.19) ----------------
FING = {  # knuckle (x, y), segment lengths, radius at base
    'Index':  ((-.030, .094), (.042, .026, .022), .0098),
    'Middle': ((-.009, .098), (.046, .029, .024), .0102),
    'Ring':   ((.012, .094), (.043, .027, .022), .0096),
    'Pinky':  ((.031, .084), (.033, .021, .019), .0086),
}
THUMB = [Vector((-.020, .022, -.010)), Vector((-.040, .046, -.014)), Vector((-.050, .068, -.012)), Vector((-.056, .088, -.009))]
def chains():
    ch = {}
    for n, ((x, y), L, r) in FING.items():
        p = [Vector((x, y, 0))]; sp = .0 if n != 'Pinky' else .004
        for i, l in enumerate(L): p.append(p[-1] + Vector((sp * (i + 1) * .4, l, -.002 * i)))
        ch[n] = (p, r)
    ch['Thumb'] = (THUMB, .0115)
    return ch

def capsule(a, b, r0, r1, seg=10):
    objs = []
    d = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r0, radius2=r1, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y'); objs.append(o)
    for p, r in ((a, r0), (b, r1)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=p, segments=seg, ring_count=6); objs.append(bpy.context.active_object)
    return objs

def build_hand():
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(.0, .05, -.002)); palm = bpy.context.active_object; palm.scale = (.078, .092, .026)
    bev = palm.modifiers.new('b', 'BEVEL'); bev.width = .009; bev.segments = 3; parts.append(palm)
    parts += capsule(Vector((0, -.03, 0)), Vector((0, .012, 0)), .026, .028, 12)          # wrist stub (goes into the cuff)
    for n, (p, r) in chains().items():
        rr = [r, r * .93, r * .86, r * .78]
        for i in range(3): parts += capsule(p[i], p[i + 1], rr[i], rr[i + 1])
    for o in parts:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); bpy.ops.object.join()
    h = bpy.context.active_object
    rm = h.modifiers.new('r', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .0022; bpy.ops.object.modifier_apply(modifier='r')
    sm = h.modifiers.new('s', 'SMOOTH'); sm.factor = .6; sm.iterations = 6; bpy.ops.object.modifier_apply(modifier='s')
    dc = h.modifiers.new('d', 'DECIMATE'); dc.ratio = min(1, 3200 / max(1, len(h.data.polygons))); bpy.ops.object.modifier_apply(modifier='d')
    for p in h.data.polygons: p.use_smooth = True
    return h

# ---------------- rest-pose data from the character ----------------
def bone_head(n): return arm.matrix_world @ arm.data.bones[n].head_local
up = Vector((0, 0, 1))
right_axis = (bone_head('RightUpLeg') - bone_head('LeftUpLeg')); right_axis.z = 0; right_axis.normalize()
forward = up.cross(right_axis).normalized()   # facing -Y with the right side on -X gives forward = up x right

# skin colour + old hand extent, from the body mesh
img = None
for m in body.data.materials:
    for n in (m.node_tree.nodes if m and m.use_nodes else []):
        if n.type == 'TEX_IMAGE' and n.image and 'base' in n.label.lower() + n.name.lower() + n.image.name.lower(): img = n.image
if img is None:
    for m in body.data.materials:
        for n in (m.node_tree.nodes if m and m.use_nodes else []):
            if n.type == 'TEX_IMAGE' and n.image and img is None: img = n.image
pix = list(img.pixels[:]) if img else None; W, H = (img.size[0], img.size[1]) if img else (0, 0)
def srgb2lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

mw = body.matrix_world; vg = body.vertex_groups; uv = body.data.uv_layers.active.data if body.data.uv_layers else None
results = {}
for side in ('Right', 'Left'):
    g = vg.get(side + 'Hand'); wrist = bone_head(side + 'Hand'); d = (wrist - bone_head(side + 'ForeArm')).normalized()
    thumb = (forward - d * forward.dot(d)).normalized()
    dorsal = d.cross(thumb) if side == 'Right' else thumb.cross(d)
    hv = set(); tmax = 0
    for v in body.data.vertices:
        w = next((x.weight for x in v.groups if x.group == g.index), 0)
        if w >= .5:
            t = (mw @ v.co - wrist).dot(d)
            if t > .004: hv.add(v.index); tmax = max(tmax, t)
    cols = [0, 0, 0, 0]
    if pix and uv:
        for poly in body.data.polygons:
            for li in poly.loop_indices:
                if body.data.loops[li].vertex_index in hv:
                    u_, v_ = uv[li].uv; x = int((u_ % 1) * (W - 1)); y = int((v_ % 1) * (H - 1)); k = (y * W + x) * 4
                    cols[0] += pix[k]; cols[1] += pix[k + 1]; cols[2] += pix[k + 2]; cols[3] += 1
    skin = tuple(srgb2lin(c / cols[3]) for c in cols[:3]) if cols[3] else (.55, .35, .25)
    results[side] = dict(wrist=wrist, d=d, thumb=thumb, dorsal=dorsal, hv=hv, len=max(.12, tmax * 1.02), skin=skin)
    print('HAND', side, 'old verts', len(hv), 'len', round(tmax, 3), 'skin', [round(c, 3) for c in skin])

# delete the old hands
bpy.context.view_layer.objects.active = body; bpy.ops.object.mode_set(mode='EDIT'); bm = bmesh.from_edit_mesh(body.data); bm.verts.ensure_lookup_table()
kill = set().union(*[r['hv'] for r in results.values()])
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in kill], context='VERTS'); bmesh.update_edit_mesh(body.data); bpy.ops.object.mode_set(mode='OBJECT')

skin_mat = bpy.data.materials.new('skin_hand'); skin_mat.use_nodes = True
bs = skin_mat.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = (*results['Right']['skin'], 1); bs.inputs['Roughness'].default_value = .6

# ---------------- build, rig, weight and attach each hand ----------------
FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
for side, r in results.items():
    h = build_hand(); h.name = side + 'HandMesh'
    s = r['len'] / .19
    # right hand: canonical thumb is on -X, so +X maps to -thumb; left hand: mirror the mesh in X (thumb on +X), +X maps to thumb
    X = -r['thumb'] if side == 'Right' else r['thumb']
    Y, Z = r['d'], r['dorsal']
    if side == 'Left':
        for v in h.data.vertices: v.co.x = -v.co.x
    M = Matrix((X * s, Y * s, Z * s)).transposed(); M = M.to_4x4(); M.translation = r['wrist']
    h.data.transform(M); h.data.update()
    # recompute normals outward
    bpy.context.view_layer.objects.active = h; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    h.data.materials.clear(); h.data.materials.append(skin_mat)
    # bones
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; inv = arm.matrix_world.inverted()
    segs = []   # (bone name, a world, b world)
    ch = chains()
    def tw(p):
        q = Vector((-p.x if side == 'Left' else p.x, p.y, p.z)); return r['wrist'] + (X * q.x + Y * q.y + Z * q.z) * s
    for fn in FINGER_NAMES:
        pts, _ = ch[fn]; parent = eb[side + 'Hand']
        for i in range(3):
            b = eb.new(side + fn + str(i + 1)); b.head = inv @ tw(pts[i]); b.tail = inv @ tw(pts[i + 1]); b.parent = parent; b.use_connect = i > 0
            b.align_roll(inv.to_3x3() @ Z); parent = b; segs.append((b.name, tw(pts[i]), tw(pts[i + 1])))
    segs.append((side + 'Hand', r['wrist'] + Y * (-.01 * s), r['wrist'] + Y * (.085 * s)))
    bpy.ops.object.mode_set(mode='OBJECT')
    # weights
    groups = {n: h.vertex_groups.new(name=n) for n, _, _ in segs}
    def dseg(p, a, b):
        ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(1e-9, ab.length_squared))); return (p - (a + ab * t)).length
    for v in h.data.vertices:
        p = v.co; ds = sorted(((dseg(p, a, b), n) for n, a, b in segs))[:2]
        w0 = 1 / (ds[0][0] + 1e-4) ** 4; w1 = 1 / (ds[1][0] + 1e-4) ** 4
        if ds[1][0] > ds[0][0] * 1.8: w1 = 0
        tot = w0 + w1; groups[ds[0][1]].add([v.index], w0 / tot, 'REPLACE')
        if w1 > 0: groups[ds[1][1]].add([v.index], w1 / tot, 'REPLACE')
    # join into the body (keeps the body's Armature modifier; vertex groups merge by name)
    bpy.ops.object.select_all(action='DESELECT'); h.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
    print('HAND', side, 'built', s)

def export(path):
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False)
export(out)
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
bpy.context.view_layer.objects.active = body
dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = min(1.0, 18000 / max(1, tris))
while body.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
bpy.ops.object.modifier_apply(modifier='dec'); export(out_low)
print('HANDS DONE', tris)
