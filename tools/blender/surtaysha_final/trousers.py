# Executed inside the build.py / pieces.py namespace (after boots.py: BOOT_TOP is known).
# Surtaysha's trousers, built on the final body itself: the pelvis and both legs are measured slice by slice on the body
# mesh, lofted as three closed tubes with ease, unioned by a voxel remesh, cut open at the waist and inside the boots.
# Baggy dark wool trousers tucked into the riding boots, ballooning over the boot tops (reference turnaround).
# One piece: SUR_Trousers (M_Cloth, three UV islands: seat, left leg, right leg; seams at the centre back and the inseams).
def build_trousers():
    import bmesh
    V = FIT.V
    th = bone('thigh_l'); ca = bone('calf_l')
    crotch = min(p.z for p in V if abs(p.x) < 0.012 and 0.60 < p.z < 1.15)
    z_waist = bone('spine_02').z + 0.045            # trouser top: just under the navel
    z_cuff = BOOT_TOP - 0.075                       # hidden inside the boot shaft
    NA = 40
    print('TROUSERS crotch %.3f waist %.3f cuff %.3f' % (crotch, z_waist, z_cuff))

    def leg_slice(z):
        t = [p for p in V if abs(p.z - z) < 0.008 and 0.018 < p.x < th.x + 0.19]
        xs = [p.x for p in t]; ys = [p.y for p in t]
        return (min(xs) + max(xs)) / 2, (max(xs) - min(xs)) / 2, (min(ys) + max(ys)) / 2, (max(ys) - min(ys)) / 2
    LEG = {}
    z = z_cuff - 0.03
    while z < crotch + 0.001:
        LEG[round(z, 3)] = leg_slice(z); z += 0.01
    zk = sorted(LEG)
    def leg_at(z):
        k = min(zk, key=lambda q: abs(q - z)); return LEG[k]

    def leg_ring(z, side):
        zz = min(z, crotch - 0.004)
        cx, hx, cy, hy = leg_at(zz)
        shr = 1.0
        if z > crotch:                                   # inside the seat: slide toward the hip joint and shrink away
            t = min(1.0, (z - crotch) / 0.10); cx = cx + (th.x - cx) * t; cy = cy + (th.y - cy) * t; shr = 1.0 - 0.45 * t
        ease = 0.016 + 0.014 * smoothstep(BOOT_TOP + 0.10, BOOT_TOP + 0.30, z)          # baggier on the thigh
        rx, ry = (hx + ease) * shr, (hy + ease) * shr
        if z < BOOT_TOP - 0.004:                          # tucked into the boot
            rx, ry = min(rx, hx + 0.004), min(ry, hy + 0.004)
        elif z < BOOT_TOP + 0.12:                         # balloons over the boot top, then falls back to the leg
            b = 0.121 - 0.034 * smoothstep(BOOT_TOP + 0.035, BOOT_TOP + 0.12, z)
            rx, ry = max(rx, b), max(ry, b * 1.04)
        ring = []
        for i in range(NA):
            a = 2 * math.pi * i / NA
            w = 1 + 0.035 * math.sin(a * 5 + z * 19.0) * smoothstep(BOOT_TOP + 0.10, BOOT_TOP + 0.22, z) * (1 - smoothstep(crotch - 0.10, crotch, z))
            ring.append(Vector((side * (cx + rx * w * math.cos(a)), cy + ry * w * math.sin(a), z)))
        return ring

    def seat_ring(z):
        t = [p for p in V if abs(p.z - z) < 0.008 and abs(p.x) < 0.29 and abs(p.y) < 0.40]      # 0.29: the forearms hang beside the waist in the A-pose
        hx = max(abs(p.x) for p in t); yf = -min(p.y for p in t); yb = max(p.y for p in t)
        e = 0.030 - 0.012 * smoothstep(crotch + 0.02, crotch + 0.16, z) - 0.010 * smoothstep(z_waist - 0.06, z_waist, z)   # as loose as the thigh at the fork, drawn in at the waist
        n = 2.5; ring = []
        for i in range(NA * 2):
            u = 2 * math.pi * i / (NA * 2); s, c = math.sin(u), math.cos(u)
            x = (hx + e) * math.copysign(abs(s) ** (2 / n), s)
            y = -(yf + e) * abs(c) ** (2 / n) if c > 0 else (yb + e) * abs(c) ** (2 / n)
            ring.append(Vector((x, y, z)))
        return ring

    bm = bmesh.new()
    def tube(rings):
        vs = [[bm.verts.new(p) for p in r] for r in rings]; n = len(vs[0])
        for j in range(len(vs) - 1):
            for i in range(n):
                bm.faces.new((vs[j][i], vs[j][(i + 1) % n], vs[j + 1][(i + 1) % n], vs[j + 1][i]))
        bm.faces.new(list(reversed(vs[0]))); bm.faces.new(vs[-1])
    for side in (1, -1):
        zs = []; z = z_cuff - 0.025
        while z < crotch + 0.09: zs.append(z); z += 0.0125
        tube([leg_ring(z, side) for z in zs])
    zs = []; z = crotch - 0.028
    while z < z_waist + 0.03: zs.append(z); z += 0.0125
    tube([seat_ring(z) for z in zs])
    # dropped gusset between the thighs (closes the fork: no pit under the seat)
    t_ = [p for p in V if abs(p.z - crotch - 0.02) < 0.01 and abs(p.x) < 0.10]
    gy0, gy1 = min(p.y for p in t_) - 0.02, max(p.y for p in t_) + 0.02; gcy, gry = (gy0 + gy1) / 2, (gy1 - gy0) / 2
    gin = leg_at(crotch - 0.03); grx = max(0.05, gin[0] - gin[1] + 0.045)
    r_ = bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=1.0)
    for v_ in r_['verts']:
        v_.co = Vector((v_.co.x * grx, gcy + v_.co.y * gry, crotch - 0.025 + v_.co.z * 0.085))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('SUR_Trousers'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('SUR_Trousers', me); bpy.context.scene.collection.objects.link(ob)
    def bake_mods():
        # apply the modifier stack without operators (no selection / context needed in background mode)
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        nm_ = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); old = ob.data; ob.modifiers.clear(); ob.data = nm_; bpy.data.meshes.remove(old); nm_.name = 'SUR_Trousers'
    m = ob.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = 0.0075; m.use_smooth_shade = True
    m = ob.modifiers.new('sm', 'SMOOTH'); m.factor = 0.6; m.iterations = 30
    bake_mods()
    # cut open: waist and cuffs
    bm = bmesh.new(); bm.from_mesh(ob.data)
    for co, no, outer in ((Vector((0, 0, z_waist)), Vector((0, 0, 1)), True), (Vector((0, 0, z_cuff)), Vector((0, 0, 1)), False)):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=outer, clear_inner=not outer)
    bm.to_mesh(ob.data); bm.free()
    m = ob.modifiers.new('dc', 'DECIMATE'); m.ratio = min(1.0, 11000.0 / max(1, sum(len(p.vertices) - 2 for p in ob.data.polygons)))
    bake_mods()
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # make sure "outside" is outside: area-weighted test against the direction away from the limb / body axis
    sc_ = 0.0
    for f in bm.faces:
        c = f.calc_center_median()
        if c.z > crotch: ax = Vector((0, 0, c.z))
        else:
            cx, hx, cy, hy = leg_at(c.z); ax = Vector(((1 if c.x > 0 else -1) * cx, cy, c.z))
        sc_ += f.normal.dot(c - ax) * f.calc_area()
    if sc_ < 0:
        for f in bm.faces: f.normal_flip()
    # ---- UVs: seat (seam centre back), left leg, right leg (seams on the inseam); metric, the bake packs them
    uv = bm.loops.layers.uv.new('UVMap')
    def wrap(a): return (a + math.pi) % (2 * math.pi) - math.pi
    for f in bm.faces:
        c = f.calc_center_median()
        if c.z > crotch - 0.005:
            ang = lambda p: math.atan2(p.x, -p.y); rad = 0.20; u0, v0 = 0.0, 0.0
        else:
            sd = 1 if c.x > 0 else -1
            def ang(p, sd=sd):
                cx, hx, cy, hy = leg_at(p.z); return math.atan2(p.y - cy, sd * p.x - cx)
            rad = 0.11; u0, v0 = (1.5 if sd > 0 else 2.4), 0.0
        ac = ang(c)
        for l in f.loops:
            p = l.vert.co; a = ac + wrap(ang(p) - ac)
            l[uv].uv = (u0 + a * rad, v0 + p.z)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()
    for p in ob.data.polygons: p.use_smooth = True
    ob.data.materials.append(M_CLOTH)
    done(ob, 'pelvis', 'Cloth')
    print('TROUSERS tris', sum(len(p.vertices) - 2 for p in ob.data.polygons))
