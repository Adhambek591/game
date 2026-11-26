# Executed inside the build.py / pieces.py namespace (real body size).
# Under-kaftan upper (torso + both sleeves to the wrist, one piece), made on the body surface itself: the body faces of
# the trunk above the belt line and of the arms are lifted 1.3 cm off the skin and relaxed, then CUT with planes at the
# collar, the wrists and the waist (clean straight edges), and the collar and cuffs get a leather binding.
# Replaces build_robe_torso and build_sleeves. Pieces: SUR_Robe_Torso (M_Cloth), SUR_Robe_Trim (M_Trim).
def build_robe_torso():
    import bmesh
    me = proxy.data
    gname = {g.index: g.name for g in proxy.vertex_groups}
    OUTK = ('thumb', 'index', 'middle', 'ring', 'pinky', 'head', 'FACIAL', 'thigh', 'calf', 'foot', 'ball', 'toe')
    z_bot = bone('spine_01').z - 0.03                     # hidden under the waist guard / belt
    z_col = min(bone('neck_01').z + 0.03, bone('head').z - 0.10)      # low stand collar
    wr = {s: (bone('lowerarm_' + s), bone('hand_' + s)) for s in 'lr'}
    def keep(v):
        p = v.co
        w = sum(g.weight for g in v.groups if any(k in gname.get(g.group, '') for k in OUTK))
        if w > 0.5: return False
        if p.z < z_bot - 0.04 and abs(p.x) < 0.33: return False
        if p.z > z_col + 0.04 and abs(p.x) < 0.13: return False
        for s in 'lr':
            a, b = wr[s]; d = (b - a).normalized()
            if (p - b).dot(d) > 0.03 and (p - b).length < 0.25: return False          # beyond the wrist: the hand
        return True
    KEEP = [keep(v) for v in me.vertices]
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not KEEP[v.index]], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5)
    seen = set(); drop = []
    for v0 in bm.verts:
        if v0 in seen: continue
        st = [v0]; seen.add(v0); comp = []
        while st:
            v = st.pop(); comp.append(v)
            for e in v.link_edges:
                w_ = e.other_vert(v)
                if w_ not in seen: seen.add(w_); st.append(w_)
        if len(comp) < 300: drop += comp
    if drop: bmesh.ops.delete(bm, geom=drop, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.0045          # the author: every layer rests on the one below (3-5 mm off the skin)
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(3): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in inner: v.co += v.normal * 0.0015                 # give back what the relaxing took
    m2 = bpy.data.meshes.new('SUR_Robe_Torso'); bm.to_mesh(m2); bm.free()
    ob = bpy.data.objects.new('SUR_Robe_Torso', m2); bpy.context.scene.collection.objects.link(ob)
    ob.vertex_groups.clear()
    m = ob.modifiers.new('dc', 'DECIMATE'); m.ratio = min(1.0, 14000.0 / max(1, sum(len(p.vertices) - 2 for p in m2.polygons)))
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    m3 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); ob.modifiers.clear(); ob.data = m3; bpy.data.meshes.remove(m2); m3.name = 'SUR_Robe_Torso'
    # ---- clean hems: plane cuts after the decimation (so the edges are straight lines, not triangle teeth)
    bm = bmesh.new(); bm.from_mesh(m3)
    def cut(co, no, sel=None):
        g = [f for f in bm.faces if sel is None or sel(f.calc_center_median())]
        geom = list({v for f in g for v in f.verts}) + list({e for f in g for e in f.edges}) + g
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True, clear_inner=False)
    cut(Vector((0, 0, z_col)), Vector((0, 0, 1)), lambda c: abs(c.x) < 0.16)
    cut(Vector((0, 0, z_bot)), Vector((0, 0, -1)), lambda c: abs(c.x) < 0.34 and c.z < z_bot + 0.06)
    cuffs = []
    for s in 'lr':
        a, b = wr[s]; d = (b - a).normalized(); pw = b - d * 0.035
        cut(pw, d, lambda c, a=a, d=d, b=b: (c - a).dot(d) > 0.5 * (b - a).length and (c - b).length < 0.30)
        cuffs.append((pw, d))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # ---- binding along the collar and the cuffs
    tm = MB(); used = set(); nb = 0
    prof = [(math.cos(2 * math.pi * q_ / 8) * 0.0048, math.sin(2 * math.pi * q_ / 8) * 0.0036) for q_ in range(9)]
    for e0 in [e for e in bm.edges if e.is_boundary]:
        if e0 in used: continue
        loop = [e0.verts[0], e0.verts[1]]; used.add(e0)
        while True:
            nxt = [e for e in loop[-1].link_edges if e.is_boundary and e not in used]
            if not nxt: break
            used.add(nxt[0]); w_ = nxt[0].other_vert(loop[-1])
            if w_ is loop[0]: break
            loop.append(w_)
        if len(loop) < 12: continue
        cz = sum(v.co.z for v in loop) / len(loop); cxa = sum(abs(v.co.x) for v in loop) / len(loop)
        if cz < z_bot + 0.03 and cxa < 0.30: continue          # the waist edge is under the belt: no binding
        cen = sum((v.co for v in loop), Vector()) / len(loop)
        pts, _ = resample(smooth_pts([v.co.copy() for v in loop], 2, closed=True), step=0.010, closed=True)
        sweep(tm, pts, [(p - cen).normalized() for p in pts], prof, closed=True, uv_v=TRIM['strap'], u_scale=TRIM_U); nb += 1
    bm.to_mesh(m3); bm.free(); m3.update()
    for p in m3.polygons: p.use_smooth = True
    m3.materials.clear(); m3.materials.append(M_CLOTH)
    while len(m3.uv_layers) > 1: m3.uv_layers.remove(m3.uv_layers[-1])
    done(ob, 'spine_05', 'Torso')
    if nb: done(tm.build('SUR_Robe_Trim', [M_TRIM]), 'spine_05', 'Torso')
    print('KAFTAN upper tris %d, bottom %.3f collar %.3f, bound edges %d' % (sum(len(p.vertices) - 2 for p in m3.polygons), z_bot, z_col, nb))

def build_sleeves():
    pass          # the sleeves are part of the kaftan upper now
