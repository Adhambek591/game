# Make the standard character look like the author's Higgsfield 3D model (retopology + bake, the usual game pipeline):
#   1. match(): the MPFB body is scaled to the reference height and its limbs posed to the reference A-pose (bone directions
#      from the reference's own skeleton), then that pose becomes the rest pose;
#   2. wrap_bake(): every layer (body skin at the head/neck, each garment) is shrink-wrapped onto the reference surface with a
#      per-layer offset (inner layers slightly inside, outer ones outside, so nothing z-fights), gets its own UVs, and the
#      reference's colour (and surface detail as a normal map) is baked onto it. The reference itself is not used in the game.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

REF = {}

def load_ref(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next((o for o in new if o.type == 'ARMATURE'), None)
    meshes = [o for o in new if o.type == 'MESH' and not o.name.startswith('Icosphere')]
    for o in new:
        if o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:   # freeze the reference in its rest shape, unparented
        wm = o.matrix_world.copy(); o.parent = None; o.matrix_world = wm
        for m in list(o.modifiers): o.modifiers.remove(m)
    heads = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones} if arm else {}
    REF.update(meshes=meshes, heads=heads, arm=arm)
    return meshes, heads

def match(spec, body, arm):
    meshes, rh = load_ref(os.path.join(spec['_dir'], spec['ref_model']))
    top = max((o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box)
    mtop = max((body.matrix_world @ v.co).z for v in body.data.vertices)
    k = top / mtop
    # scale rig + body to the reference height
    for o in (arm, body): o.select_set(False)
    arm.scale = (k, k, k); bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # align the hips horizontally
    AW = arm.matrix_world; mh = AW @ arm.data.bones['Hips'].head_local; off = Vector((rh['Hips'].x - mh.x, rh['Hips'].y - mh.y, 0))
    arm.location += off; body_parent = body.parent
    if body_parent != arm: body.location += off
    bpy.context.view_layer.update()
    # pose limbs to the reference directions
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
    chains = [('LeftArm', 'LeftForeArm'), ('LeftForeArm', 'LeftHand'), ('RightArm', 'RightForeArm'), ('RightForeArm', 'RightHand'),
              ('LeftUpLeg', 'LeftLeg'), ('LeftLeg', 'LeftFoot'), ('RightUpLeg', 'RightLeg'), ('RightLeg', 'RightFoot')]
    for a, b in chains:
        if a not in rh or b not in rh: continue
        pb = arm.pose.bones[a]; bpy.context.view_layer.update()
        AW = arm.matrix_world
        h = AW @ pb.head; t = AW @ arm.pose.bones[b].head
        cur = (t - h).normalized(); want = (rh[b] - rh[a]).normalized()
        q = cur.rotation_difference(want)
        M = AW.inverted() @ (Matrix.Translation(h) @ q.to_matrix().to_4x4() @ Matrix.Translation(-h)) @ AW
        pb.matrix = M @ pb.matrix
        bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT')
    # bake the pose into the mesh and make it the rest pose
    mod = next(m for m in body.modifiers if m.type == 'ARMATURE')
    bpy.context.view_layer.objects.active = body; bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
    md = body.modifiers.new('arm', 'ARMATURE'); md.object = arm
    print('CHAR fit: scale %.3f, posed to the reference' % k)

# inner layers sit just inside the reference surface, outer ones just outside
OFFS = {'tunic': -.01, 'trousers': -.008, 'body': -.001, 'dress': -.006, 'boots': .0, 'bootfoot': .0, 'cuirass': .004, 'belt': .01,
        'tassets': .014, 'pauldron': .012, 'bracer': .01, 'scarf': .002, 'drape': .004}

def tex_lamella_img(size):
    """plate rows (bright plate, darker seams), values 0..1, size x size"""
    import numpy as np
    y, x = np.mgrid[0:size, 0:size] / size
    px = (x * 16) % 1; py = (y * 10) % 1
    edge = np.minimum(np.minimum(px, 1 - px) * 6, np.minimum(py, 1 - py) * 4).clip(0, 1)
    return np.sqrt(edge) * (1 - (1 - py) ** 3 * .35)

def set_emit(ref, on):
    for slot in ref.material_slots:
        mt = slot.material
        if not mt or '_emit' not in mt: continue
        nt0 = mt.node_tree; out = next(n for n in nt0.nodes if n.type == 'OUTPUT_MATERIAL')
        src = nt0.nodes[mt['_emit']] if on else nt0.nodes[mt['_bsdf']]
        nt0.links.new(src.outputs[0], out.inputs['Surface'])

def head_from_ref(spec, body, arm):
    """The head (face, scarf, jewellery, hair at the temples) is taken as it is from the reference model and bound to the Head
    bone; faces are not animated, so the author's approved face stays exact. The body's own head is removed under it."""
    ref = REF['meshes'][0]; AW = arm.matrix_world
    neckz = (AW @ arm.data.bones['neck'].head_local).z; headz = (AW @ arm.data.bones['Head'].head_local).z
    cut = neckz + .035
    h = ref.copy(); h.data = ref.data.copy(); h.name = 'head'; bpy.context.scene.collection.objects.link(h)
    bmx = bmesh.new(); bmx.from_mesh(h.data); mw = h.matrix_world
    # keep everything above the cut; at the back also the scarf tail down to the shoulder blades
    back_c = (AW @ arm.data.bones['Spine'].head_local)
    sp1 = (AW @ arm.data.bones['Spine01'].head_local)
    import numpy as np
    img = None
    for mt in ref.data.materials:
        for n in (mt.node_tree.nodes if mt and mt.use_nodes else []):
            if n.type == 'TEX_IMAGE' and n.image and img is None: img = n.image
    braid_v = set()
    if img:
        IW, IH = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(IH, IW, 4); uvd = h.data.uv_layers.active.data
        lum = {}
        for poly in h.data.polygons:
            for li in poly.loop_indices:
                u, v_ = uvd[li].uv; c = px[int((v_ % 1) * (IH - 1)), int((u % 1) * (IW - 1))]
                vi = h.data.loops[li].vertex_index; lum.setdefault(vi, []).append(.3 * c[0] + .59 * c[1] + .11 * c[2])
        for vi, ls in lum.items():
            p = mw @ h.data.vertices[vi].co
            if sum(ls) / len(ls) < .06 and sp1.z - .12 < p.z < cut + .02 and p.y < back_c.y and .03 < abs(p.x - back_c.x) < .16: braid_v.add(vi)
    neck_c = AW @ arm.data.bones['neck'].head_local
    def keep(p, vi=None):
        if vi is not None and vi in braid_v: return True
        if p.z > cut: return True
        if p.y < neck_c.y - .015 and p.z > neckz - .025 and abs(p.x - neck_c.x) < .065: return True   # chin + front of the neck
        return p.y > back_c.y + .02 and p.z > neckz - .16 and abs(p.x - back_c.x) < .09
    bmesh.ops.delete(bmx, geom=[v for v in bmx.verts if not keep(mw @ v.co, v.index)], context='VERTS')
    bmx.to_mesh(h.data); bmx.free()
    for g in list(h.vertex_groups): h.vertex_groups.remove(g)
    for n in ('Head', 'neck', 'Spine', 'Spine01'): h.vertex_groups.new(name=n)
    for v in h.data.vertices:
        p = mw @ v.co
        hw_ = max(0., min(1., (p.z - cut) / (.5 * (headz - neckz))))
        if p.z < cut and p.y < back_c.y: w = {'Spine': 1.} if p.z > sp1.z else {'Spine01': 1.}   # braids on the chest
        elif p.z < cut: w = {'Head': max(0., 1 - (cut - p.z) / .06) * .7, 'Spine': min(1., (cut - p.z) / .06) * .3}; w['neck'] = 1 - sum(w.values())
        else: w = {'Head': .4 + .6 * hw_, 'neck': .6 - .6 * hw_}
        for k, x in w.items():
            if x > 1e-4: h.vertex_groups[k].add([v.index], x, 'REPLACE')
    wm = h.matrix_world.copy(); h.parent = arm; h.matrix_world = wm
    md = h.modifiers.new('arm', 'ARMATURE'); md.object = arm
    # the body's head goes away (with the eyes); keep the neck below the cut
    me = body.data; bmw = body.matrix_world
    bmx = bmesh.new(); bmx.from_mesh(me)
    dl_ = bmx.verts.layers.deform.verify(); hgi = body.vertex_groups['Head'].index
    def gone(v):
        q = bmw @ v.co
        return q.z > cut + .015 or v[dl_].get(hgi, 0) > .3 or (q.y < neck_c.y - .005 and q.z > neckz - .02 and abs(q.x - neck_c.x) < .06)
    bmesh.ops.delete(bmx, geom=[f for f in bmx.faces if all(gone(v) for v in f.verts)], context='FACES')
    bmx.to_mesh(me); bmx.free()
    print('CHAR head from the reference, cut at %.3f, %d verts' % (cut, len(h.data.vertices)))
    return h

def wrap_bake(spec, body, arm, objs):
    meshes = REF['meshes']
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    sc.render.bake.use_selected_to_active = True; sc.render.bake.cage_extrusion = .03; sc.render.bake.max_ray_distance = .06
    ref = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes: o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join(); ref = bpy.context.active_object
    # bake the reference's albedo as EMISSION (a DIFFUSE bake returns black for metal: the lamellar plates came out black)
    for slot in ref.material_slots:
        mt = slot.material
        if not mt or not mt.use_nodes: continue
        nt0 = mt.node_tree; bsd = next((n for n in nt0.nodes if n.type == 'BSDF_PRINCIPLED'), None); out = next((n for n in nt0.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not bsd or not out: continue
        em = nt0.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1
        if bsd.inputs['Base Color'].links: nt0.links.new(bsd.inputs['Base Color'].links[0].from_socket, em.inputs['Color'])
        else: em.inputs['Color'].default_value = bsd.inputs['Base Color'].default_value
        mt['_emit'] = em.name; mt['_bsdf'] = bsd.name
    head_z = (arm.matrix_world @ arm.data.bones['neck'].head_local).z
    for o in objs:
        key = next((k for k in OFFS if o.name.startswith(k)), None)
        if key is None and not o.name.startswith('braid'): continue
        wrap = key is not None and key not in spec.get('nowrap', ())
        # ---- shrink-wrap (body: only the head and neck; hands keep the real fingers)
        if wrap: sw = o.modifiers.new('sw', 'SHRINKWRAP'); sw.target = ref; sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.offset = OFFS[key]
        if wrap and o == body:
            vg = o.vertex_groups.new(name='_wrap')
            for v in o.data.vertices:
                z = (o.matrix_world @ v.co).z
                w = max(0., min(1., (z - (head_z - .06)) / .05))
                if w > 0: vg.add([v.index], w, 'REPLACE')
            sw.vertex_group = '_wrap'
        if wrap:
            before = [v.co.copy() for v in o.data.vertices]
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_move_to_index(modifier='sw', index=0); bpy.ops.object.modifier_apply(modifier='sw')
            lim = .012 if o == body else .045   # a point that jumped far snapped onto the wrong thing (a pendant, another layer): keep it
            for v, b0 in zip(o.data.vertices, before):
                d = (v.co - b0).length
                if d > lim: v.co = b0.lerp(v.co, max(0., 1 - (d - lim) / lim))
            if o == body: o.vertex_groups.remove(o.vertex_groups['_wrap'])
        key = key or 'braid'
        # ---- fresh UVs for the bake
        me = o.data
        for uv in list(me.uv_layers): me.uv_layers.remove(uv)
        me.uv_layers.new(name='UVMap')
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.006); bpy.ops.object.mode_set(mode='OBJECT')
        size = 2048 if o == body or key in ('dress', 'cuirass', 'scarf') else 1024
        img = bpy.data.images.new(o.name + '_col', size, size, alpha=False); nim = bpy.data.images.new(o.name + '_nrm', size, size, alpha=False); nim.colorspace_settings.name = 'Non-Color'
        old = [s.material for s in o.material_slots]
        m = bpy.data.materials.new(o.name + '_baked'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
        o0 = old[0] if old and old[0] else None
        if o0 and o0.use_nodes:
            ob = o0.node_tree.nodes.get('Principled BSDF')
            if ob:
                bs.inputs['Roughness'].default_value = max(.45, ob.inputs['Roughness'].default_value); bs.inputs['Metallic'].default_value = min(.6, ob.inputs['Metallic'].default_value)
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = img; nt.links.new(tc.outputs['Color'], bs.inputs['Base Color'])
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nim; nmn = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nmn.inputs['Color']); nt.links.new(nmn.outputs['Normal'], bs.inputs['Normal'])
        me.materials.clear(); me.materials.append(m)
        for p in me.polygons: p.material_index = 0
        bpy.ops.object.select_all(action='DESELECT'); ref.select_set(True); o.select_set(True); bpy.context.view_layer.objects.active = o
        sc.render.bake.cage_extrusion = .012 if key in ('tunic', 'trousers', 'dress', 'body') else (.07 if not wrap else .03)
        sc.render.bake.max_ray_distance = .14 if not wrap else .06
        nt.nodes.active = tc; sc.render.bake.margin = 8
        set_emit(ref, True); bpy.ops.object.bake(type='EMIT')
        set_emit(ref, False); nt.nodes.active = tn
        if key in ('cuirass', 'pauldron', 'tassets', 'bracer', 'belt'): bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
        else:   # soft layers: no baked normals (inner layers picked up the armour's normals -> white glints)
            nt.links.remove(nmn.outputs['Normal'].links[0])
        if o == body:   # hands and below the neck keep a plain skin colour (the reference has mitten hands)
            import numpy as np
            px = np.array(img.pixels[:]).reshape(size, size, 4); uvd = me.uv_layers.active.data; cols = []
            for poly in me.polygons:
                if (o.matrix_world @ poly.center).z > head_z + .04:
                    u, v = uvd[poly.loop_indices[0]].uv; c = px[int(v * (size - 1)), int(u * (size - 1)), :3]
                    if c[0] > c[1] > c[2] and c[0] > .25: cols.append(c)
            sk = np.median(np.array(cols), 0) if cols else np.array([.6, .4, .3])
            ms = bpy.data.materials.new('skin_plain'); ms.use_nodes = True; ms.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*sk, 1); ms.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .55
            me.materials.append(ms)
            for poly in me.polygons:
                if (o.matrix_world @ poly.center).z < head_z - .07: poly.material_index = 1
        if key in ('dress', 'trousers', 'tunic', 'scarf', 'drape', 'boots', 'bootfoot'):
            import numpy as np
            px = np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4); rgb = px[..., :3]
            mx = rgb.max(2); mn = rgb.min(2); sat = (mx - mn) / np.maximum(mx, 1e-4); lum = rgb @ np.array([.3, .59, .11])
            filled = mx > .02; good = filled & (sat > .3)
            if good.any():
                med = np.median(rgb[good], 0); bad = (filled & (sat < .36)) | (mx < .03)   # grey armour seen through + rays that hit nothing
                rgb[bad] = med * (.9 + .2 * np.random.default_rng(1).random((bad.sum(), 1)))
                px[..., :3] = rgb; img.pixels.foreach_set(px.ravel())
        if key in ('cuirass', 'tassets', 'pauldron', 'bracer'):   # metal parts: the blue cloth seen where the reference has no plate -> steel
            import numpy as np
            px = np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4); rgb = px[..., :3]
            mx = rgb.max(2); mn = rgb.min(2); sat = (mx - mn) / np.maximum(mx, 1e-4)
            blue = (sat > .28) & (rgb[..., 2] > rgb[..., 0] * 1.25) & (rgb[..., 2] > rgb[..., 1] * 1.1)
            steel = (mx > .03) & (sat < .25)
            if steel.any():
                med = np.median(rgb[steel], 0); bad = blue | (mx < .03)
                # keep the plate rhythm: modulate with the generated lamella pattern
                lam = np.array(tex_lamella_img(size), dtype=np.float32)
                rgb[bad] = (med * (.75 + .5 * lam[..., None]))[bad]
                px[..., :3] = rgb; img.pixels.foreach_set(px.ravel())
        img.filepath_raw = os.path.join(spec['_dir'], 'out', 'bake_' + o.name + '.png'); img.file_format = 'PNG'; img.save(); img.pack(); nim.pack()
        print('CHAR baked', o.name, size)
    bpy.data.objects.remove(ref, do_unlink=True)
    if REF.get('arm'): bpy.data.objects.remove(REF['arm'], do_unlink=True)
