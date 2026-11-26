# Skin Surtaysha's armour to the BodyOnly MetaHuman armature (341 bones) and export skinned FBX per group.
# blender -b out/armor_low.blend --python skin.py -- [pose]
#  * weights: Data Transfer from SK_Surtaysha_BodyOnly (nearest face, interpolated) -> smoothed -> 4 influences
#  * rigid islands (lamellar plates, laces, rivets, buckles, plaques, small parts): one averaged weight set per island
#  * helmet / plume -> head; aventail -> head blending into neck_02 / neck_01 toward the hem
#  * the body and armature are not modified; the sabre stays static (attach bone + transform in the manifest)
import bpy, bmesh, os, sys, json, math
from mathutils import Vector, Matrix, Euler
OUT = r"F:\qirq-qiz\tools\blender\surtaysha_final\out"
SK = os.path.join(OUT, 'skinned'); os.makedirs(SK, exist_ok=True)
BODY = r"F:\qirq-qiz\tools\blender\surtaysha\body\SK_Surtaysha_MH_FINAL.fbx"
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
LM = json.load(open(os.path.join(OUT, 'landmarks.json')))

pieces = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('SUR_') and o.name != 'SUR_BodyProxy' and not o.name.startswith('SUR_Sabre')]
for o in [o for o in bpy.data.objects if o.name.startswith('SUR_Sabre')]: bpy.data.objects.remove(o)   # static prop, exported separately
proxy = bpy.data.objects.get('SUR_BodyProxy')
if proxy: bpy.data.objects.remove(proxy)
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=BODY)
new = [o for o in bpy.data.objects if o not in before]
arm = [o for o in new if o.type == 'ARMATURE'][0]
body = [o for o in new if o.type == 'MESH'][0]
root_empty = arm.parent
print('ARMATURE', arm.name, len(arm.data.bones), 'bones; body', body.name, len(body.data.vertices))

HEAD_ONLY = ('SUR_Helmet_Bowl', 'SUR_Helmet_Gold', 'SUR_Helmet_Liner', 'SUR_Helmet_Plume')
AVENTAIL = ('SUR_Aventail_Lamellar', 'SUR_Aventail_Trim')
head_z = arm.matrix_world @ arm.data.bones['head'].head_local
neck_z = arm.matrix_world @ arm.data.bones['neck_01'].head_local

def select_only(o):
    for x in bpy.context.view_layer.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o

def islands(me):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    seen = set(); out = []
    for v0 in bm.verts:
        if v0.index in seen: continue
        st = [v0]; seen.add(v0.index); isl = []
        while st:
            v = st.pop(); isl.append(v.index)
            for e in v.link_edges:
                w = e.other_vert(v)
                if w.index not in seen: seen.add(w.index); st.append(w)
        out.append(isl)
    bm.free()
    return out

def set_weights(o, wmap):
    """wmap: per-vertex dict {group: weight}"""
    o.vertex_groups.clear()
    groups = {}
    for i, d in enumerate(wmap):
        for g, w in d.items():
            if w <= 0: continue
            vg = groups.get(g) or o.vertex_groups.new(name=g); groups[g] = vg
            vg.add([i], w, 'REPLACE')

def read_weights(o):
    names = {g.index: g.name for g in o.vertex_groups}
    return [{names[g.group]: g.weight for g in v.groups if g.weight > 0} for v in o.data.vertices]

def limit_norm(d, k=4):
    it = sorted(d.items(), key=lambda kv: -kv[1])[:k]
    s = sum(w for _, w in it) or 1.0
    return {g: w / s for g, w in it}

report = {}
for o in pieces:
    n = o.name
    me = o.data
    if n in HEAD_ONLY:
        set_weights(o, [{'head': 1.0}] * len(me.vertices))
    elif n in AVENTAIL or n.startswith('SUR_Aventail'):
        isl = islands(me); wm = [None] * len(me.vertices)
        hz, nz = head_z.z, neck_z.z
        for I in isl:
            z = sum((o.matrix_world @ me.vertices[i].co).z for i in I) / len(I)
            f = min(max((hz + 0.05 - z) / max(hz + 0.05 - nz, 1e-3), 0.0), 1.0)
            d = limit_norm({'head': 1.0 - 0.75 * f, 'neck_02': 0.45 * f, 'neck_01': 0.30 * f})
            for i in I: wm[i] = d
        set_weights(o, wm)
    else:
        select_only(o)
        o.vertex_groups.clear()
        mod = o.modifiers.new('wt', 'DATA_TRANSFER')
        mod.object = body
        mod.use_vert_data = True
        mod.data_types_verts = {'VGROUP_WEIGHTS'}
        mod.vert_mapping = 'POLYINTERP_NEAREST'
        mod.layers_vgroup_select_src = 'ALL'
        mod.layers_vgroup_select_dst = 'NAME'
        bpy.ops.object.datalayout_transfer(modifier=mod.name)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        isl = islands(me)
        big = [I for I in isl if len(I) > 400]
        W = read_weights(o)
        side = n[-2:].lower() if n.endswith(('_L', '_R')) else ''
        if side:      # a left piece never follows right-side bones (the legs / arms are close together)
            other = '_r' if side == '_l' else '_l'
            W = [{g: w for g, w in d.items() if not g.endswith(other)} for d in W]
            acc = {}
            for d in W:
                for g, w in d.items(): acc[g] = acc.get(g, 0.0) + w
            fallback = limit_norm(acc)
            # vertices whose nearest body faces were on the other limb: take the weights of the nearest weighted vertex
            from mathutils.kdtree import KDTree
            good = [i for i, d in enumerate(W) if sum(d.values()) > 0.05]
            kd = KDTree(len(good))
            for k, i in enumerate(good): kd.insert(me.vertices[i].co, k)
            kd.balance()
            for i, d in enumerate(W):
                if sum(d.values()) <= 0.05:
                    W[i] = dict(W[good[kd.find(me.vertices[i].co)[1]]]) if good else dict(fallback)
        if n == 'SUR_Robe_Torso':
            # the collar never follows the head (UE scales/offsets the head bone): head-side weights go to neck_01
            W2 = []
            for d in W:
                dd = {}
                for g, w in d.items():
                    if g in ('head', 'neck_02') or g.startswith(('FACIAL', 'jaw', 'teeth', 'tongue')): g = 'neck_01'
                    dd[g] = dd.get(g, 0.0) + w
                W2.append(dd)
            W = W2
        if big:
            # continuous parts (cloth, edging, straps): Laplacian smoothing of the transferred weights over the edges
            nb = [[] for _ in me.vertices]
            for e in me.edges:
                a, b = e.vertices; nb[a].append(b); nb[b].append(a)
            inbig = set(i for I in big for i in I)
            for _ in range(3):
                W2 = list(W)
                for i in inbig:
                    if not nb[i]: continue
                    acc = {g: w * 0.5 for g, w in W[i].items()}
                    f = 0.5 / len(nb[i])
                    for j in nb[i]:
                        for g, w in W[j].items(): acc[g] = acc.get(g, 0.0) + w * f
                    W2[i] = acc
                W = W2
        for I in isl:
            if len(I) <= 400:                     # rigid island: one averaged weight set (plates move as solid pieces)
                acc = {}
                for i in I:
                    for g, w in W[i].items(): acc[g] = acc.get(g, 0.0) + w
                d = limit_norm({g: w / len(I) for g, w in acc.items()})
                for i in I: W[i] = d
            else:
                for i in I: W[i] = limit_norm(W[i])
        set_weights(o, W)
    # bind to the armature (world transform kept, armature not modified)
    mw = o.matrix_world.copy()
    o.parent = arm; o.matrix_world = mw
    am = o.modifiers.new('Armature', 'ARMATURE'); am.object = arm
    report[n] = {'groups': len(o.vertex_groups), 'verts': len(me.vertices), 'rigid_islands': sum(1 for I in islands(me) if len(I) <= 400)}
    print('SKIN %-28s groups %3d islands %d' % (n, report[n]['groups'], report[n]['rigid_islands']))

# ------------------------------------------------------------------ head-bone scale compensation
# UE scales the head bone by 1.0549 (MetaHuman head sized to 1/7 of the height). The helmet / plume / aventail were fitted
# around the already-scaled head, so pre-shrink every vertex about the head joint by its head weight: after UE's scale it
# lands exactly where it was fitted (brim above the brows, nasal on the bridge of the nose).
HEAD_BONE_SCALE = float(os.environ.get('SUR_HEAD_BONE_SCALE', '1.0'))      # pure MetaHuman: the head is not bone-scaled
hj = arm.matrix_world @ arm.data.bones['head'].head_local
for o in pieces:
    gi = o.vertex_groups.get('head')
    if not gi: continue
    me = o.data; mw = o.matrix_world; mwi = mw.inverted(); n = 0
    for v in me.vertices:
        w = next((g.weight for g in v.groups if g.group == gi.index), 0.0)
        if w <= 0: continue
        p = mw @ v.co
        v.co = mwi @ (hj + (p - hj) / (1.0 + (HEAD_BONE_SCALE - 1.0) * w)); n += 1
    me.update()
    print('HEADSCALE %-26s %d verts pre-shrunk' % (o.name, n))

# ------------------------------------------------------------------ test poses (clipping check renders), then back to rest
def pose(rot):
    """rot: bone -> (world axis, degrees), applied about the bone head in world space, parents first"""
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    order = [b.name for b in arm.data.bones]          # parents come before children
    for bn in order:
        if bn not in rot: continue
        pb = arm.pose.bones[bn]; axis, deg = rot[bn]
        M = arm.matrix_world @ pb.matrix
        h = M.translation.copy()
        R = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-h)
        pb.matrix = arm.matrix_world.inverted() @ (R @ M)
        bpy.context.view_layer.update()
POSES = {
    'arms_up': {'upperarm_l': ('Y', -55), 'upperarm_r': ('Y', 55), 'lowerarm_l': ('X', 0)},
    'arms_fwd': {'upperarm_l': ('Z', 60), 'upperarm_r': ('Z', -60)},
    'stride': {'thigh_l': ('X', -38), 'thigh_r': ('X', 25), 'calf_r': ('X', 45), 'spine_03': ('X', -8)},
}
if 'pose' in args:
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_cavity = True
    sc.render.resolution_x, sc.render.resolution_y = 1000, 1200
    cd = bpy.data.cameras.new('pc'); co = bpy.data.objects.new('pc', cd); sc.collection.objects.link(co); sc.camera = co
    cd.type = 'ORTHO'; cd.ortho_scale = 2.4
    for pn, rot in POSES.items():
        pose(rot)
        for vn, loc, eul in (('front', (0, -5, 1.0), (math.pi / 2, 0, 0)), ('side', (5, 0, 1.0), (math.pi / 2, 0, math.pi / 2)), ('q34', (3.5, -3.5, 1.0), (math.pi / 2, 0, math.pi / 4))):
            co.location, co.rotation_euler = loc, eul
            sc.render.filepath = os.path.join(SK, 'pose_%s_%s.png' % (pn, vn)); bpy.ops.render.render(write_still=True)
    pose({})

# ------------------------------------------------------------------ export skinned groups with the armature
GROUPS = {'Head': 'SK_Surtaysha_Head', 'Torso': 'SK_Surtaysha_Torso', 'Arms': 'SK_Surtaysha_Arms',
          'Legs': 'SK_Surtaysha_Legs', 'Cloth': 'SK_Surtaysha_Cloth'}
body.hide_set(False)
man = {'armature': arm.name, 'bones': len(arm.data.bones), 'hierarchy': '%s (scale %.2f) -> %s' % (root_empty.name if root_empty else '-', root_empty.scale.x if root_empty else 1, arm.name),
       'axes': 'axis_forward -Y, axis_up Z, unit scale applied (same as the body_ref exports)', 'groups': {}, 'pieces': report}
for g, fname in GROUPS.items():
    objs = [o for o in pieces if o.get('ue_group') == g]
    if not objs: continue
    for x in bpy.context.view_layer.objects: x.select_set(False)
    for o in objs: o.select_set(True)
    arm.select_set(True)
    if root_empty: root_empty.select_set(True)
    bpy.context.view_layer.objects.active = arm
    path = os.path.join(SK, fname + '.fbx')
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={'ARMATURE', 'MESH', 'EMPTY'}, apply_unit_scale=True, global_scale=1.0,
                             axis_forward='-Y', axis_up='Z', bake_space_transform=False, use_mesh_modifiers=False, mesh_smooth_type='FACE',
                             use_tspace=True, add_leaf_bones=False, use_armature_deform_only=False, bake_anim=False, path_mode='STRIP')
    man['groups'][fname] = [o.name for o in objs]
    print('EXPORT', path, len(objs))
# static sabre: attach to hand_r with the transform used in the previews (grip centre at the origin, blade +Z)
hr = Vector(LM['bones']['hand_r']['head']); mr = Vector(LM['bones']['middle_03_r']['head']) if 'middle_03_r' in LM['bones'] else hr
grip = hr.lerp(mr, 0.62) + Vector((0.004, 0.0, -0.012))
Mw = Matrix.Translation(grip) @ Euler((math.radians(168), math.radians(-14), math.radians(-90)), 'XYZ').to_matrix().to_4x4() @ Matrix.Translation((0, 0, 0.060))
hb = arm.matrix_world @ arm.data.bones['hand_r'].matrix_local
rel = hb.inverted() @ Mw
man['sabre'] = {'file': r'..\SM_Surtaysha_Sabre.fbx (static, grip centre at the origin, blade +Z)', 'attach_bone': 'hand_r',
                'relative_to_hand_r_metres': [list(r) for r in rel], 'world_A_pose_metres': [list(r) for r in Mw]}
json.dump(man, open(os.path.join(SK, 'surtaysha_skinned_manifest.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SK, 'surtaysha_skinned.blend'))
print('SKIN DONE')
