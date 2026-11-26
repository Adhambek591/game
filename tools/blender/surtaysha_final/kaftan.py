# Executed inside the build.py / pieces.py namespace.
# Under-kaftan upper (torso + both sleeves to the wrist, one piece), made on the body surface itself: this body's
# trapezius / deltoids / chest are far outside any oval section, so the old superellipse robe and the separate balloon
# sleeves sat inside the flesh at the shoulders. Here the body faces of the trunk above the belt line and of the arms
# are lifted 1-1.3 cm off the skin, relaxed, and cut at the waist, the wrists and the collar.
# Replaces build_robe_torso and build_sleeves. Piece: SUR_Robe_Torso (M_Cloth, body UV islands; the bake re-packs them).
def build_robe_torso():
    import bmesh
    me = proxy.data
    gname = {g.index: g.name for g in proxy.vertex_groups}
    OUTK = ('hand_', 'thumb', 'index', 'middle', 'ring', 'pinky', 'head', 'neck_02', 'FACIAL', 'thigh', 'calf', 'foot', 'ball', 'toe')
    z_bot = bone('spine_01').z - 0.03                     # hidden under the waist guard / belt
    z_col = min(bone('neck_01').z + 0.03, bone('head').z - 0.10)      # low stand collar
    wr = {s: (bone('lowerarm_' + s), bone('hand_' + s)) for s in 'lr'}
    def keep(v):
        p = v.co
        w = sum(g.weight for g in v.groups if any(k in gname.get(g.group, '') for k in OUTK))
        if w > 0.5: return False
        if p.z < z_bot and abs(p.x) < 0.33: return False
        if p.z > z_col and abs(p.x) < 0.13: return False
        for s in 'lr':
            a, b = wr[s]; d = (b - a).normalized()
            if (p - b).dot(d) > -0.025 and (p - b).length < 0.20: return False        # cuff ends 2.5 cm short of the wrist joint
        return True
    KEEP = [keep(v) for v in me.vertices]                  # vertex groups live on the mesh vertices, not on BMVerts
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not KEEP[v.index]], context='VERTS')
    # the exported body is split along its UV seams: weld it back into one sheet, then drop stray islands
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
    for v in bm.verts: v.co += v.normal * 0.013
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(6): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in inner: v.co += v.normal * 0.0025                 # give back what the relaxing took
    m2 = bpy.data.meshes.new('SUR_Robe_Torso'); bm.to_mesh(m2); bm.free()
    ob = bpy.data.objects.new('SUR_Robe_Torso', m2); bpy.context.scene.collection.objects.link(ob)
    ob.vertex_groups.clear()
    m = ob.modifiers.new('dc', 'DECIMATE'); m.ratio = min(1.0, 14000.0 / max(1, sum(len(p.vertices) - 2 for p in m2.polygons)))
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    m3 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); ob.modifiers.clear(); ob.data = m3; bpy.data.meshes.remove(m2); m3.name = 'SUR_Robe_Torso'
    for p in m3.polygons: p.use_smooth = True
    m3.materials.clear(); m3.materials.append(M_CLOTH)
    while len(m3.uv_layers) > 1: m3.uv_layers.remove(m3.uv_layers[-1])
    done(ob, 'spine_05', 'Torso')
    print('KAFTAN upper tris %d, bottom %.3f collar %.3f' % (sum(len(p.vertices) - 2 for p in m3.polygons), z_bot, z_col))

def build_sleeves():
    pass          # the sleeves are part of the kaftan upper now
