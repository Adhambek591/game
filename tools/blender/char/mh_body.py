# MetaHuman body + head (exported from Unreal, tools/metahuman/mh_conform.py 'preview' step) as the game body:
#   - FullBody FBX (body skeleton, 341 joints incl. twist / corrective helpers) LOD1 + Head FBX (face joints) LOD1;
#   - the body's own head faces are removed under the head mesh, the head is joined into the body mesh;
#   - the face is not animated in the game: every FACIAL_* joint weight goes to 'head' (neck ones to 'neck_02');
#   - helper joints (twist, corrective, bulge, metacarpal, toes ...) are merged into their nearest kept ancestor and removed,
#     leaving a clean humanoid skeleton the game names (Hips, Spine02, Spine01, Spine, neck, Head, LeftArm ... LeftThumb1 ...);
#   - head skin = head_basecolor.png (the face texture painted from Guloyim's portrait), eyes from the painted front view,
#     body skin colour sampled from the face.
import bpy, bmesh, os, json, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

KEEP = {'pelvis', 'spine_01', 'spine_02', 'spine_03', 'spine_04', 'spine_05', 'neck_01', 'neck_02', 'head'}
for s in ('l', 'r'):
    KEEP |= {'clavicle_' + s, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, 'thigh_' + s, 'calf_' + s, 'foot_' + s, 'ball_' + s}
    for f in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        for j in (1, 2, 3): KEEP.add('%s_0%d_%s' % (f, j, s))
REN = {'pelvis': 'Hips', 'spine_01': 'Spine02', 'spine_03': 'Spine01', 'spine_05': 'Spine', 'neck_01': 'neck', 'head': 'Head'}
for s, S in (('l', 'Left'), ('r', 'Right')):
    REN.update({'clavicle_' + s: S + 'Shoulder', 'upperarm_' + s: S + 'Arm', 'lowerarm_' + s: S + 'ForeArm', 'hand_' + s: S + 'Hand',
                'thigh_' + s: S + 'UpLeg', 'calf_' + s: S + 'Leg', 'foot_' + s: S + 'Foot', 'ball_' + s: S + 'ToeBase'})
    for f in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        for j in (1, 2, 3): REN['%s_0%d_%s' % (f, j, s)] = S + f.capitalize() + str(j)

def _import(path, lod):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    mesh = None
    for o in new:
        if o.type != 'MESH': continue
        if o.name.endswith('_LOD%d' % lod): mesh = o
        else: bpy.data.objects.remove(o, do_unlink=True)
    if mesh.data.shape_keys:
        bpy.context.view_layer.objects.active = mesh; mesh.shape_key_clear()
    return arm, mesh

def _weights(o):
    names = [g.name for g in o.vertex_groups]
    return [{names[g.group]: g.weight for g in v.groups if g.weight > 1e-5} for v in o.data.vertices]

def _set_weights(o, W):
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    groups = {}
    for i, w in enumerate(W):
        tot = sum(w.values()) or 1.
        for k, x in w.items():
            if x / tot < 1e-4: continue
            if k not in groups: groups[k] = o.vertex_groups.new(name=k)
            groups[k].add([i], x / tot, 'ADD')

def _kept_ancestor(arm, name):
    b = arm.data.bones.get(name)
    while b is not None and b.name not in KEEP: b = b.parent
    return b.name if b else 'pelvis'

def load(spec, here):
    mh = spec['mh_body']; root = os.path.join(here, mh.get('dir', '../../metahuman/out'))
    barm, body = _import(os.path.join(root, mh['body_fbx']), mh.get('body_lod', 1))
    harm, head = _import(os.path.join(root, mh['head_fbx']), mh.get('head_lod', 1))
    for o in (body, head):
        if o.data.has_custom_normals:
            bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.mesh.customdata_custom_splitnormals_clear(); o.select_set(False)
        for p in o.data.polygons: p.use_smooth = True
    # ---- head: drop hidden helper geometry, materials
    hide = {i for i, s in enumerate(head.material_slots) if s.material and 'hide' in s.material.name.lower()}
    b = bmesh.new(); b.from_mesh(head.data); bmesh.ops.delete(b, geom=[f for f in b.faces if f.material_index in hide], context='FACES'); b.to_mesh(head.data); b.free()
    tex = bpy.data.images.load(os.path.join(root, mh['head_tex'])); tex.pack()
    def mat(name, rgb=None, img=None, rough=.5):
        m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = rough
        if img: t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img; m.node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])
        else: bs.inputs['Base Color'].default_value = (*rgb, 1)
        return m
    skin = mat('skin_head', img=tex, rough=.5)
    # skin colour for the body: median of the face texture over the cheek area of the UV map (sampled at head vertices)
    TS = tex.size[0]; px = np.array(tex.pixels[:], dtype=np.float32).reshape(tex.size[1], TS, 4)
    uvd = head.data.uv_layers.active.data; cols = []
    mw = head.matrix_world; top = max((mw @ v.co).z for v in head.data.vertices)
    for p in head.data.polygons:
        if p.material_index != 0: continue
        c = mw @ p.center
        if top - .16 < c.z < top - .10 and c.y < -.05:
            u, v = uvd[p.loop_indices[0]].uv; cols.append(px[int((v % 1) * (tex.size[1] - 1)), int((u % 1) * (TS - 1)), :3])
    sk = np.median(np.array(cols), 0) if cols else np.array([.55, .38, .28])
    # Blender pixels are linear for an sRGB image -> use directly as the linear base colour
    skin_body = mat('skin_body', rgb=tuple(float(x) for x in sk), rough=.55)
    eyes_img = bpy.data.images.load(os.path.join(root, mh['eye_img'])); eyes_img.pack()
    eye_m = mat('eyes', img=eyes_img, rough=.1); teeth = mat('teeth', rgb=(.8, .78, .72), rough=.3); lash = mat('lashes', rgb=(.02, .015, .012), rough=.6)
    # eyes: UVs = projection through the camera that rendered the painted front view (ft_cams.json, Blender frame of the FBX)
    cams = json.load(open(os.path.join(root, mh['cams'])))
    cmw = Matrix(cams['cams']['front']['matrix']); fov = math.radians(cams['fov']); cinv = cmw.inverted(); tanh = math.tan(fov / 2)
    slots = [s.material.name.lower() if s.material else '' for s in head.material_slots]
    new_index = {}
    for i, n in enumerate(slots):
        if 'teeth' in n: new_index[i] = 2
        elif 'eyes' in n: new_index[i] = 1
        elif n.startswith('m_graytexture_head') and n != 'm_graytexture_head': new_index[i] = 3   # lashes / caruncle cards
        else: new_index[i] = 0
    old_idx = [p.material_index for p in head.data.polygons]
    head.data.materials.clear()
    for m in (skin, eye_m, teeth, lash): head.data.materials.append(m)   # (clearing the slots resets the indices: set them after)
    for p, oi in zip(head.data.polygons, old_idx):
        k = new_index.get(oi, 0); p.material_index = k
    # eyes: a clean painted eyeball texture (brown iris, dark pupil, limbal ring), planar UVs per eye from the front
    EI = 256; yy, xx = np.mgrid[0:EI, 0:EI] / (EI - 1) * 2 - 1; rr = np.sqrt(xx ** 2 + yy ** 2)
    sclera = np.dstack([np.full_like(rr, .86), np.full_like(rr, .83), np.full_like(rr, .8)])
    ang = np.arctan2(yy, xx); fib = .85 + .15 * np.sin(ang * 40) * np.clip(rr / .45, 0, 1)
    iris = np.dstack([.22 * fib, .12 * fib, .06 * fib]); pupil = np.dstack([np.full_like(rr, .02)] * 3)
    col = np.where((rr < .45)[..., None], iris, sclera); col = np.where((rr < .18)[..., None], pupil, col)
    col = np.where(((rr > .41) & (rr < .47))[..., None], col * .45, col)
    eimg = bpy.data.images.new('eye_tex', EI, EI, alpha=False); eimg.pixels.foreach_set(np.dstack([col, np.ones_like(rr)])[::-1].astype(np.float32).ravel()); eimg.pack()
    next(n for n in eye_m.node_tree.nodes if n.type == 'TEX_IMAGE').image = eimg
    eye_polys = [p for p, oi in zip(head.data.polygons, old_idx) if new_index.get(oi, 0) == 1]
    for side in (-1, 1):
        ps = [p for p in eye_polys if (mw @ p.center).x * side > 0]
        if not ps: continue
        vs = [mw @ head.data.vertices[v].co for p in ps for v in p.vertices]
        c = sum(vs, Vector()) / len(vs); r = max(max(abs(v.x - c.x), abs(v.z - c.z)) for v in vs) * .78
        for p in ps:
            for li in p.loop_indices:
                q = mw @ head.data.vertices[head.data.loops[li].vertex_index].co
                uvd[li].uv = ((q.x - c.x) / r * .5 + .5, (q.z - c.z) / r * .5 + .5)
    # lash cards: small, near the eyes; anything else in slot 3 (big) goes back to skin
    eye_z = [mw @ head.data.vertices[v].co for p in head.data.polygons if p.material_index == 1 for v in p.vertices]
    ez = sum(p.z for p in eye_z) / max(1, len(eye_z))
    for p in head.data.polygons:
        if p.material_index == 3 and abs((mw @ p.center).z - ez) > .03: p.material_index = 0
    # ---- face box for the scarf opening (eyes from the eye geometry, chin = lowest front skin point near the middle)
    ev = [mw @ head.data.vertices[v].co for p in head.data.polygons if p.material_index == 1 for v in p.vertices]
    sv = [mw @ head.data.vertices[v].co for p in head.data.polygons if p.material_index == 0 for v in p.vertices]
    ec = sum(ev, Vector()) / len(ev); fy = min(p.y for p in sv)
    chin = ec.z - .118   # eye line to chin (adult female)
    halfw = max(abs(p.x - ec.x) for p in ev) + .028
    spec['_face'] = {'cx': ec.x, 'eyez': ec.z, 'front': fy, 'chin': chin, 'brow': ec.z + .035, 'halfw': halfw}
    print('CHAR mh face box', {k: round(v, 3) for k, v in spec['_face'].items()})
    # ---- weights of the head onto body joints
    HW = _weights(head)
    def hmap(n):
        if n.startswith('FACIAL'): return 'neck_02' if 'Neck' in n else 'head'
        if n in barm.data.bones: return n
        return _kept_ancestor(harm, n) if n in harm.data.bones else 'head'
    HW2 = []
    for w in HW:
        d = {}
        for k, x in w.items(): kk = hmap(k); d[kk] = d.get(kk, 0) + x
        HW2.append(d)
    _set_weights(head, HW2)
    # ---- body: remove the faces that lie on the head mesh (the head mesh replaces them)
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(head, dg)
    bmw = body.matrix_world; hmin = min((mw @ v.co).z for v in head.data.vertices)
    b = bmesh.new(); b.from_mesh(body.data)
    def on_head(v):
        p = bmw @ v.co
        if p.z < hmin + .005: return False
        if p.z > hmin + .03: return True   # above the neck seam the head mesh covers everything (eyelids, nostrils, eyes)
        loc, n, i, d = bvh.find_nearest(mw.inverted() @ p)
        return d is not None and d < .004
    dead = [f for f in b.faces if all(on_head(v) for v in f.verts)]
    bmesh.ops.delete(b, geom=dead, context='FACES'); b.to_mesh(body.data); b.free()
    print('CHAR mh body: removed %d head faces from the body' % len(dead))
    body.data.materials.clear(); body.data.materials.append(skin_body)
    # ---- join head into body, one armature
    for m in list(head.modifiers): head.modifiers.remove(m)
    wm = head.matrix_world.copy(); head.parent = None; head.matrix_world = wm
    bpy.ops.object.select_all(action='DESELECT'); head.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    bpy.data.objects.remove(harm, do_unlink=True)
    # ---- merge helper joints into kept ancestors, remove them
    W = _weights(body); W2 = []
    for w in W:
        d = {}
        for k, x in w.items():
            kk = k if k in KEEP else (_kept_ancestor(barm, k) if k in barm.data.bones else 'head')
            d[kk] = d.get(kk, 0) + x
        W2.append(d)
    _set_weights(body, W2)
    bpy.context.view_layer.objects.active = barm; bpy.ops.object.mode_set(mode='EDIT')
    eb = barm.data.edit_bones
    for e in [e for e in eb if e.name not in KEEP]: eb.remove(e)
    bpy.ops.object.mode_set(mode='OBJECT')
    for bn in barm.data.bones:
        if bn.name in REN: bn.name = REN[bn.name]
    body.name = 'body'; barm.name = 'armature'
    if not any(m.type == 'ARMATURE' for m in body.modifiers):
        md = body.modifiers.new('arm', 'ARMATURE'); md.object = barm
    else:
        for m in body.modifiers:
            if m.type == 'ARMATURE': m.object = barm
    if body.parent != barm:
        wm = body.matrix_world.copy(); body.parent = barm; body.matrix_world = wm
    # apply the armature object transform (FBX import may carry a scale / rotation)
    bpy.ops.object.select_all(action='DESELECT'); barm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = barm
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    print('CHAR mh body: %d verts, %d bones, skin %s' % (len(body.data.vertices), len(barm.data.bones), tuple(round(float(x), 3) for x in sk)))
    return body, barm
