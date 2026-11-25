# Skin the costume groups to the MetaHuman armature of SK_Guloyim_BodyOnly.fbx (body and armature untouched).
# blender -b --factory-startup out/costume_low.blend --python skin.py   -> out/skinned/SK_Guloyim_<Group>.fbx (+ test-pose sheet)
#  * weights: Data Transfer (vertex groups, nearest face interpolated) from the BodyOnly mesh, smoothed over the mesh,
#    limited to 4 influences and normalised; rigid islands (lamellar plates, laces, rivets, beads, coins, buckles, plaques)
#    get the averaged weights of their island so they never bend; head pieces are weighted to head / neck by hand
#    (the BodyOnly mesh has no head).
#  * test pose: arms down, elbows bent, left leg stepping: penetration count of costume vertices inside the body.
import bpy, bmesh, os, sys, json, math
import numpy as np
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); SK = os.path.join(OUT, 'skinned'); os.makedirs(SK, exist_ok=True)
SRC = os.path.join(HERE, 'body', 'SK_Guloyim_BodyOnly.fbx')
GROUPS = {'Torso': 'SK_Guloyim_Torso', 'Arms': 'SK_Guloyim_Arms', 'Legs': 'SK_Guloyim_Legs',
          'Cloth': 'SK_Guloyim_Cloth', 'Head': 'SK_Guloyim_Headband'}

for o in list(bpy.data.objects):
    if o.name == 'GUL_Body': bpy.data.objects.remove(o)
parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.get('ue_group')]
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=SRC)
new = [o for o in bpy.data.objects if o not in before]
arm = [o for o in new if o.type == 'ARMATURE'][0]
body = [o for o in new if o.type == 'MESH'][0]
root_empty = arm.parent
print('ARMATURE', arm.name, 'parent', root_empty and root_empty.name, 'body', body.name)
bpy.context.view_layer.update()

def apply_mods(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    o.modifiers.clear(); old = o.data; o.data = me; bpy.data.meshes.remove(old)

def islands(me):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    seen = [False] * len(bm.verts); out = []
    for v0 in bm.verts:
        if seen[v0.index]: continue
        st = [v0]; seen[v0.index] = True; comp = []
        while st:
            v = st.pop(); comp.append(v.index)
            for e in v.link_edges:
                w = e.other_vert(v)
                if not seen[w.index]: seen[w.index] = True; st.append(w)
        out.append(comp)
    adj = [[e.other_vert(v).index for e in v.link_edges] for v in bm.verts]
    bm.free()
    return out, adj

def weights_matrix(o):
    names = [g.name for g in o.vertex_groups]
    W = np.zeros((len(o.data.vertices), len(names)), np.float32)
    for v in o.data.vertices:
        for g in v.groups: W[v.index, g.group] = g.weight
    return names, W

def write_weights(o, names, W, limit=4):
    o.vertex_groups.clear()
    # keep top-N per vertex, normalise
    idx = np.argsort(-W, axis=1)[:, :limit]
    rows = np.arange(W.shape[0])[:, None]
    Wl = np.zeros_like(W); Wl[rows, idx] = W[rows, idx]
    s = Wl.sum(1, keepdims=True); s[s == 0] = 1; Wl /= s
    used = np.where(Wl.max(0) > 1e-4)[0]
    for j in used:
        vg = o.vertex_groups.new(name=names[j])
        nz = np.where(Wl[:, j] > 1e-4)[0]
        for i in nz: vg.add([int(i)], float(Wl[i, j]), 'REPLACE')

def manual(o, spec):
    """spec(p) -> {bone: weight} in world space"""
    o.vertex_groups.clear()
    vgs = {}
    for v in o.data.vertices:
        p = o.matrix_world @ v.co
        for b, w in spec(p).items():
            if w <= 0: continue
            if b not in vgs: vgs[b] = o.vertex_groups.new(name=b)
            vgs[b].add([v.index], w, 'REPLACE')

B = {b.name: (arm.matrix_world @ b.head_local) for b in arm.data.bones}
def head_spec(p):
    t = min(max((p.z - (B['neck_01'].z + 0.02)) / 0.07, 0.0), 1.0)
    return {'head': t, 'neck_02' if 'neck_02' in B else 'neck_01': 1 - t}
def collar_spec(p):
    t = min(max((p.z - (B['neck_01'].z - 0.02)) / 0.04, 0.0), 1.0)
    return {'neck_01': t, 'spine_05': 1 - t}

report = {}
for o in parts:
    g = o['ue_group']
    if g not in GROUPS: continue
    bpy.context.view_layer.objects.active = o
    # world transform baked into the mesh (pieces keep their world positions)
    if o.matrix_world != Matrix.Identity(4):
        o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)
    if g == 'Head' or o.name == 'GUL_Headscarf':
        manual(o, head_spec)
    elif o.name == 'GUL_Tunic_Collar':
        manual(o, collar_spec)
    else:
        o.vertex_groups.clear()
        for vg in body.vertex_groups: o.vertex_groups.new(name=vg.name)
        dt = o.modifiers.new('wt', 'DATA_TRANSFER'); dt.object = body
        dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}
        dt.vert_mapping = 'POLYINTERP_NEAREST'
        dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
        apply_mods(o)
        names, W = weights_matrix(o)
        isl, adj = islands(o.data)
        # smoothing over the mesh (4 passes)
        for _ in range(4):
            W2 = W.copy()
            for i, nb in enumerate(adj):
                if nb: W2[i] = 0.5 * W[i] + 0.5 * W[nb].mean(0)
            W = W2
        # rigid islands: plates, laces, rivets, beads, coins, buckles, plaques -> one averaged weight per island
        rigid_name = any(k in o.name for k in ('Lamellar', 'Silver', 'Cords', 'Fittings', 'Trim', 'Plate', 'Amulet_Chain'))
        nr = 0
        for comp in isl:
            if (rigid_name and len(comp) <= 400) or len(comp) <= 60:
                W[comp] = W[comp].mean(0); nr += 1
        write_weights(o, names, W)
        report[o.name] = {'rigid_islands': nr}
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    md = o.modifiers.new('Armature', 'ARMATURE'); md.object = arm
print('SKINNED', len(report))

# ---- test pose: arms down, elbows bent, left leg forward step (pose only, rest untouched)
pb = arm.pose.bones
def rot(name, axis_world, deg):
    b = pb.get(name)
    if not b: return
    R = Matrix.Rotation(math.radians(deg), 4, axis_world)
    Mw = arm.matrix_world @ b.matrix
    loc = Mw.to_translation()
    Mn = Matrix.Translation(loc) @ R @ Matrix.Translation(-loc) @ Mw
    b.matrix = arm.matrix_world.inverted() @ Mn
    bpy.context.view_layer.update()
rot('upperarm_l', Vector((0, 1, 0)), 32); rot('upperarm_r', Vector((0, 1, 0)), -32)      # arms down
rot('lowerarm_l', Vector((1, 0, 0)), -55); rot('lowerarm_r', Vector((1, 0, 0)), -55)    # elbows bent forward
rot('thigh_l', Vector((1, 0, 0)), -28); rot('calf_l', Vector((1, 0, 0)), 35)            # left leg steps forward
rot('thigh_r', Vector((1, 0, 0)), 12)
dg = bpy.context.evaluated_depsgraph_get()
bme = body.evaluated_get(dg).to_mesh()
bvh = BVHTree.FromPolygons([body.matrix_world @ v.co for v in bme.vertices], [tuple(p.vertices) for p in bme.polygons])
body.evaluated_get(dg).to_mesh_clear()
pen = {}
for o in parts:
    if o.get('ue_group') not in GROUPS or o.parent != arm: continue
    me = o.evaluated_get(dg).to_mesh()
    n = 0; tot = 0
    for vi in range(0, len(me.vertices), 3):
        p = o.matrix_world @ me.vertices[vi].co
        loc, nrm, _, d = bvh.find_nearest(p, 0.05)
        tot += 1
        if loc is not None and loc.z < B['neck_01'].z - 0.03 and (p - loc).dot(nrm) < -0.004: n += 1   # (BodyOnly has no neck/head)
    o.evaluated_get(dg).to_mesh_clear()
    pen[o.name] = round(100.0 * n / max(tot, 1), 2)
print('PENETRATION % (test pose, >4 mm inside the body):', {k: v for k, v in sorted(pen.items(), key=lambda kv: -kv[1]) if v > 0.5})
# quick workbench sheet of the test pose
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 900, 1200
cam = bpy.data.cameras.new('tp'); co = bpy.data.objects.new('tp', cam); sc.collection.objects.link(co); sc.camera = co
cam.type = 'ORTHO'; cam.ortho_scale = 2.0
for nm, loc, r in (('front', (0, -5, 0.9), (math.pi / 2, 0, 0)), ('q34', (-3.5, -3.5, 0.9), (math.pi / 2, 0, -math.pi / 4)), ('side', (5, 0, 0.9), (math.pi / 2, 0, math.pi / 2))):
    co.location, co.rotation_euler = loc, r
    sc.render.filepath = os.path.join(SK, 'testpose_' + nm + '.png'); bpy.ops.render.render(write_still=True)
# back to rest for export
for b in pb: b.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
bpy.data.objects.remove(co)

# ---- export one skinned FBX per group (armature with its 0.01 root empty + the group's meshes)
for g, fname in GROUPS.items():
    objs = [o for o in parts if o.get('ue_group') == g and o.parent == arm]
    if not objs: continue
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    arm.select_set(True)
    if root_empty: root_empty.select_set(True)
    bpy.context.view_layer.objects.active = arm
    path = os.path.join(SK, fname + '.fbx')
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={'ARMATURE', 'MESH', 'EMPTY'},
                             apply_unit_scale=True, apply_scale_options='FBX_SCALE_NONE', mesh_smooth_type='FACE',
                             use_tspace=True, add_leaf_bones=False, bake_anim=False, use_armature_deform_only=False,
                             armature_nodetype='NULL', path_mode='STRIP')
    print('EXPORT', path, len(objs), 'meshes')
mf = os.path.join(OUT, 'guloyim_costume_manifest.json')
M = json.load(open(mf)) if os.path.exists(mf) else {}
scb = bpy.data.objects.get('GUL_Scabbard'); amu = bpy.data.objects.get('GUL_Amulet')
M['skinned'] = {'files': {g: 'skinned/' + f + '.fbx' for g, f in GROUPS.items()},
                'skeleton': os.path.basename(SRC) + ' (341 bones, 0.01 root empty -> root), weights from its mesh, max 4 influences',
                'rigid_islands': 'lamellar plates / laces / rivets / beads / coins / plaques carry one averaged weight per island',
                'test_pose_penetration_pct': pen}
M['static_attach'] = {
    'SM_Guloyim_Sabre': {'attach_bone': 'pelvis', 'alt_bone': 'thigh_l', 'state': 'sheathed on the left hip',
                         'world_matrix': M.get('sheath_matrix_world'),
                         'note': 'mesh pivot = grip centre, blade +Z; place with world_matrix (rest pose) relative to the attach bone; in hand: socket hand_r'},
    'SM_Guloyim_Amulet': {'attach_bone': 'spine_05', 'world_matrix': M.get('amulet_world_matrix'),
                          'note': 'mesh pivot = bail ring centre, -Y front; world_matrix in rest pose'}}
json.dump(M, open(mf, 'w'), indent=1)
print('SKIN DONE')
