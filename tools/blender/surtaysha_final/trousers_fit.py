# Executed inside the build.py / pieces.py namespace (after trousers.py: replaces build_trousers).
# Author (26 Nov): the trousers must sit right on the leg, a cloth thickness off the skin, no ease, no roll.
# So they are made like the kaftan: the body faces of the seat and legs lifted 3.5 mm, relaxed a little in the fork and
# the gluteal cleft, cut at the waist and inside the boot. Wrinkles are in the normal map only (bake kind 'trouser').
def build_trousers():
    import bmesh
    me = proxy.data
    gname = {g.index: g.name for g in proxy.vertex_groups}
    ARMK = ('upperarm', 'lowerarm', 'hand_', 'thumb', 'index', 'middle', 'ring', 'pinky', 'wrist')
    z_waist = bone('spine_02').z + 0.045
    z_cuff = BOOT_TOP - 0.035
    def keep(v):
        p = v.co
        if p.z > z_waist or p.z < z_cuff: return False
        return sum(g.weight for g in v.groups if any(k in gname.get(g.group, '') for k in ARMK)) < 0.3
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
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
    crotch = min(p.z for p in FIT.V if abs(p.x) < 0.012 and 0.60 < p.z < 1.15)
    for v in bm.verts: v.co += v.normal * 0.0035
    # fork and cleft: cloth bridges them, it does not follow them in
    fk = [v for v in bm.verts if not v.is_boundary and crotch - 0.05 < v.co.z < crotch + 0.16 and abs(v.co.x) < 0.045]
    for _ in range(10): bmesh.ops.smooth_vert(bm, verts=fk, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in fk: v.co += v.normal * 0.007
    # flat waistband: the top 3.5 cm stand 2 mm proud
    for v in bm.verts:
        if v.co.z > z_waist - 0.036:
            d = Vector((v.co.x, v.co.y, 0))
            if d.length > 1e-4: v.co += d.normalized() * 0.002
    m2 = bpy.data.meshes.new('SUR_Trousers'); bm.to_mesh(m2); bm.free()
    ob = bpy.data.objects.new('SUR_Trousers', m2); bpy.context.scene.collection.objects.link(ob)
    m = ob.modifiers.new('dc', 'DECIMATE'); m.ratio = min(1.0, 16000.0 / max(1, sum(len(p.vertices) - 2 for p in m2.polygons)))
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    m3 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); ob.modifiers.clear(); ob.data = m3; bpy.data.meshes.remove(m2); m3.name = 'SUR_Trousers'
    for p in m3.polygons: p.use_smooth = True
    m3.materials.clear(); m3.materials.append(M_CLOTH)
    while len(m3.uv_layers) > 1: m3.uv_layers.remove(m3.uv_layers[-1])
    done(ob, 'pelvis', 'Cloth')
    print('TROUSERS on the body surface: tris %d, waist %.3f cuff %.3f' % (sum(len(p.vertices) - 2 for p in m3.polygons), z_waist, z_cuff))
