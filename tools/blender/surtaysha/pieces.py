# Executed inside build.py namespace. Every piece of Surtaysha's kit.
# Conventions: metres, +Z up, -Y = front, +X = character's left. A-pose from the MetaHuman proxy.

def mirror_mb(mb):
    m = MB()
    m.v = [(-x, y, z) for x, y, z in mb.v]
    m.f = [tuple(reversed(f)) for f in mb.f]
    m.uv = [list(reversed(u)) for u in mb.uv]
    m.m = list(mb.m)
    return m

def build_pair(mbL, name, mats, boneL, group):
    obL = done(mbL.build(name + '_L', mats), boneL, group)
    obR = done(mirror_mb(mbL).build(name + '_R', mats), boneL[:-1] + 'r', group)
    obR['bake_skip'] = 1   # mirrored UVs overlap the left piece
    return obL, obR

def surf_normal(S, u, v, center_fn, e=1e-3):
    p = S(u, v)
    n = (S(u + e, v) - S(u - e, v)).cross(S(u, v + e) - S(u, v - e)).normalized()
    if n.dot(p - center_fn(p)) < 0: n = -n
    return n

# =========================================================== TORSO: cuirass
def cuirass_top(u):
    return 1.330 + 0.150 * (1 - smoothstep(0.42, 0.80, abs(math.sin(u))))

def build_cuirass():
    mb = MB()
    rows = [1.104 + 0.044 * i for i in range(8)]
    mask = lambda u, v: v + PLATE_H * 0.80 <= cuirass_top(u) + 0.006
    n = place_rows(mb, lambda u, v: torso_S(u, v), rows, 0.0255, axis_c, rng, PLATES, LACES, closed=True,
                   u_range=(0, 2 * math.pi), mask=mask)
    print('cuirass plates', n)
    done(mb.build('SUR_Cuirass_Lamellar', [M_LAM]), 'spine_04', 'Torso')
    bk = MB()
    nu = 96
    G = [[torso_S(2 * math.pi * i / nu, 1.098 + (cuirass_top(2 * math.pi * i / nu) - 0.004 - 1.098) * j / 8, grow=-0.0035) for i in range(nu)] for j in range(9)]
    shell(bk, G, 0.0, out_fn=lambda q: Vector((q.x, q.y, 0)), closed_u=True, back=False, walls=False)
    bk.uv = [[(0.31 + 0.002 * (k % 2), 0.244) for k in range(len(f))] for f in bk.uv]
    done(bk.build('SUR_Cuirass_Backing', [M_TRIM]), 'spine_04', 'Torso')
    # leather edging along top edge incl. armholes, + shoulder straps + rivets
    tm = MB()
    us = [2 * math.pi * k / 260 for k in range(260)]
    pts = [torso_S(u, cuirass_top(u), grow=0.004) for u in us]
    ups = [surf_normal(lambda a, b: torso_S(a, b), u, cuirass_top(u), axis_c) for u in us]
    upv = [(torso_S(u, cuirass_top(u) + 0.01) - torso_S(u, cuirass_top(u) - 0.01)).normalized() for u in us]
    prof = edging_profile(w_front=0.030, w_back=0.010, t=0.008)
    if (pts[1] - pts[0]).normalized().cross(ups[0]).dot(upv[0]) < 0:
        pts = pts[::-1]; ups = ups[::-1]; upv = upv[::-1]
    sweep(tm, pts, ups, prof, closed=True, uv_v=TRIM['edge'], u_scale=TRIM_U)
    rivet_line(tm, pts + [pts[0]], ups + [ups[0]], every=0.075, offset=-0.016, side_vecs=upv + [upv[0]], lift=0.0085, rng=rng)
    # shoulder straps (front top edge -> over trapezius -> back top edge)
    for sx in (1, -1):
        uf = math.asin(0.40) * sx; ub = math.pi - math.asin(0.40) * sx
        pf = torso_S(uf, cuirass_top(uf) - 0.02, grow=0.006); pb = torso_S(ub, cuirass_top(ub) - 0.02, grow=0.006)
        ctrl = [pf, Vector((pf.x * 1.02, pf.y * 0.55, 1.535)), Vector((pf.x * 1.04, 0.0, 1.575)),
                Vector((pb.x * 1.02, pb.y * 0.55, 1.535)), pb]
        path, _ = resample(smooth_pts([c.copy() for c in ctrl], 0), step=0.012)
        path = smooth_pts(path, 6)
        ups2 = [(p - Vector((p.x * 0.55, 0.0, 1.42))).normalized() for p in path]
        strap(tm, path, ups2, w=0.046, t=0.006)
        rivet_line(tm, path, ups2, every=0.07, lift=0.006, rng=rng)
    done(tm.build('SUR_Cuirass_Trim', [M_TRIM]), 'spine_05', 'Torso')

# =========================================================== under-robe torso, collar
ROBE_V1 = [(0.98, 0.205, 0.168, 0.095, 2.3), (1.20, 0.212, 0.172, 0.100, 2.4), (1.32, 0.222, 0.172, 0.118, 2.4),
        (1.44, 0.210, 0.150, 0.125, 2.4), (1.52, 0.150, 0.100, 0.115, 2.2), (1.575, 0.085, 0.075, 0.090, 2.0),
        (1.62, 0.078, 0.070, 0.080, 2.0)]
ROBE = FIT.cover(FIT.fit_table(ROBE_V1), 0.012)

def build_robe_torso():
    mb = MB()
    zs = [0.98 + (1.62 - 0.98) * j / 26 for j in range(27)]
    G = [[torso_S(2 * math.pi * i / 52, z, tab=ROBE) for i in range(52)] for z in zs]
    shell(mb, G, 0.004, out_fn=lambda p: Vector((p.x, p.y, 0)), closed_u=True, back=False)
    done(mb.build('SUR_Robe_Torso', [M_CLOTH]), 'spine_03', 'Cloth')

# =========================================================== waist guard, belt, plaques, buckle
def guard_top(u):
    c = math.cos(u); au = abs(math.atan2(math.sin(u), c))
    return 1.192 + 0.030 * max(0.0, c) ** 8 + 0.012 * math.exp(-((au - 0.78) / 0.17) ** 2)
def guard_bot(u):
    c = math.cos(u); au = abs(math.atan2(math.sin(u), c))
    return 1.036 - 0.052 * max(0.0, c) ** 14 - 0.014 * math.exp(-((au - 0.70) / 0.15) ** 2)
def build_belt():
    mb = MB()
    nu, nv = 132, 11
    G = [[torso_S(2 * math.pi * i / nu, guard_bot(2 * math.pi * i / nu) + (guard_top(2 * math.pi * i / nu) - guard_bot(2 * math.pi * i / nu)) * j / (nv - 1), grow=0.014)
          for i in range(nu)] for j in range(nv)]
    shell(mb, G, 0.006, out_fn=lambda p: Vector((p.x, p.y, 0)), closed_u=True)
    done(mb.build('SUR_WaistGuard', [M_ARM]), 'spine_01', 'Torso')
    # belt band
    bm = MB()
    us = [2 * math.pi * k / 160 for k in range(160)]
    pts = [torso_S(u, 1.093, grow=0.021) for u in us]
    ups = [surf_normal(lambda a, b: torso_S(a, b, grow=0.021), u, 1.093, axis_c) for u in us]
    strap(bm, pts, ups, w=0.064, t=0.007, key='belt', closed=True)
    rivet_line(bm, pts + [pts[0]], ups + [ups[0]], every=0.05, lift=0.007, rng=rng, r=0.0035)
    done(bm.build('SUR_Belt', [M_TRIM]), 'spine_01', 'Torso')
    # gold plaques + buckle (unique relief -> M_Armor)
    gm = MB()
    def plaque(u, w, h, thick, dome, nx, ny):
        p = torso_S(u, 1.093, grow=0.028)
        nrm = surf_normal(lambda a, b: torso_S(a, b, grow=0.028), u, 1.093, axis_c)
        M = frame(p, nrm, Vector((0, 0, 1)))
        G = []
        for j in range(ny + 1):
            row = []
            for i in range(nx + 1):
                x = (i / nx - 0.5) * w; y = (j / ny - 0.5) * h
                # rounded-rect: pull corners in
                cx, cy = abs(2 * x / w), abs(2 * y / h)
                if cx > 0.99 and cy > 0.99: x *= 0.93; y *= 0.93
                z = dome * (1 - (2 * x / w) ** 2) * (1 - (2 * y / h) ** 2)
                row.append(M @ Vector((x, y, z)))
            G.append(row)
        shell(gm, G, thick, out_fn=lambda q, n=nrm: n)
    for u in (0.42, 0.78, 1.14, 1.50, -0.42, -0.78, -1.14, -1.50):
        plaque(u, 0.044, 0.046, 0.005, 0.003, 8, 8)
    plaque(0.0, 0.112, 0.080, 0.007, 0.006, 14, 10)
    done(gm.build('SUR_Belt_Gold', [M_ARM]), 'spine_01', 'Torso')

# =========================================================== tassets (front, sides, back)
def tas_dims(v):
    d = max(0.0, 1.04 - v)
    a, bf, bb, n = interp_table(TORSO, 1.08)
    return a + 0.012 + d * 0.21, bf + 0.010 + d * 0.16, bb + 0.012 + d * 0.30, 2.4
def tas_S(u, v, grow=0.0):
    a, bf, bb, n = tas_dims(v)
    return torso_S(u, v, grow=grow, tab=[(v, a, bf, bb, n)])
def build_tassets():
    mb = MB(); tm = MB()
    panels = [  # (u0, u1, bottom_fn, name)
        (-0.40, 0.40, lambda u: 0.655 + 0.055 * abs(u) / 0.40),
        (0.62, 1.98, lambda u: 0.575),
        (-1.98, -0.62, lambda u: 0.575),
        (2.30, 2 * math.pi - 2.30, lambda u: 0.60)]
    top = 1.035
    for (u0, u1, bot) in panels:
        S = lambda u, w, bot=bot: tas_S(u, bot(u) + w)
        mg = 0.016 / 0.30   # angular margin for side edging
        rows = [0.012 + 0.044 * k for k in range(12) if bot(u0) + 0.012 + 0.044 * k + PLATE_H * 0.5 < top]
        def mask(u, w, bot=bot): return bot(u) + w + PLATE_H * 0.7 < top + 0.03
        place_rows(mb, S, rows, 0.0255, axis_c, rng, PLATES, LACES, closed=False, u_range=(u0 + mg, u1 - mg), mask=mask)
        # edging: down left side, along bottom, up right side (open U)
        pts = []; ups = []
        def addp(u, v):
            pts.append(tas_S(u, v, grow=0.004)); ups.append(surf_normal(tas_S, u, v, axis_c))
        K = 14
        for k in range(K + 1): addp(u0, top - (top - bot(u0)) * k / K)
        for k in range(1, 40): addp(u0 + (u1 - u0) * k / 40, bot(u0 + (u1 - u0) * k / 40))
        for k in range(K + 1): addp(u1, bot(u1) + (top - bot(u1)) * k / K)
        pts = smooth_pts(pts, 1);
        ctr = sum(pts, Vector()) / len(pts)
        prof = edging_profile(w_front=0.026, w_back=0.012, t=0.008)
        t0 = (pts[1] - pts[0]).normalized()
        outward0 = (tas_S(u0 - 0.05, top - 0.05) - tas_S(u0, top - 0.05)).normalized()
        if t0.cross(ups[0]).dot(outward0) < 0:
            pts = pts[::-1]; ups = ups[::-1]
        sweep(tm, pts, ups, prof, uv_v=TRIM['edge'], u_scale=TRIM_U)
    done(mb.build('SUR_Tassets_Lamellar', [M_LAM]), 'pelvis', 'Torso')
    bk = MB()
    for (u0, u1, bot) in panels:
        G = [[tas_S(u0 + (u1 - u0) * i / 20, bot(u0 + (u1 - u0) * i / 20) + 0.004 + (top - bot(u0 + (u1 - u0) * i / 20) - 0.004) * j / 10, grow=-0.004)
              for i in range(21)] for j in range(11)]
        shell(bk, G, 0.0, out_fn=lambda q: Vector((q.x, q.y, 0)), back=False, walls=False)
    bk.uv = [[(0.31 + 0.002 * (k % 2), 0.244) for k in range(len(f))] for f in bk.uv]
    done(bk.build('SUR_Tassets_Backing', [M_TRIM]), 'pelvis', 'Torso')
    done(tm.build('SUR_Tassets_Trim', [M_TRIM]), 'pelvis', 'Torso')

# =========================================================== coat skirt, trousers
_CD = FIT.torso_delta(1.10)
def coat_dims(z):
    a, bf, bb, n = coat_dims_v1(z)
    return a + _CD[0], bf + _CD[1], bb + _CD[2], n
def coat_dims_v1(z):
    t = (1.06 - z) / 0.66
    return 0.214 + t * 0.045, 0.180 + t * 0.035, 0.110 + t * 0.10, 2.3
def build_coat():
    """robe skirt: closed band at the waist, three panels below (front-left, back, front-right) with side slits
    so the legs can stride; each panel bordered with the braid trim"""
    mb = MB(); tm = MB(); sim = MB()
    COAT_HEM, SLIT_TOP = 0.525, 0.80
    tw = 0.058
    prof = [(-tw, 0.001), (-tw, 0.004), (0.0, 0.0045), (0.003, 0.002), (0.0, -0.004), (-tw, -0.0035), (-tw, 0.001)]
    def P(u, z):
        a, bf, bb, n = coat_dims(z)
        p = torso_S(u, z, tab=[(z, a, bf, bb, n)])
        depth = (1.07 - z) / 0.545
        amp = 0.006 + 0.016 * depth ** 1.2
        r = Vector((p.x, p.y, 0)).normalized()
        f = math.sin(u * 11 + 0.7 + 0.6 * math.sin(u * 3)); f = math.copysign(abs(f) ** 0.6, f)
        return p + r * amp * f + r * amp * 0.35 * math.sin(u * 23 + 2.1)
    def gap(z):
        return (0.030 + 0.045 * (1.07 - z) / 0.545) / coat_dims(z)[1]
    out = lambda q: Vector((q.x, q.y, 0))
    def panel(u0f, u1f, z0, z1, nz, nu, border):
        zs = [z0 + (z1 - z0) * j / nz for j in range(nz + 1)]
        G = [[P(u0f(z) + (u1f(z) - u0f(z)) * i / nu, z) for i in range(nu + 1)] for z in zs]
        shell(mb, G, 0.005, out_fn=out)
        shell(sim, G, 0.0, out_fn=out, back=False, walls=False)
        if border:
            path = [G[j][0] for j in range(len(G) - 1, -1, -1)] + G[0][1:] + [G[j][-1] for j in range(1, len(G))]
            sweep(tm, path, [out(q).normalized() for q in path], prof, uv_v=TRIM['border'], u_scale=TRIM_U)
        return G
    # waist band (closed except the front opening), hidden under the tassets at its lower edge
    panel(lambda z: gap(z), lambda z: 2 * math.pi - gap(z), SLIT_TOP - 0.01, 1.07, 9, 64, False)
    SL = 0.045                                   # half-width of each side slit (rad) at the hem
    sl = lambda z: SL * smoothstep(SLIT_TOP, COAT_HEM, z)
    panel(lambda z: gap(z), lambda z: math.pi / 2 + 0.10 - sl(z), COAT_HEM, SLIT_TOP, 12, 18, True)
    panel(lambda z: math.pi / 2 + 0.10 + sl(z), lambda z: 3 * math.pi / 2 - 0.10 - sl(z), COAT_HEM, SLIT_TOP, 12, 30, True)
    panel(lambda z: 3 * math.pi / 2 - 0.10 + sl(z), lambda z: 2 * math.pi - gap(z), COAT_HEM, SLIT_TOP, 12, 18, True)
    # front edges of the waist band carry the braid too
    for side in (0, 1):
        path = [P(gap(z) if side == 0 else 2 * math.pi - gap(z), z) for z in [SLIT_TOP + (1.07 - SLIT_TOP) * k / 9 for k in range(10)]]
        sweep(tm, path, [out(q).normalized() for q in path], prof, uv_v=TRIM['border'], u_scale=TRIM_U)
    done(mb.build('SUR_Coat', [M_CLOTH]), 'pelvis', 'Cloth')
    o = done(sim.build('SUR_Coat_Sim', [M_CLOTH]), 'pelvis', 'Cloth'); o['sim_mesh'] = 1; o['bake_skip'] = 1; o.hide_render = True
    done(tm.build('SUR_Coat_Border', [M_TRIM]), 'pelvis', 'Cloth')

def build_trousers():
    mbL = MB()
    th = bone('thigh_l'); ca = bone('calf_l'); ft = bone('foot_l')
    end = ca.lerp(ft, (ca.z - 0.43) / (ca.z - ft.z))
    path = []
    NT = 28
    for k in range(NT + 1):
        t = k / NT
        p = th.lerp(ca, t / 0.6) if t < 0.6 else ca.lerp(end, (t - 0.6) / 0.4)
        path.append(Vector((p.x, p.y + 0.005, p.z)))
    path[0] = path[0] + Vector((0.0, 0, 0.03))
    def shape(j, a):
        t = j / NT
        r = 0.108 - 0.022 * smoothstep(0.0, 0.6, t) - 0.024 * smoothstep(0.6, 1.0, t)
        z = path[j].z
        if 0.12 < z < 0.55:
            cx, hx, ymn, ymx = FIT.leg_at(z)[:4]
            r = max(r, max(hx, (ymx - ymn) / 2) + 0.010)
            if z < BOOT_TOP - 0.004: r = min(r, min(hx, (ymx - ymn) / 2) + 0.004)
            elif z < BOOT_TOP + 0.11:
                # the trouser leg balloons over the boot top (reference), as wide as the cuff, then falls back to the leg
                r = max(r, 0.121 - 0.034 * smoothstep(BOOT_TOP + 0.035, BOOT_TOP + 0.11, z))
        r *= 1 + 0.05 * math.sin(a * 5 + j * 0.5) * smoothstep(0.2, 0.7, t) * (1 - smoothstep(0.70, 0.80, t))
        return r * math.cos(a), r * math.sin(a) * 1.05
    G = loft_grid(path, shape, 24)
    shell(mbL, G, 0.004, out_fn=lambda p: p - min(path, key=lambda q: (q - p).length), closed_u=True, back=False)
    build_pair(mbL, 'SUR_Trousers', [M_CLOTH], 'thigh_l', 'Cloth')

# =========================================================== sleeves
SLEEVE_R0 = 0.10
def _arm_profile(a, b, t, K, rmax=0.14):
    """max radial extent of the body arm per angle bin, at station t on segment a->b (smoothed)"""
    d = (b - a).normalized(); c = a.lerp(b, t)
    x = d.orthogonal().normalized(); y = d.cross(x)
    bins = [0.0] * K
    for p in FIT.V:
        q = p - c; h = q.dot(d)
        if abs(h) > 0.008: continue
        r = q - d * h
        if r.length > rmax: continue
        ang = math.atan2(r.dot(y), r.dot(x)) % (2 * math.pi)
        k = int(ang / (2 * math.pi) * K) % K
        bins[k] = max(bins[k], r.length)
    m = max(bins) if max(bins) > 0 else 0.05
    bins = [v if v > 0 else m * 0.8 for v in bins]
    for _ in range(3):
        bins = [(bins[k - 1] + 2 * bins[k] + bins[(k + 1) % K]) / 4 for k in range(K)]
    return bins, x, y
def build_sleeves():
    global SLEEVE_R0
    mbL = MB()
    sh = bone('upperarm_l'); el = bone('lowerarm_l'); wr = bone('hand_l')
    K = 28
    nu_ = max(10, round((el - sh).length / 0.02)); nf_ = max(10, round((wr - el).length * 0.97 / 0.02))
    st = [(sh, el, -0.08)] + [(sh, el, k / nu_) for k in range(1, nu_ + 1)] + [(el, wr, k / nf_ * 0.97) for k in range(1, nf_ + 1)] + [(el, wr, 0.985)]
    def Rb(t): return 0.074 - 0.017 * smoothstep(0.28, 0.96, t)
    frames = ring_frames([a.lerp(b, t) for a, b, t in st])
    G = []
    for j, (a, b, t) in enumerate(st):
        upper = a is sh
        prof, _, _ = _arm_profile(a, b, max(t, 0.0), K, rmax=0.15 if upper else 0.11)
        c = a.lerp(b, t); tg, n, bn = frames[j]
        row = []
        for i in range(K):
            ang = 2 * math.pi * i / K
            # body extent in this direction (profile measured in the segment frame; resample into the path frame)
            dirv = n * math.cos(ang) + bn * math.sin(ang)
            d = (b - a).normalized(); x0 = d.orthogonal().normalized(); y0 = d.cross(x0)
            pa = math.atan2(dirv.dot(y0), dirv.dot(x0)) % (2 * math.pi)
            rb = prof[int(pa / (2 * math.pi) * K) % K]
            if upper:
                pad = 0.024 + 0.006 * math.sin(ang * 3 + j * 0.7)             # padded robe sleeve
                # compression folds in the armpit / elbow crease (inner side = toward the body / front)
                inner = max(0.0, -dirv.x) if True else 0.0
                pad += 0.007 * inner * max(0.0, math.sin(j * 1.9)) * smoothstep(0.55, 0.95, t)
                r = rb + pad
            elif j == len(st) - 1:
                r = 0.036
            else:
                pad = 0.020 * (1 - smoothstep(0.18, 0.30, t)) + 0.008
                fold = 0.006 * max(0.0, math.sin(j * 2.1 + ang)) * (1 - smoothstep(0.15, 0.28, t))
                r = min(rb + pad + fold, Rb(t) - 0.008) if t > 0.26 else rb + pad + fold
            row.append(c + dirv * r)
        G.append(row)
    SLEEVE_R0 = sum((G[1][i] - st[1][0].lerp(st[1][1], st[1][2])).length for i in range(K)) / K
    pts = [a.lerp(b, t) for a, b, t in st]
    shell(mbL, G, 0.004, out_fn=lambda q: q - min(pts[:-1], key=lambda c: (c - q).length), closed_u=True, back=False)
    build_pair(mbL, 'SUR_Sleeve', [M_CLOTH], 'upperarm_l', 'Cloth')

# =========================================================== pauldrons
def pauldron_frame():
    J = bone('upperarm_l') + Vector((0.005, 0.0, 0.0))
    d = bone('lowerarm_l') - bone('upperarm_l')
    ang = 0.90 * math.atan2(-d.z, d.x)          # hangs with the arm, wrapping the deltoid
    D = Vector((math.cos(ang), 0, -math.sin(ang)))
    Up = Vector((math.sin(ang), 0, math.cos(ang)))
    F = Vector((0, -1, 0))
    return J, D, Up, F
def paul_S(u, v, dr=0.0):
    J, D, Up, F = pauldron_frame()
    s = -v
    R = SLEEVE_R0 + 0.030 + 0.012 * smoothstep(0.0, 0.24, s) + 0.020 * smoothstep(0.0, -0.06, s) + dr
    # flatten the outer face a little, flare at front/back bottoms
    return J + D * s + (Up * math.cos(u) * 0.96 + F * math.sin(u) * 1.08) * R
def build_pauldrons():
    J, D, Up, F = pauldron_frame()
    mb = MB(); tm = MB(); bk = MB()
    s0, s1 = -0.042, 0.235
    umax = 1.95
    ctr = lambda p: J + D * (p - J).dot(D)
    rows = []
    s = s1 - 0.008
    while s - PLATE_H * 0.6 > s0:
        rows.append(-s); s -= 0.042
    place_rows(mb, paul_S, rows, 0.0255, ctr, rng, PLATES, LACES, closed=False, u_range=(-umax + 0.05, umax - 0.05),
               mask=lambda u, v: -v - PLATE_H * 0.85 > s0 - 0.01)
    # leather backing
    G = [[paul_S(-umax + 2 * umax * i / 24, -(s0 + (s1 - s0) * j / 10), dr=-0.006) for i in range(25)] for j in range(11)]
    shell(bk, G, 0.004, out_fn=lambda p: p - ctr(p))
    # edging loop
    pts = []; ups = []
    def addp(u, v):
        pts.append(paul_S(u, v, dr=0.003)); ups.append(surf_normal(paul_S, u, v, ctr))
    for k in range(48): addp(-umax + 2 * umax * k / 48, -s1)
    for k in range(16): addp(umax, -(s1 + (s0 - s1) * k / 16))
    for k in range(48): addp(umax - 2 * umax * k / 48, -s0)
    for k in range(16): addp(-umax, -(s0 + (s1 - s0) * k / 16))
    prof = edging_profile(w_front=0.030, w_back=0.012, t=0.009)
    # ensure 'side' points out of the panel: test at first point (bottom edge, outward = +s)
    t0 = (pts[1] - pts[0]).normalized()
    if t0.cross(ups[0]).dot(D) < 0:
        pts = pts[::-1]; ups = ups[::-1]
    sweep(tm, pts, ups, prof, closed=True, uv_v=TRIM['edge'], u_scale=TRIM_U)
    side = []
    for i in range(len(pts)):
        t = (pts[(i + 1) % len(pts)] - pts[i - 1]).normalized(); side.append(t.cross(ups[i]))
    rivet_line(tm, pts + [pts[0]], ups + [ups[0]], every=0.07, offset=-0.018, side_vecs=side + [side[0]], lift=0.009, rng=rng)
    # hanging strap from the shoulder strap to the pauldron top
    build_pair(mb, 'SUR_Pauldron_Lamellar', [M_LAM], 'upperarm_l', 'Arms')
    build_pair(tm, 'SUR_Pauldron_Trim', [M_TRIM], 'upperarm_l', 'Arms')
    build_pair(bk, 'SUR_Pauldron_Backing', [M_ARM], 'upperarm_l', 'Arms')

# =========================================================== bracers
def buckle(mb, c, n, along, w=0.024, h=0.020, bar=0.0034):
    """gilded buckle: rounded frame + centre roller bar + tongue, lying on the strap (along = strap direction)"""
    n = n.normalized(); ax = (along - n * along.dot(n)).normalized(); by = n.cross(ax).normalized()
    K = 20
    rect = []
    for k in range(K):
        a = 2 * math.pi * k / K
        ca, sa = math.cos(a), math.sin(a)
        x = math.copysign(abs(ca) ** 0.5, ca) * w / 2; y = math.copysign(abs(sa) ** 0.5, sa) * h / 2
        rect.append(c + ax * x + by * y + n * 0.0015)
    sweep(mb, rect, [n] * K, rect_profile(bar, bar * 0.9, bar * 0.25), closed=True, uv_v=(0.80, 0.86), u_scale=TRIM_U)
    cb = [c + by * (h / 2 * (2 * k / 6 - 1)) + n * 0.002 for k in range(7)]
    sweep(mb, cb, [n] * 7, rect_profile(bar * 0.8, bar * 0.8, bar * 0.2), uv_v=(0.86, 0.90), u_scale=TRIM_U)
    tg = [c + ax * (w * 0.62 * k / 5) + n * (0.0028 + 0.0008 * math.sin(math.pi * k / 5)) for k in range(6)]
    sweep(mb, tg, [n] * 6, rect_profile(0.0024, 0.0016, 0.0005), uv_v=(0.90, 0.94), u_scale=TRIM_U)

def build_bracers():
    el = bone('lowerarm_l'); wr = bone('hand_l')
    ax = (wr - el).normalized()
    outd = Vector((0.55, -0.80, 0.25)); outd = (outd - ax * outd.dot(ax)).normalized()
    side = ax.cross(outd).normalized()
    t0, t1 = 0.28, 0.96
    L = (wr - el).length
    def R(t): return 0.074 - 0.017 * smoothstep(t0, t1, t)
    def C(t): return el + ax * (L * t)
    def P(t, a, dr=0.0):
        return C(t) + (outd * math.cos(a) + side * math.sin(a)) * (R(t) + dr)
    axis_out = lambda p: p - (el + ax * (p - el).dot(ax))
    pl = MB(); lt = MB(); tr = MB()
    span = math.radians(122)
    nj, ni = 11, 18
    G = [[P(t0 + (t1 - t0) * j / (nj - 1), -span + 2 * span * i / (ni - 1),
            dr=0.0065 + 0.003 * math.sin(math.pi * j / (nj - 1)) + 0.002 * (1 - abs(2 * i / (ni - 1) - 1)) ** 2)
          for i in range(ni)] for j in range(nj)]
    shell(pl, G, 0.003, out_fn=axis_out)
    # closed leather sleeve under the plate (solid, with thickness: no hollow end)
    G2 = [[P(t0 - 0.025 + (t1 - t0 + 0.035) * j / 10, 2 * math.pi * i / 24, dr=0.0025) for i in range(24)] for j in range(11)]
    shell(lt, G2, 0.005, out_fn=axis_out, closed_u=True, back=True)
    # rolled leather cuffs at the elbow and wrist ends (sit on the sleeve)
    for tt, rr in ((t0 - 0.025, 0.0055), (t1 + 0.010, 0.0060)):
        ring = [P(tt, 2 * math.pi * k / 36, dr=0.0025) for k in range(36)]
        ups = [axis_out(p).normalized() for p in ring]
        prof = [(math.cos(2 * math.pi * q / 8) * rr, math.sin(2 * math.pi * q / 8) * rr * 0.8 - 0.001) for q in range(9)]
        sweep(tr, ring, ups, prof, closed=True, uv_v=TRIM['strap'], u_scale=TRIM_U)
    # closing caps: leather annulus from the bracer down onto the wrist / sleeve (no open end)
    for tt, r_in, sgn in ((t1 + 0.012, 0.040, 1), (t0 - 0.027, R(t0) - 0.012, -1)):
        A = [[C(tt + sgn * 0.004 * (1 - q)) + (outd * math.cos(2 * math.pi * i / 24) + side * math.sin(2 * math.pi * i / 24)) * (R(tt) + 0.0025 + (r_in - R(tt) - 0.0025) * q)
              for i in range(24)] for q in (0.0, 0.5, 1.0)]
        shell(lt, A, 0.003, out_fn=lambda p, s=sgn: ax * s, closed_u=True, back=True)
    # gold rim along the plate border
    bpts = [G[0][i] for i in range(ni)] + [G[j][ni - 1] for j in range(1, nj)] + [G[nj - 1][i] for i in range(ni - 2, -1, -1)] + [G[j][0] for j in range(nj - 2, 0, -1)]
    bpts, _ = resample(bpts, step=0.006, closed=True)
    bpts = smooth_pts(bpts, 2, closed=True)
    ups = [axis_out(p).normalized() for p in bpts]
    sweep(tr, bpts, ups, [(-0.007, 0.0), (-0.0065, 0.003), (0.0, 0.0042), (0.0055, 0.003), (0.006, 0.0), (-0.007, 0.0)], closed=True,
          uv_v=TRIM['goldband'], u_scale=TRIM_U)
    rivet_line(tr, bpts + [bpts[0]], ups + [ups[0]], every=0.032, lift=0.003, rng=rng, r=0.0028)
    # two straps closing the bracer around the inner forearm, buckle + tail on the visible side
    for tt in (0.47, 0.80):
        a0, a1 = span - 0.10, 2 * math.pi - span + 0.10
        arc = [P(tt, a0 + (a1 - a0) * k / 28, dr=0.0085) for k in range(29)]
        ups2 = [axis_out(p).normalized() for p in arc]
        strap(tr, arc, ups2, w=0.024, t=0.0035)
        ab = span + 0.42
        bcen = P(tt, ab, dr=0.0125); bn = axis_out(bcen).normalized()
        tang = (P(tt, ab + 0.05) - P(tt, ab - 0.05)).normalized()
        buckle(tr, bcen, bn, tang, w=0.026, h=0.028)
        tail = [P(tt, ab - 0.02 - 0.42 * k / 8, dr=0.0105 + (0.004 if k < 3 else 0.006)) for k in range(9)]
        strap(tr, tail, [axis_out(p).normalized() for p in tail], w=0.020, t=0.003)
        for a in (a0 + 0.06, a1 - 0.06):
            p = P(tt, a, dr=0.0118); rivet(tr, p, axis_out(p), r=0.0034, uvc=(0.4, 0.86), uvr=0.011)
    build_pair(pl, 'SUR_Bracer_Plate', [M_ARM], 'lowerarm_l', 'Arms')
    build_pair(lt, 'SUR_Bracer_Leather', [M_ARM], 'lowerarm_l', 'Arms')
    build_pair(tr, 'SUR_Bracer_Trim', [M_TRIM], 'lowerarm_l', 'Arms')

# =========================================================== riding boots (matched to the reference silhouettes: boots.py + boot_ref/)
BOOT_TOP = 0.450
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'boots.py'), encoding='utf-8').read())

# =========================================================== cape
def cape_back_y(z):
    return FIT.torso_delta(min(max(z, 1.0), 1.45))[2] + interp_table([(0.10, 0.360), (0.30, 0.345), (0.60, 0.315), (0.90, 0.250), (1.10, 0.200), (1.35, 0.192), (1.52, 0.185)], z)[0]
def build_cape():
    mb = MB()
    nu, nv = 44, 56
    rr = random.Random(5)
    folds = [(rr.uniform(-0.95, 0.95), rr.uniform(0.05, 0.11), rr.uniform(0.6, 1.0)) for _ in range(9)]
    G = []
    for j in range(nv + 1):
        t = j / nv
        z = 1.505 - t * 1.385
        W = 0.20 + 0.20 * smoothstep(0.0, 1.0, t ** 0.7)
        row = []
        for i in range(nu + 1):
            s = -1 + 2 * i / nu
            x = s * W
            wrap = 0.15 * (1 - 0.35 * t)                      # wraps round the back, edges come forward
            y = cape_back_y(z) + 0.012 - (s * s) * wrap
            # folds: start as small gathers under the shoulders and deepen to the hem
            amp = 0.004 + 0.048 * smoothstep(0.05, 1.0, t) ** 0.9
            f = 0.0
            for (c, w, k) in folds:
                d = (s - c) / (w * (0.6 + 0.6 * t))
                f += k * math.exp(-d * d) * (1 if (int(c * 10) % 2) else -0.7)
            f += 0.35 * math.sin(s * 9.0 + t * 3.0)
            nrm = Vector((s * 0.9, 1.0, 0)).normalized()
            p = Vector((x, y, z)) + nrm * f * amp
            if t < 0.07:                                      # gathered over the shoulders
                p.y -= (0.07 - t) / 0.07 * 0.035 * (1 - s * s)
            p.z += 0.012 * math.sin(s * 5.0 + 1.0) * t ** 3   # uneven hem
            row.append(p)
        G.append(row)
    G = G[::-1]
    shell(mb, G, 0.005, out_fn=lambda p: Vector((p.x * 0.3, 1, 0)))
    done(mb.build('SUR_Cape', [M_CLOTH]), 'spine_05', 'Cloth')
    sim = MB(); shell(sim, G, 0.0, out_fn=lambda p: Vector((p.x * 0.3, 1, 0)), back=False, walls=False)
    o = done(sim.build('SUR_Cape_Sim', [M_CLOTH]), 'spine_05', 'Cloth'); o['sim_mesh'] = 1; o['bake_skip'] = 1; o.hide_render = True

# =========================================================== helmet
HC = Vector((0.0, 0.004, 1.762)) + FIT.head_d     # rim centre, follows the head bone
HRX, HRY = 0.113, 0.128
HPROF = [(1.000, 0.000), (1.002, 0.018), (0.992, 0.040), (0.962, 0.066), (0.905, 0.092), (0.815, 0.116),
         (0.690, 0.138), (0.530, 0.156), (0.355, 0.168), (0.190, 0.175), (0.060, 0.178)]
def helm_pt(a, k, grow=0.0):
    """a = azimuth (0 = front), k = profile param 0..len-1 (float)"""
    i = min(int(k), len(HPROF) - 2); f = k - i
    r = HPROF[i][0] * (1 - f) + HPROF[i + 1][0] * f
    z = HPROF[i][1] * (1 - f) + HPROF[i + 1][1] * f
    # rim tilt: back sits 2.5 cm lower than front
    tilt = -0.025 * (1 - math.cos(a)) / 2 * (1 - z / 0.178)
    return HC + Vector((math.sin(a) * (r * HRX + grow), -math.cos(a) * (r * HRY + grow), z + tilt + grow * 0.3 * z / 0.178))
def helm_n(a, k):
    e = 0.01
    p = helm_pt(a, k)
    n = (helm_pt(a + e, k) - helm_pt(a - e, k)).cross(helm_pt(a, min(k + e * 10, 10)) - helm_pt(a, max(k - e * 10, 0))).normalized()
    if n.dot(p - (HC + Vector((0, 0, 0.05)))) < 0: n = -n
    return n
def build_helmet():
    bm = MB()
    nu = 48
    ks = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 9.6]
    G = [[helm_pt(2 * math.pi * i / nu, k) for i in range(nu)] for k in ks]
    shell(bm, G, 0.0035, out_fn=lambda p: p - (HC + Vector((0, 0, 0.03))), closed_u=True)
    done(bm.build('SUR_Helmet_Bowl', [M_HELM]), 'head', 'Head')
    gm = MB()
    # brow band (closed) with profile across = vertical
    pts = [helm_pt(2 * math.pi * i / 96, 0.0, grow=0.0035) + Vector((0, 0, 0.019)) for i in range(96)]
    ups = [helm_n(2 * math.pi * i / 96, 0.6) for i in range(96)]
    sweep(gm, pts, ups, [(-0.021, 0.0), (-0.021, 0.0035), (-0.017, 0.0055), (0.0, 0.0050), (0.016, 0.0055), (0.0195, 0.0038), (0.0205, 0.0), (-0.021, 0.0)],
          closed=True, uv_v=(0, 0.06), u_scale=1.0)
    # ribs: front, back, sides + 4 diagonals (thin)
    for ai, a in enumerate([0, math.pi / 2, math.pi, 3 * math.pi / 2, math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4]):
        wide = ai < 4
        kk = [1.6 + (9.6 - 1.6) * m / 18 for m in range(19)] if ai else [3.0 + (9.6 - 3.0) * m / 14 for m in range(15)]
        pts = [helm_pt(a, k, grow=0.0022) for k in kk]
        ups = [helm_n(a, k) for k in kk]
        w = 0.022 if wide else 0.012
        sweep(gm, pts, ups, [(-w / 2, 0.0), (-w / 2, 0.002), (-w * 0.2, 0.0042), (w * 0.2, 0.0042), (w / 2, 0.002), (w / 2, 0.0), (-w / 2, 0.0)],
              uv_v=(0.1 + 0.03 * ai, 0.1 + 0.03 * ai + 0.025), u_scale=1.0)
        rv = [helm_pt(a, k, grow=0.0035) for k in kk[2::4]]
        for p, k in zip(rv, kk[2::4]):
            if wide: rivet(gm, p, helm_n(a, k), r=0.0034, h=0.0062, uvc=(0.9, 0.9), uvr=0.01)
    # nasal + brow 'eyebrows'
    nas = []
    for j in range(9):
        t = j / 8
        z = 0.004 - t * 0.072
        w = 0.026 - 0.008 * t
        row = []
        for i in range(5):
            x = (i / 4 - 0.5) * w
            yv = HC.y - HRY - 0.0055 - 0.003 * (1 - (2 * i / 4 - 1) ** 2) - t * 0.030 + t * t * 0.006
            row.append(Vector((x, yv, HC.z + z)))
        nas.append(row)
    shell(gm, nas, 0.004, out_fn=lambda p: Vector((0, -1, 0)))
    for sgn in (1, -1):    # eyebrow arcs riding the rim, gold
        arc = []
        for k in range(15):
            a = sgn * (0.06 + 0.62 * k / 14)
            arc.append(helm_pt(a, 0.0, grow=0.0072) + Vector((0, 0, -0.004 - 0.010 * math.sin(math.pi * k / 14))))
        ups = [helm_n(sgn * (0.06 + 0.62 * k / 14), 0.2) for k in range(15)]
        sweep(gm, arc, ups, [(-0.006, 0), (-0.005, 0.003), (0.005, 0.003), (0.006, 0), (-0.006, 0)], uv_v=(0.40, 0.42), u_scale=1.0)
    # rosette medallion on the forehead
    rc = helm_pt(0.0, 1.9, grow=0.0080); rn = helm_n(0.0, 1.9)
    M = frame(rc, rn, Vector((0, 0, 1)))
    rp = [(0.0, 0.0045), (0.006, 0.0050), (0.012, 0.0042), (0.017, 0.0030), (0.0205, 0.0030), (0.0215, 0.0012), (0.0215, -0.002)]
    rings = []
    for r, h in rp:
        rings.append([gm.add_v(M @ Vector((math.cos(2 * math.pi * q / 16) * r, math.sin(2 * math.pi * q / 16) * r, h))) for q in range(16)])
    for ri in range(len(rings) - 1):
        for q in range(16):
            q1 = (q + 1) % 16
            u0, u1 = 0.5 + 0.08 * rp[ri][0] / 0.02, 0.5 + 0.08 * rp[ri + 1][0] / 0.02
            gm.add_f((rings[ri][q], rings[ri + 1][q], rings[ri + 1][q1], rings[ri][q1]),
                     [(0.6 + u * math.cos(2 * math.pi * qq / 16) * 0.5, 0.6 + u * math.sin(2 * math.pi * qq / 16) * 0.5) for u, qq in ((u0, q), (u1, q), (u1, q1), (u0, q1))])
    # finial: collar, cup, bulb, spike + plume socket
    top = helm_pt(0, 10.0)
    fp = [(0.040, -0.004), (0.041, 0.004), (0.034, 0.010), (0.020, 0.016), (0.016, 0.024), (0.022, 0.034), (0.024, 0.044), (0.019, 0.054),
          (0.010, 0.060), (0.0085, 0.070), (0.012, 0.074), (0.010, 0.080), (0.0068, 0.090), (0.0055, 0.112), (0.0065, 0.116), (0.0065, 0.128), (0.0, 0.129)]
    lathe(gm, fp, 16, center=Vector((top.x, top.y, top.z - 0.006)), uv_rect=(0.2, 0.5, 0.5, 0.98))
    done(gm.build('SUR_Helmet_Gold', [M_HELM]), 'head', 'Head')
    # inner liner (padded felt) visible under the rim
    lm = MB()
    G = [[helm_pt(2 * math.pi * i / nu, k, grow=-0.004 - 0.006 * (k < 1)) for i in range(nu)] for k in (-0.6, 0, 0.6)]
    for p in G[0]: p.z -= 0.012
    shell(lm, G, 0.0, out_fn=lambda p: -(p - HC), closed_u=True, back=False, walls=False)
    done(lm.build('SUR_Helmet_Liner', [M_CLOTH]), 'head', 'Head')
    return top + Vector((0, 0, 0.123))

def build_aventail():
    mb = MB(); tm = MB()
    ctr = lambda p: Vector((HC.x, HC.y, p.z))
    def S(u, v):
        t = smoothstep(1.735, 1.53, v)
        rx = 0.118 + t * 0.090
        ry = 0.132 + t * 0.072
        tilt = -0.022 * (1 - math.cos(u)) / 2
        return Vector((HC.x + math.sin(u) * rx, HC.y - math.cos(u) * ry, v + tilt * (1 - t)))
    gap = 0.66
    rows = [1.548 + 0.0365 * k for k in range(6)]
    place_rows(mb, S, rows, 0.0215, ctr, rng, PLATES, LACES, closed=False, u_range=(gap, 2 * math.pi - gap), scale=(0.80, 0.80, 1.0),
               tilt=math.radians(-8))
    # suspension band under the rim + edging on the opening and hem
    pts = []; ups = []
    def addp(u, v):
        pts.append(S(u, v) + surf_normal(S, u, v, ctr) * 0.003); ups.append(surf_normal(S, u, v, ctr))
    vt = rows[-1] + PLATE_H * 0.8 * 0.95
    for k in range(13): addp(gap - 0.012, vt - (vt - rows[0] + 0.004) * k / 12)
    for k in range(1, 70): addp(gap + (2 * math.pi - 2 * gap) * k / 70, rows[0] - 0.004)
    for k in range(13): addp(2 * math.pi - gap + 0.012, rows[0] - 0.004 + (vt - rows[0] + 0.004) * k / 12)
    prof = edging_profile(w_front=0.014, w_back=0.008, t=0.006)
    t0 = (pts[1] - pts[0]).normalized()
    if t0.cross(ups[0]).dot((S(gap - 0.2, vt - 0.05) - S(gap, vt - 0.05)).normalized()) < 0:
        pts = pts[::-1]; ups = ups[::-1]
    sweep(tm, pts, ups, prof, uv_v=TRIM['edge'], u_scale=TRIM_U)
    band = [S(gap - 0.05 + (2 * math.pi - 2 * gap + 0.1) * k / 80, vt - 0.006) for k in range(81)]
    bups = [surf_normal(S, gap - 0.05 + (2 * math.pi - 2 * gap + 0.1) * k / 80, vt - 0.006, ctr) for k in range(81)]
    strap(tm, band, bups, w=0.030, t=0.005)
    done(mb.build('SUR_Aventail_Lamellar', [M_LAM]), 'head', 'Head')
    done(tm.build('SUR_Aventail_Trim', [M_TRIM]), 'head', 'Head')

def build_plume(base):
    """dense black horsehair tuft: short rise out of the socket, then the hair falls over and down to one side (back-right)"""
    mb = MB()
    r = random.Random(11)
    N = 380
    side_az = math.pi                            # falls down the back
    for c in range(N):
        az = side_az + r.gauss(0.0, 0.28)
        d = Vector((math.sin(az), -math.cos(az), 0))
        rise = r.uniform(0.085, 0.135)
        reach = r.uniform(0.07, 0.14)
        fall = r.uniform(0.14, 0.30)
        P0 = base + Vector((r.uniform(-0.004, 0.004), r.uniform(-0.004, 0.004), 0.0))
        P1 = P0 + Vector((0, 0, rise * 1.15)) - d * 0.008
        P2 = P0 + Vector((0, 0, rise * 1.10)) + d * reach * 0.9
        P3 = P0 + Vector((0, 0, rise - fall)) + d * reach * r.uniform(1.0, 1.25) + Vector((0, 0.035, 0))
        segs = 12
        pts = [P0 * (1 - t) ** 3 + P1 * 3 * (1 - t) ** 2 * t + P2 * 3 * (1 - t) * t * t + P3 * t ** 3 for t in [k / segs for k in range(segs + 1)]]
        u0 = (c % 10) / 10
        side0 = Vector((0, 0, 1)).cross(d).normalized()
        rot = r.uniform(-1.2, 1.2)
        for k in range(segs + 1):
            t = k / segs
            tg = (pts[min(k + 1, segs)] - pts[max(k - 1, 0)]).normalized()
            sd = side0 * math.cos(rot) + tg.cross(side0) * math.sin(rot)
            sd = (sd - tg * sd.dot(tg)).normalized()
            w = 0.016 * (1 - 0.35 * t) * (0.5 if k == 0 else 1.0)
            mb.add_v(pts[k] - sd * w / 2); mb.add_v(pts[k] + sd * w / 2)
            if k:
                i = len(mb.v)
                mb.add_f((i - 4, i - 3, i - 1, i - 2), ((u0, (k - 1) / segs), (u0 + 0.095, (k - 1) / segs), (u0 + 0.095, t), (u0, t)))
    done(mb.build('SUR_Helmet_Plume', [M_PLUME]), 'head', 'Head')

# =========================================================== weapon: heavy sabre (qılısh with yelman)
def build_sabre():
    mb = MB()
    L = 0.86
    nseg = 40
    def path(s):   # s 0..1 along blade, curving toward +Y (spine side); edge on -Y (convex)
        z = s * L
        return Vector((0, 0.085 * s ** 2.1, z))
    def width(s):
        w = 0.040 - 0.006 * s
        w += 0.012 * smoothstep(0.58, 0.80, s) * (1 - smoothstep(0.82, 1.0, s))  # yelman flare
        return w * (1 - smoothstep(0.93, 1.0, s) * 0.92)
    def thick(s): return 0.0075 - 0.0035 * s
    rings = []
    for k in range(nseg + 1):
        s = k / nseg
        p = path(s)
        tg = (path(min(s + 0.01, 1)) - path(max(s - 0.01, 0))).normalized()
        across = Vector((0, 1, 0)); across = (across - tg * across.dot(tg)).normalized()   # edge(-) -> spine(+)
        flat = Vector((1, 0, 0))
        w = width(s); t = thick(s)
        false_edge = smoothstep(0.60, 0.80, s)     # yelman: spine sharpens
        fuller = (1 - smoothstep(0.55, 0.70, s)) * (smoothstep(0.0, 0.06, s))
        sec = [(-0.5, 0.0), (-0.30, 0.30), (-0.05, 0.47), (0.12, 0.47 - 0.25 * fuller), (0.30, 0.47 - 0.25 * fuller),
               (0.40, 0.48), (0.5, 0.5 * (1 - false_edge * 0.9))]
        full = sec + [(a, -b) for a, b in reversed(sec[1:-1])] + ([(0.5, -0.5 * (1 - false_edge * 0.9))] if True else [])
        # order: edge, top face..., spine top, spine bottom, bottom face... back to edge
        full = sec + [(0.5, -0.5 * (1 - false_edge * 0.9))] + [(a, -b) for a, b in reversed(sec[1:-1])]
        centre_off = -w * 0.05
        ring = [mb.add_v(p + across * (a * w + centre_off) + flat * (b * t)) for a, b in full]
        rings.append(ring)
    n = len(rings[0])
    for k in range(nseg):
        for i in range(n):
            i1 = (i + 1) % n
            mb.add_f((rings[k][i], rings[k][i1], rings[k + 1][i1], rings[k + 1][i]),
                     ((0.02 + 0.30 * i / n, 0.02 + 0.96 * k / nseg), (0.02 + 0.30 * (i + 1) / n, 0.02 + 0.96 * k / nseg),
                      (0.02 + 0.30 * (i + 1) / n, 0.02 + 0.96 * (k + 1) / nseg), (0.02 + 0.30 * i / n, 0.02 + 0.96 * (k + 1) / nseg)))
    # tip cap
    tip = mb.add_v(path(1.0) + Vector((0, -0.002, 0.004)))
    for i in range(n):
        mb.add_f((rings[-1][i], rings[-1][(i + 1) % n], tip), ((0.3, 0.99), (0.31, 0.99), (0.305, 1.0)))
    # guard: crossbar along Y with ball ends + langets
    gp = MB()
    bar = [Vector((0, y, -0.004 - 0.010 * (abs(y) / 0.065) ** 2)) for y in [-0.065 + 0.13 * k / 16 for k in range(17)]]
    sweep(gp, bar, [Vector((1, 0, 0))] * 17, [(-0.007, -0.009), (-0.007, 0.009), (0.007, 0.009), (0.007, -0.009), (-0.007, -0.009)],
          uv_v=(0.40, 0.48), u_scale=1.0)
    for sy in (-1, 1):
        lathe(gp, [(0.0, -0.011), (0.008, -0.009), (0.011, 0.0), (0.008, 0.009), (0.0, 0.011)], 10,
              center=Vector((0, sy * 0.068, -0.014 - 0.002)), uv_rect=(0.40, 0.5 + 0.1 * (sy > 0), 0.48, 0.58 + 0.1 * (sy > 0)))
    for sx in (1, -1):
        G = [[Vector((sx * (0.0048 + 0.002 * (1 - j / 6)), (i / 3 - 0.5) * (0.020 - 0.012 * j / 6), 0.002 + 0.042 * j / 6)) for i in range(4)] for j in range(7)]
        shell(gp, G, 0.0018, out_fn=lambda p, sx=sx: Vector((sx, 0, 0)), uv_off=(0.5 + 0.1 * (sx > 0), 0.1))
    # grip (oval, slightly canted toward the edge) + pommel cap
    gr = MB()
    gpath = [Vector((0, -0.010 * (k / 10) ** 2, -0.012 - 0.118 * k / 10)) for k in range(11)]
    G = loft_grid(gpath, lambda j, a: (0.0135 * math.cos(a) * (1 + 0.04 * math.sin(math.pi * j / 10)), 0.0165 * math.sin(a) * (1 + 0.04 * math.sin(math.pi * j / 10))), 12)
    shell(gr, G, 0.0, out_fn=lambda p: Vector((p.x, p.y + 0.004, 0)), closed_u=True, back=False, walls=False, uv_off=(0.6, 0.4))
    pc = gpath[-1]
    lathe(gp, [(0.0150, 0.0), (0.0175, -0.006), (0.0190, -0.016), (0.0150, -0.026), (0.008, -0.031), (0.0, -0.033)], 12,
          center=pc + Vector((0, 0, 0.004)), sx=0.85, sy=1.2, uv_rect=(0.4, 0.8, 0.5, 0.98))
    gp_ob = done(gp.build('SUR_Sabre_Guard', [M_WPN]), 'hand_r', 'Weapon')
    done(gr.build('SUR_Sabre_Grip', [M_WPN]), 'hand_r', 'Weapon')
    done(mb.build('SUR_Sabre_Blade', [M_WPN]), 'hand_r', 'Weapon')

# =========================================================== run
if want('cuirass'): build_cuirass()
if want('robe'): build_robe_torso()
if want('belt'): build_belt()
if want('tassets'): build_tassets()
if want('coat'): build_coat()
if want('trousers'): build_trousers()
if want('sleeves'): build_sleeves()
if want('pauldrons'): build_pauldrons()
if want('bracers'): build_bracers()
if want('boots'): build_boots()
if ONLY and 'cape' in ONLY: build_cape()      # author: no cape (animation); build with `-- cape` only
if want('helmet'):
    plume_base = build_helmet()
    build_plume(plume_base)
if want('aventail'): build_aventail()
if want('sabre'): build_sabre()
