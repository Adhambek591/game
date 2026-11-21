# Graft MakeHuman/MPFB hands (CC0 base mesh, "game_engine" rig: 15 finger bones per hand with proper skin weights) onto a
# Meshy-rigged character whose own hands are fused mittens.
#   - MPFB human is created, rigged (game_engine) and weighted; per side the hand part (hand + finger weight >= .5, plus a short
#     strip of wrist so the seam hides in the cuff) is split off with its weights;
#   - it is placed by a frame match: forearm->hand direction, thumb side, palm normal; scaled to the length of the old hand;
#   - the Meshy hand is deleted, finger bones are added to the Meshy armature (Right/Left + Thumb/Index/Middle/Ring/Pinky + 1..3),
#     weights are renamed (hand_r -> RightHand, lowerarm_r -> RightForeArm, index_01_r -> RightIndex1 ...), skin colour sampled;
#   - export full mesh and an ~18k-triangle LOD.
# Run: blender -b --python hands_mpfb.py -- <in.glb> <out.glb> <out_low.glb>
import bpy, bmesh, sys, addon_utils
from mathutils import Vector, Matrix

src, out, out_low = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService

# ---------- MPFB human ----------
hb = HumanService.create_human(); HumanService.add_builtin_rig(hb, 'game_engine', import_weights=True)
hr = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
bpy.context.view_layer.update()
FN = {'thumb': 'Thumb', 'index': 'Index', 'middle': 'Middle', 'ring': 'Ring', 'pinky': 'Pinky'}
def mb(n): return hr.matrix_world @ hr.data.bones[n].head_local
def mt(n): return hr.matrix_world @ hr.data.bones[n].tail_local

# evaluated MPFB mesh (targets/modifiers applied, helpers removed), as a plain mesh object
dg = bpy.context.evaluated_depsgraph_get()
body_idx = hb.vertex_groups['body'].index
me = bpy.data.meshes.new_from_object(hb.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
hm = bpy.data.objects.new('mpfb_eval', me); bpy.context.scene.collection.objects.link(hm); hm.matrix_world = hb.matrix_world.copy()
for g in hb.vertex_groups: hm.vertex_groups.new(name=g.name)

def frame(d, across):
    d = d.normalized(); a = (across - d * across.dot(d)).normalized(); n = d.cross(a)
    return Matrix((d, a, n)).transposed()   # columns: forearm dir, thumb/index side, palm normal

def mpfb_hand(side):
    sfx = '_' + side; names = ['hand' + sfx] + [f + '_0%d' % i + sfx for f in FN for i in (1, 2, 3)]
    gi = {hm.vertex_groups[n].index: n for n in names if n in hm.vertex_groups}
    la = hm.vertex_groups.get('lowerarm' + sfx); lai = la.index if la else -1
    wrist = mb('hand' + sfx); d = (wrist - mb('lowerarm' + sfx)).normalized()
    across = mb('index_01' + sfx) - mb('pinky_01' + sfx)
    keep, tmax = set(), 0.0; mwm = hm.matrix_world
    for v in hm.data.vertices:
        gs = {g.group: g.weight for g in v.groups}
        if body_idx not in gs: continue
        wh = sum(w for g, w in gs.items() if g in gi)
        t = (mwm @ v.co - wrist).dot(d)
        if wh >= .5 or (wh > .05 and t > -.035): keep.add(v.index); tmax = max(tmax, t)
    return dict(names=names, gi=gi, lai=lai, wrist=wrist, F=frame(d, across), keep=keep, len=tmax)

# ---------- Meshy character ----------
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE' and o != hr)
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent == arm or (o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)))
def cb(n): return arm.matrix_world @ arm.data.bones[n].head_local
up = Vector((0, 0, 1)); rgt = cb('RightUpLeg') - cb('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()

img = None   # the image that feeds Base Color (not the emissive / normal / ORM maps)
def feeds_base(node, depth=0):
    if node.type == 'TEX_IMAGE': return node.image
    if depth > 4: return None
    for inp in node.inputs:
        for l in inp.links:
            r = feeds_base(l.from_node, depth + 1)
            if r: return r
    return None
for m in body.data.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links and img is None: img = feeds_base(n.inputs['Base Color'].links[0].from_node)
print('SKIN image', img and img.name)
pix = list(img.pixels[:]) if img else None; IW, IH = (img.size[0], img.size[1]) if img else (0, 0)
def lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

mw = body.matrix_world; uvd = body.data.uv_layers.active.data if body.data.uv_layers else None
sides = {}
for S, s in (('Right', 'r'), ('Left', 'l')):
    g = body.vertex_groups.get(S + 'Hand'); wrist = cb(S + 'Hand'); d = (wrist - cb(S + 'ForeArm')).normalized()
    thumb = fwd - d * fwd.dot(d)
    hv, tmax = set(), 0.0
    for v in body.data.vertices:
        w = next((x.weight for x in v.groups if x.group == g.index), 0)
        if w >= .5:
            t = (mw @ v.co - wrist).dot(d)
            if t > .004: hv.add(v.index); tmax = max(tmax, t)
    col = [0, 0, 0, 0]
    if pix and uvd:
        for p in body.data.polygons:
            for li in p.loop_indices:
                if body.data.loops[li].vertex_index in hv:
                    u, vv = uvd[li].uv; k = (int((vv % 1) * (IH - 1)) * IW + int((u % 1) * (IW - 1))) * 4
                    col[0] += pix[k]; col[1] += pix[k + 1]; col[2] += pix[k + 2]; col[3] += 1
    sides[S] = dict(s=s, wrist=wrist, F=frame(d, thumb), hv=hv, len=max(.1, tmax), skin=tuple(lin(c / col[3]) for c in col[:3]) if col[3] else (.5, .33, .25))
    print('SIDE', S, 'old', len(hv), 'len', round(tmax, 3), 'skin', [round(x, 3) for x in sides[S]['skin']])

# delete Meshy hands
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bmm = bmesh.from_edit_mesh(body.data); bmm.verts.ensure_lookup_table()
bmesh.ops.delete(bmm, geom=[bmm.verts[i] for i in set().union(*[x['hv'] for x in sides.values()])], context='VERTS'); bmesh.update_edit_mesh(body.data); bpy.ops.object.mode_set(mode='OBJECT')

skin = bpy.data.materials.new('skin_hand'); skin.use_nodes = True; P = skin.node_tree.nodes['Principled BSDF']
P.inputs['Base Color'].default_value = (*sides['Right']['skin'], 1); P.inputs['Roughness'].default_value = .55

for S, c in sides.items():
    m = mpfb_hand(c['s'])
    R = c['F'] @ m['F'].transposed(); k = c['len'] / max(.05, m['len'])
    def X(p): return c['wrist'] + R @ ((p - m['wrist']) * k)
    # new hand object from the kept MPFB faces
    bm2 = bmesh.new(); vmap = {}; mwm = hm.matrix_world; dl = bm2.verts.layers.deform.verify()
    for vi in m['keep']:
        v = hm.data.vertices[vi]; nv = bm2.verts.new(X(mwm @ v.co)); vmap[vi] = nv
    for p in hm.data.polygons:
        if all(i in vmap for i in p.vertices):
            try: bm2.faces.new([vmap[i] for i in p.vertices])
            except ValueError: pass
    hand = bpy.data.objects.new(S + 'Hand_mpfb', bpy.data.meshes.new(S + 'Hand_mpfb')); bpy.context.scene.collection.objects.link(hand)
    # weights, renamed to the Meshy rig
    def rn(n):
        if n.startswith('hand_'): return S + 'Hand'
        f, i, _ = n.split('_'); return S + FN[f] + str(int(i))
    tgt = {gi: rn(n) for gi, n in m['gi'].items()}; tgt[m['lai']] = S + 'ForeArm'
    names = sorted(set(tgt.values())); gidx = {n: i for i, n in enumerate(names)}
    for n in names: hand.vertex_groups.new(name=n)
    for vi, nv in vmap.items():
        ws = {}
        for g in hm.data.vertices[vi].groups:
            if g.group in tgt: ws[tgt[g.group]] = ws.get(tgt[g.group], 0) + g.weight
        tot = sum(ws.values()) or 1
        for n, w in ws.items(): nv[dl][gidx[n]] = w / tot
        if not ws: nv[dl][gidx[S + 'Hand']] = 1.0
    bm2.to_mesh(hand.data); bm2.free()
    for p in hand.data.polygons: p.use_smooth = True
    hand.data.materials.append(skin)
    # the Meshy body carries vertex colours that glTF multiplies into the albedo: give the new hand white ones, or it turns black
    for ca in body.data.color_attributes:
        nca = hand.data.color_attributes.new(ca.name, ca.data_type, ca.domain)
        for e in nca.data: e.color = (1, 1, 1, 1)
    # keep MPFB's own winding: the open wrist makes 'recalculate outside' guess wrong, and the transform is a pure rotation + scale
    # finger bones in the Meshy armature
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; inv = arm.matrix_world.inverted()
    for f in FN:
        parent = eb[S + 'Hand']
        for i in (1, 2, 3):
            mn = f + '_0%d' % i + '_' + c['s']; b = eb.new(S + FN[f] + str(i))
            b.head = inv @ X(mb(mn)); b.tail = inv @ X(mt(mn)); b.parent = parent; b.use_connect = False
            zb = hr.matrix_world.to_3x3() @ hr.data.bones[mn].matrix_local.to_3x3().col[2]; b.align_roll(inv.to_3x3() @ (R @ zb)); parent = b
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT'); hand.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body; bpy.ops.object.join()
    print('GRAFT', S, len(vmap), 'verts, scale', round(k, 3))

# drop the MPFB helper objects before export
for o in list(bpy.context.scene.objects):
    if o not in (arm, body): bpy.data.objects.remove(o, do_unlink=True)
def export(path):
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False)
export(out)
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
bpy.context.view_layer.objects.active = body; dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = min(1.0, 18000 / max(1, tris))
while body.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
bpy.ops.object.modifier_apply(modifier='dec'); export(out_low)
print('MPFB HANDS DONE', tris)
