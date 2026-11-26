# Executed inside the build.py / pieces.py namespace at REAL body size (SUR_DESIGN_K=1): replaces build_cuirass.
# Lamellar cuirass made on this body: a smooth shell 1 cm over the kaftan (the torso without the arms, lifted 2.3 cm
# off the skin, voxel-remeshed and relaxed), covered with overlapping plate rows from the waist guard up to the
# collar-bone line, all round, open at the neck and the armholes; leather backing under the plates, leather edging on
# the neck / armhole edges, two leather straps lying on the shoulders. Heights come from the bones, nothing from the
# 185 cm kit tables.
def build_cuirass():
    import bmesh
    from mathutils.bvhtree import BVHTree as _BV
    from mathutils.kdtree import KDTree as _KD
    me = proxy.data
    gname = {g.index: g.name for g in proxy.vertex_groups}
    ARMK = ('upperarm', 'lowerarm', 'hand_', 'thumb', 'index', 'middle', 'ring', 'pinky', 'wrist')
    LEGK = ('thigh', 'calf', 'foot', 'ball', 'toe', 'head', 'FACIAL')
    z_lo = bone('spine_02').z + 0.012                      # first row starts here, under the waist guard
    z_top = bone('clavicle_l').z + 0.012                   # last row tops out at the collar-bone line
    z_neck = bone('neck_01').z - 0.015
    armw = [sum(g.weight for g in v.groups if any(k in gname.get(g.group, '') for k in ARMK)) for v in me.vertices]
    legw = [sum(g.weight for g in v.groups if any(k in gname.get(g.group, '') for k in LEGK)) for v in me.vertices]
    kd = _KD(len(me.vertices))
    for i, v in enumerate(me.vertices): kd.insert(v.co, i)
    kd.balance()
    def is_arm(p):
        co, i, d = kd.find(p); return armw[i] >= 0.20
    # ---- smooth shell over the kaftan
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if armw[v.index] >= 0.20 or legw[v.index] > 0.5 or v.co.z < z_lo - 0.10 or v.co.z > bone('neck_01').z + 0.06], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.0115          # kaftan (4.5 mm) + 7 mm
    m0 = bpy.data.meshes.new('cenv'); bm.to_mesh(m0); bm.free()
    o0 = bpy.data.objects.new('cenv', m0); bpy.context.scene.collection.objects.link(o0)
    m_ = o0.modifiers.new('rm', 'REMESH'); m_.mode = 'VOXEL'; m_.voxel_size = 0.008
    m_ = o0.modifiers.new('sm', 'SMOOTH'); m_.factor = 0.5; m_.iterations = 10
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    ev = bpy.data.meshes.new_from_object(o0.evaluated_get(dg)); ev.calc_loop_triangles()
    EV = [v.co.copy() for v in ev.vertices]; EN = [v.normal.copy() for v in ev.vertices]; EF = [tuple(t.vertices) for t in ev.loop_triangles]
    bpy.data.objects.remove(o0); bpy.data.meshes.remove(m0); bpy.data.meshes.remove(ev)
    env = _BV.FromPolygons(EV, EF)
    cyz = {}
    def axis(v):
        k = round(v, 2)
        if k not in cyz:
            pts = FIT.sp.get(min(FIT.sp, key=lambda q: abs(q - k)), [])
            cyz[k] = sum(p[1] for p in pts) / len(pts) if pts else 0.0
        return Vector((0.0, cyz[k], v))
    neck = Vector((0.0, bone('neck_01').y, 0.0))
    def covered(p):
        """is this point of the shell part of the cuirass? (not the arm stumps, not the neck column)"""
        if p.z < z_lo - 0.02 or p.z > z_top + 0.03: return False
        if is_arm(p): return False
        if p.z > z_neck and (Vector((p.x, p.y, 0)) - neck).length < 0.105: return False
        return True
    # the plate rows hang on a single-valued, smooth radial surface r(u, v) around the trunk axis: sampled from the
    # shell by horizontal rays, arm stumps filled from their neighbours, then smoothed in both directions (an overhang
    # such as the underside of the chest would otherwise turn the plates of that row on their faces)
    NU, DV = 240, 0.01; v0g = z_lo - 0.04; NV = int((z_top + 0.10 - v0g) / DV) + 1
    Rg = [[None] * NV for _ in range(NU)]; OK = [[False] * NV for _ in range(NU)]
    for a in range(NU):
        u = 2 * math.pi * a / NU; d = Vector((math.sin(u), -math.cos(u), 0.0))
        for b in range(NV):
            o = axis(v0g + b * DV); h = env.ray_cast(o, d, 1.0)
            if h[0] is not None and not is_arm(h[0]):
                Rg[a][b] = (h[0] - o).length; OK[a][b] = covered(h[0])
    for b in range(NV):                                   # fill the arm openings along u from the nearest valid samples
        col = [Rg[a][b] for a in range(NU)]
        if all(c is None for c in col):
            for a in range(NU): Rg[a][b] = 0.2
            continue
        for a in range(NU):
            if col[a] is None:
                k = 1
                while col[(a - k) % NU] is None and col[(a + k) % NU] is None: k += 1
                l_, r_ = col[(a - k) % NU], col[(a + k) % NU]
                Rg[a][b] = l_ if r_ is None else (r_ if l_ is None else (l_ + r_) / 2)
    raw = [row[:] for row in Rg]
    def sm_v(G, n):
        for _k in range(n):
            T = [row[:] for row in G]
            for a in range(NU):
                for b in range(1, NV - 1): T[a][b] = (G[a][b - 1] + G[a][b] + G[a][b + 1]) / 3
            G = T
        return G
    def sm_u(G, n):
        for _k in range(n):
            T = [row[:] for row in G]
            for a in range(NU):
                for b in range(NV): T[a][b] = (G[(a - 1) % NU][b] + G[a][b] + G[(a + 1) % NU][b]) / 3
            G = T
        return G
    # lamellae hang: the shell bridges hollows (under the chest, the small of the back) and has no ledges. An upper
    # envelope of the kaftan shell is grown by "smooth, then lift back onto the body" rounds and finished with a pure
    # smoothing (it may then sit up to a few mm inside the 7 mm margin, never in the kaftan)
    for _ in range(8):
        Rg = sm_u(sm_v(Rg, 8), 2)
        for a in range(NU):
            for b in range(NV): Rg[a][b] = max(Rg[a][b], raw[a][b])
    Rg = sm_u(sm_v(Rg, 6), 3)
    for a in range(NU):
        for b in range(NV): Rg[a][b] = max(Rg[a][b], raw[a][b] - 0.005)
    Rg = sm_u(sm_v(Rg, 2), 1)
    for b in range(0, NV, 4):
        gs = [Rg[a][b] - raw[a][b] for a in range(NU) if OK[a][b]]
        if gs: print('CUIRASS gap over the kaftan shell at z %.2f: max %.1f mm, mean %.1f mm' % (v0g + b * DV, max(gs) * 1000, sum(gs) / len(gs) * 1000))
    def S(u, v):
        fa = (u % (2 * math.pi)) / (2 * math.pi) * NU; a0 = int(fa) % NU; ta = fa - int(fa)
        fb = min(max((v - v0g) / DV, 0.0), NV - 1.001); b0 = int(fb); tb = fb - b0
        r = (Rg[a0][b0] * (1 - ta) + Rg[(a0 + 1) % NU][b0] * ta) * (1 - tb) + (Rg[a0][b0 + 1] * (1 - ta) + Rg[(a0 + 1) % NU][b0 + 1] * ta) * tb
        return axis(v) + Vector((math.sin(u), -math.cos(u), 0.0)) * r
    def ok_at(u, v):
        a0 = int(round((u % (2 * math.pi)) / (2 * math.pi) * NU)) % NU; b0 = int(round(min(max((v - v0g) / DV, 0), NV - 1)))
        return OK[a0][b0]
    def mask(u, v):
        if v + PLATE_H * 0.80 > z_top + 0.006: return False
        return ok_at(u, v) and ok_at(u, v + PLATE_H * 0.5) and ok_at(u - 0.03, v + PLATE_H * 0.3) and ok_at(u + 0.03, v + PLATE_H * 0.3)
    mb = MB()
    rows = []; v = z_lo
    while v + PLATE_H * 0.80 <= z_top + 0.006: rows.append(v); v += 0.044
    n = place_rows(mb, S, rows, 0.0255, lambda p: Vector((0, axis(p.z).y, p.z)), rng, PLATES, LACES, closed=True, u_range=(0, 2 * math.pi), mask=mask)
    print('CUIRASS native: rows %d (%.3f..%.3f), plates %d' % (len(rows), rows[0], rows[-1], n))
    done(mb.build('SUR_Cuirass_Lamellar', [M_LAM]), 'spine_04', 'Torso')
    # ---- leather backing: the shell itself, 3.5 mm in, where the cuirass is
    bm = bmesh.new(); vv = [bm.verts.new(EV[i] - EN[i] * 0.0035) for i in range(len(EV))]
    for f in EF:
        c = (EV[f[0]] + EV[f[1]] + EV[f[2]]) / 3
        if covered(c):
            try: bm.faces.new((vv[f[0]], vv[f[1]], vv[f[2]]))
            except ValueError: pass
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for k, l in enumerate(f.loops): l[uvl].uv = (0.31 + 0.002 * (k % 2), 0.244)
    # boundary loops of the backing (neck opening, armholes, bottom) for the edging
    loops = []; used = set()
    for e0 in [e for e in bm.edges if e.is_boundary]:
        if e0 in used: continue
        loop = [e0.verts[0], e0.verts[1]]; used.add(e0)
        while True:
            nxt = [e for e in loop[-1].link_edges if e.is_boundary and e not in used]
            if not nxt: break
            used.add(nxt[0]); w_ = nxt[0].other_vert(loop[-1])
            if w_ is loop[0]: break
            loop.append(w_)
        if len(loop) > 20: loops.append([v.co.copy() for v in loop])
    bkm = bpy.data.meshes.new('SUR_Cuirass_Backing'); bm.to_mesh(bkm); bm.free()
    bko = bpy.data.objects.new('SUR_Cuirass_Backing', bkm); bpy.context.scene.collection.objects.link(bko)
    bkm.materials.append(M_TRIM)
    for p_ in bkm.polygons: p_.use_smooth = True
    done(bko, 'spine_04', 'Torso')
    # ---- leather edging on the neck and armhole edges (not on the bottom edge: the waist guard covers it)
    tm = MB(); prof = edging_profile(w_front=0.022, w_back=0.010, t=0.007); ne = 0
    for lp in loops:
        if sum(p.z for p in lp) / len(lp) < z_lo + 0.03: continue
        pts, _ = resample(smooth_pts(lp, 8, closed=True), step=0.012, closed=True)
        ups = []
        for p in pts:
            h = env.find_nearest(p); ups.append(h[1] if h[1] is not None else Vector((p.x, p.y, 0)).normalized())
        sweep(tm, [p + u_ * 0.004 for p, u_ in zip(pts, ups)], ups, prof, closed=True, uv_v=TRIM['edge'], u_scale=TRIM_U); ne += 1
    # ---- shoulder straps lying on the shoulders: from the front top edge over the trapezius to the back top edge
    for sx in (1, -1):
        x = sx * (abs(bone('upperarm_l').x) - 0.045); path = []; ups2 = []          # over the middle of the shoulder
        y = -0.30
        while y < 0.36:
            h = env.ray_cast(Vector((x, y, 2.2)), Vector((0, 0, -1)), 1.5)
            if h[0] is not None and h[0].z > z_top - 0.05: path.append(h[0] + h[1] * 0.006); ups2.append(h[1])
            y += 0.012
        if len(path) > 6:
            path = smooth_pts(path, 3); strap(tm, path, ups2, w=0.044, t=0.006)
            rivet_line(tm, path, ups2, every=0.07, lift=0.006, rng=rng)
    done(tm.build('SUR_Cuirass_Trim', [M_TRIM]), 'spine_05', 'Torso')
    print('CUIRASS edging loops %d' % ne)
