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

    # loose straight leg: from the widest part of the thigh the cloth hangs down to the boot top (no "knee waist"),
    # bunches over the boot top and is tucked into the shaft
    z_wide = max((q for q in zk if q > BOOT_TOP + 0.25), key=lambda q: LEG[q][1]); R_WX = LEG[z_wide][1] + 0.030; R_WY = LEG[z_wide][3] + 0.030
    R_TOP = 0.116
    print('TROUSERS widest thigh z %.3f rx %.3f ry %.3f' % (z_wide, R_WX, R_WY))
    def leg_ring(z, side):
        zz = min(z, crotch - 0.004)
        cx, hx, cy, hy = leg_at(zz)
        shr = 1.0
        if z > crotch:                                   # inside the seat: slide toward the hip joint and shrink away
            t = min(1.0, (z - crotch) / 0.10); cx = cx + (th.x - cx) * t; cy = cy + (th.y - cy) * t; shr = 1.0 - 0.45 * t
        ease = 0.014 + 0.003 * smoothstep(BOOT_TOP + 0.10, BOOT_TOP + 0.30, z)          # close fit (author): 1.5 cm of ease, follows thigh, knee and calf
        rx, ry = (hx + ease) * shr, (hy + ease) * shr
        if z < BOOT_TOP - 0.004:                          # tucked into the boot
            rx, ry = min(rx, hx + 0.004), min(ry, hy + 0.004)
        elif z < BOOT_TOP + 0.075:                        # the leg is pushed up a little by the boot top: a soft roll of cloth, no balloon
            b_ = 0.011 * math.sin(math.pi * (z - BOOT_TOP + 0.004) / 0.079)
            rx, ry = rx + b_, ry + b_
        ring = []
        for i in range(NA):
            a = 2 * math.pi * i / NA
            w = 1.0
            ring.append(Vector((side * (cx + rx * w * math.cos(a)), cy + ry * w * math.sin(a), z)))
        return ring

    def seat_ring(z):
        t = [p for p in V if abs(p.z - z) < 0.008 and abs(p.x) < 0.29 and abs(p.y) < 0.40]      # 0.29: the forearms hang beside the waist in the A-pose
        hx = max(abs(p.x) for p in t); yf = -min(p.y for p in t); yb = max(p.y for p in t)
        e = 0.017 - 0.004 * smoothstep(crotch + 0.02, crotch + 0.16, z) - 0.005 * smoothstep(z_waist - 0.06, z_waist, z)   # same ease as the thigh at the fork, snug at the waist
        n = 3.8 - 1.3 * smoothstep(crotch + 0.06, crotch + 0.22, z); e += 0.005 * (1 - smoothstep(crotch + 0.04, crotch + 0.16, z)); ring = []      # squarer low on the hips: the thigh fronts stand forward of an oval there
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
        v_.co = Vector((v_.co.x * (grx + 0.012), gcy + v_.co.y * gry, crotch - 0.010 + v_.co.z * 0.11))      # tall enough to fill the fork up into the seat (no crease)
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
    # folds of close-fitting cloth: a few soft creases behind the knee, bunching just over the boot top, faint drag lines
    # down the thigh; and a flat waistband (a 3.5 cm band standing 2.5 mm proud)
    z_knee = bone('calf_l').z
    for v in ob.data.vertices:
        p = v.co
        if p.z > z_waist - 0.036:
            d = Vector((p.x, p.y, 0))
            if d.length > 1e-4: v.co = p + d.normalized() * 0.0025
            continue
        if p.z >= crotch - 0.02 or p.z < BOOT_TOP - 0.01: continue
        cx, hx, cy, hy = leg_at(p.z); sd = 1 if p.x > 0 else -1
        d = Vector((p.x - sd * cx, p.y - cy, 0)); a = math.atan2(d.y, d.x * sd)
        if d.length < 1e-4: continue
        back = max(0.0, math.sin(a))                                                  # 1 at the back of the leg
        f = 0.0016 * math.sin(7 * a + 1.3 * math.sin(p.z * 14.0)) * smoothstep(BOOT_TOP + 0.10, z_knee + 0.10, p.z) * (1 - smoothstep(crotch - 0.14, crotch - 0.03, p.z))
        f += 0.0042 * math.sin((p.z - z_knee) / 0.024 * 2 * math.pi + 1.5 * math.cos(a)) * math.exp(-((p.z - z_knee) / 0.045) ** 2) * (0.25 + 0.75 * back)
        f += 0.0040 * math.sin((p.z - BOOT_TOP) / 0.030 * 2 * math.pi + 2.0 * math.sin(3 * a)) * (1 - smoothstep(BOOT_TOP + 0.03, BOOT_TOP + 0.10, p.z)) * smoothstep(BOOT_TOP - 0.005, BOOT_TOP + 0.015, p.z)
        v.co = p + d.normalized() * f
    # cut open: waist and cuffs
    bm = bmesh.new(); bm.from_mesh(ob.data)
    # the fork: relax the surface where the seat meets the legs so no crease is left under the front of the seat
    fk = [v for v in bm.verts if crotch - 0.07 < v.co.z < crotch + 0.07 and abs(v.co.x) < 0.14]
    for _ in range(40): bmesh.ops.smooth_vert(bm, verts=fk, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    # and the line where the seat tube ends on the thighs: melt the ledge all round, then give back the few mm the
    # smoothing takes (the cloth must stay outside the body)
    bd = [v for v in bm.verts if crotch - 0.085 < v.co.z < crotch + 0.05]
    for _ in range(30): bmesh.ops.smooth_vert(bm, verts=bd, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in bd:
        w_ = smoothstep(crotch - 0.085, crotch - 0.05, v.co.z) * (1 - smoothstep(crotch + 0.02, crotch + 0.05, v.co.z))
        n_ = Vector((v.normal.x, v.normal.y, 0)); c_ = Vector((v.co.x, v.co.y, 0))
        if n_.dot(c_) < 0: n_ = -n_                      # outward, whatever the face winding is at this stage
        if abs(v.co.x) > 0.06 or abs(v.co.y) > 0.10: v.co += n_ * 0.0035 * w_
    for co, no, outer in ((Vector((0, 0, z_waist)), Vector((0, 0, 1)), True), (Vector((0, 0, z_cuff)), Vector((0, 0, 1)), False)):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=outer, clear_inner=not outer)
    bm.to_mesh(ob.data); bm.free()
    m = ob.modifiers.new('dc', 'DECIMATE'); m.ratio = min(1.0, 16000.0 / max(1, sum(len(p.vertices) - 2 for p in ob.data.polygons)))
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
