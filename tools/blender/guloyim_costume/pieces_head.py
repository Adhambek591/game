# Executed inside build.py (after pieces.py helpers). Headscarf (Chaos Cloth grid) + silver forehead band.
# The scarf sits over the MetaHuman Hair_L_Straight groom: hair volume is reserved on top / sides / back,
# and the hair falls out below the scarf at the front and down the back.

HC = bone('head') + Vector((0.0, -0.008, 0.066))      # cranium centre (head bone + offset measured on the head slices)
X = Vector((1, 0, 0))

def hair_mer(theta):
    """hair (+ scarf) offset above the skin along the sagittal line; theta = elevation from the front (deg)"""
    if theta < 22: return 0.0035
    if theta < 34: return 0.0035 + (0.010 - 0.0035) * (theta - 22) / 12
    if theta < 95: return 0.010 + 0.005 * (theta - 34) / 61
    return 0.015 + 0.008 * smoothstep(95, 160, theta)

def _meridian():
    pts = []; th = []
    for k in range(0, 84):
        t = 8.0 + 2.5 * k                    # 8 .. 215.5 deg
        d = Vector((0, -math.cos(math.radians(t)), math.sin(math.radians(t))))
        r = FIT.ray_dist(('head',), HC, d, 0.3)
        if r is None: continue
        pts.append(HC + d * (r + hair_mer(t) + 0.0025)); th.append(t)
    # below the occiput: down the back of the neck / upper back over the hair curtain
    z = pts[-1].z - 0.012
    while z > 1.28:
        cyb = cy_at(z) if z <= 1.50 else 0.0
        r = FIT.ray_dist(('neck', 'torso', 'head'), Vector((0, cyb, z)), Vector((0, 1, 0)), 0.3)
        y = (cyb + r if r else pts[-1].y) + 0.021 + 0.012 * smoothstep(1.50, 1.42, z) + 0.0025
        pts.append(Vector((0, max(y, pts[-1].y - 0.01), z))); th.append(999)
        z -= 0.012
    pts = smooth_pts(pts, 6)
    i0 = min(range(len(th)), key=lambda i: abs(th[i] - 32.0))     # scarf front edge at the hairline
    iocc = th.index(999) if 999 in th else len(th) - 1
    return pts, i0, iocc

MER, MER_I0, MER_OCC = _meridian()
MER_S = [0.0]
for i in range(1, len(MER)): MER_S.append(MER_S[-1] + (MER[i] - MER[i - 1]).length)
MER_S = [s - MER_S[MER_I0] for s in MER_S]          # s = 0 at the front edge, negative over the forehead
S_OCC = MER_S[MER_OCC] - 0.03

def mer_at(s):
    for i in range(len(MER_S) - 1):
        if MER_S[i + 1] >= s or i == len(MER_S) - 2:
            t = min(max((s - MER_S[i]) / max(MER_S[i + 1] - MER_S[i], 1e-9), 0.0), 1.0)
            p = MER[i].lerp(MER[i + 1], t)
            tg = (MER[i + 1] - MER[i]).normalized()
            n = Vector((0, -tg.z, tg.y)).normalized()
            return p, tg, n
    return MER[-1], Vector((0, 0, -1)), Vector((0, 1, 0))

PHI_H = math.radians(84)
def section(s, side_hair=0.021, base=None, phi_max=PHI_H, hang=True, ulen=0.40):
    """one cross-section of the hood at meridian arc s: returns list of (signed arc u, point)"""
    M, tg, n = mer_at(s)
    A = M - n * 0.072
    th_off = (M - A).length
    h0 = (M - A).length - (FIT.ray_dist(('head', 'neck', 'torso'), A, n, 0.3) or th_off - 0.012)
    out = {}
    for sg in (1, -1):
        pts = [M]
        last_r = None
        for k in range(1, 60):
            ph = phi_max * k / 59
            d = n * math.cos(ph) + X * (sg * math.sin(ph))
            r = FIT.ray_dist(('head', 'neck', 'torso'), A, d, 0.3)
            if r is None: r = last_r if last_r else th_off - h0
            last_r = r
            hair = (h0 if base is None else base) + ((side_hair if base is None else base) - (h0 if base is None else base)) * smoothstep(0.0, 1.25, ph)
            pts.append(A + d * (r + hair))
        # below the occiput the scarf no longer hugs the neck: it drapes as a broad arc over the hair curtain
        f = smoothstep(S_OCC, S_OCC + 0.06, s) if base is None else 0.0
        if f > 0:
            Ry = 0.070; Rx = 0.098 + 0.035 * smoothstep(S_OCC, S_OCC + 0.25, s)
            cn = M - n * Ry
            for k in range(1, len(pts)):
                ph = phi_max * k / 59
                q = cn + n * (Ry * math.cos(ph)) + X * (sg * Rx * math.sin(ph))
                pts[k] = pts[k].lerp(q, f)
        acc = [0.0]
        for i in range(1, len(pts)): acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
        if hang:
            e = pts[-1]
            for k in range(1, 30):
                dd = 0.012 * k
                pts.append(e + Vector((0, 0, -dd)) + X * sg * 0.003 * k / 29); acc.append(acc[-1] + 0.012)
        out[sg] = (acc, pts)
    def at(u):
        acc, pts = out[1 if u >= 0 else -1]
        a = abs(u)
        for i in range(len(acc) - 1):
            if acc[i + 1] >= a:
                t = (a - acc[i]) / max(acc[i + 1] - acc[i], 1e-9)
                return pts[i].lerp(pts[i + 1], t)
        return pts[-1]
    return at

def build_scarf():
    mb = MB()
    s_end = max(MER_S)
    # back point: where the meridian reaches z ~ 1.355
    S_TOT = next((MER_S[i] for i in range(len(MER)) if MER_S[i] > 0.15 and MER[i].z < 1.372 + SH_DZ), s_end)
    S_C = 0.27
    U, NU, NR = 0.29, 24, 22
    hem = lambda u: S_TOT - (S_TOT - S_C) * (0.22 * abs(u) / U + 0.78 * (abs(u) / U) ** 1.9)
    SG = [S_TOT * k / 120 for k in range(121)]
    SEC = [section(s) for s in SG]
    def P(u, s):
        f = min(max(s / S_TOT * 120, 0.0), 119.999); k = int(f); t = f - k
        return SEC[k](u).lerp(SEC[k + 1](u), t)
    G = []; UV = []
    for j in range(NR + 1):
        row = []
        for i in range(NU + 1):
            u = -U + 2 * U * i / NU
            row.append(P(u, hem(u) * j / NR))
        G.append(row)
    gfit.smooth_grid(G, 2, fix_rows=(0, NR), fac=0.35)
    for j in range(NR + 1):
        G[j] = [FIT.conform(FIT.conform(p, ('torso', 'armL', 'armR'), 0.020 + 0.018 * smoothstep(1.47, 1.42, p.z)), ('head', 'neck'), 0.007) for p in G[j]]
    gfit.smooth_grid(G, 1, fix_rows=(0, NR), fac=0.25)
    # flat-fabric drape: the part on the head is pinned, the back point and the side panels hang over hair + armour
    A_H = 0.15
    idx = lambda j, i: j * (NU + 1) + i
    flat = lambda j, i: Vector((-U + 2 * U * i / NU, hem(-U + 2 * U * i / NU) * j / NR, 0))
    P0 = [G[j][i] for j in range(NR + 1) for i in range(NU + 1)]
    pinned = set()
    for j in range(NR + 1):
        for i in range(NU + 1):
            u = -U + 2 * U * i / NU; sv = hem(u) * j / NR
            if sv < S_OCC - 0.05 - 0.10 * smoothstep(A_H, U, abs(u)) or j == 0:
                pinned.add(idx(j, i))
    cons = []
    for j in range(NR + 1):
        for i in range(NU + 1):
            for dj, di, k in ((0, 1, 1.0), (1, 0, 1.0), (1, 1, 0.5), (1, -1, 0.5), (0, 2, 0.15), (2, 0, 0.15)):
                jj, ii = j + dj, i + di
                if 0 <= jj <= NR and 0 <= ii <= NU:
                    rest = (flat(jj, ii) - flat(j, i)).length
                    # the free side panels are gathered a little (no buckled flaps at the ears)
                    gather = 1.0 - 0.06 * smoothstep(A_H - 0.02, A_H + 0.06, abs(-U + 2 * U * i / NU)) * (1.0 if dj == 0 else 0.4)
                    cons.append((idx(j, i), idx(jj, ii), rest * gather, k))
    clear = lambda p: 0.016 + 0.023 * smoothstep(1.47, 1.42, p.z)
    X = gfit.pbd_drape(P0, cons, pinned, FIT, ('head', 'neck', 'torso', 'armL', 'armR'), clear, iters=220)
    G = [[X[idx(j, i)] for i in range(NU + 1)] for j in range(NR + 1)]
    Gs = [[p.copy() for p in r] for r in G]
    gfit.smooth_grid(Gs, 2, fac=0.3)
    G = [[G[j][i] if idx(j, i) in pinned else FIT.conform(Gs[j][i], ('head', 'neck', 'torso', 'armL', 'armR'), clear(Gs[j][i])) for i in range(NU + 1)] for j in range(NR + 1)]
    ids = [[mb.add_v(p) for p in row] for row in G]
    for j in range(NR):
        for i in range(NU):
            u0, u1 = -U + 2 * U * i / NU, -U + 2 * U * (i + 1) / NU
            sv = lambda u, jj: hem(u) * jj / NR
            mb.add_f((ids[j][i], ids[j][i + 1], ids[j + 1][i + 1], ids[j + 1][i]),
                     ((u0, -sv(u0, j)), (u1, -sv(u1, j)), (u1, -sv(u1, j + 1)), (u0, -sv(u0, j + 1))))
    for j in range(NR + 1):
        for i in range(NU + 1):
            u = -U + 2 * U * i / NU; s = hem(u) * j / NR
            vi = ids[j][i]
            mb.set_attr('pu', vi, u); mb.set_attr('pv', vi, s)
            dists = [(s, u), (hem(u) - s, u), (U - abs(u), s)]
            d, al = min(dists)
            mb.set_attr('edist', vi, d); mb.set_attr('ealong', vi, al)
    # outward winding (away from the head)
    f0 = mb.f[(NR // 3) * NU + NU // 2]
    pa, pb, pc = (Vector(mb.v[k]) for k in f0[:3])
    if (pb - pa).cross(pc - pa).dot(pa - HC) < 0:
        mb.f = [tuple(reversed(f)) for f in mb.f]; mb.uv = [list(reversed(u)) for u in mb.uv]
    o = done(mb.build('GUL_Headscarf', [M_CLOTH]), 'head', 'Cloth')
    o['sheet'] = 1; o['chaos_cloth'] = 1

    print('SCARF S_TOT %.3f rows %d cols %d' % (S_TOT, NR, NU))
    print('SCARF centre col', [tuple(round(c, 3) for c in G[j][NU // 2]) for j in range(0, NR + 1, 3)])
    print('SCARF side col', [tuple(round(c, 3) for c in G[j][2]) for j in range(0, NR + 1, 3)])
    print('MER tail', [tuple(round(c, 3) for c in p) for p in MER[-12::2]], 'S_OCC', round(S_OCC, 3), 'smax', round(max(MER_S), 3))

def build_headband():
    mb = MB()
    sb = -0.024
    at = section(sb, base=0.0042, side_hair=0.0052, phi_max=math.radians(78), hang=False)
    M, tg, n = mer_at(sb)
    A = M - n * 0.072
    Ub = 0.118
    pts = [at(-Ub + 2 * Ub * k / 60) for k in range(61)]
    pts = smooth_pts(pts, 2)
    ups = [(p - A).normalized() for p in pts]
    def jk(v0, val):
        for k in range(v0, len(mb.v)): mb.set_attr('jk', k, val)
    v0 = len(mb.v)
    sweep(mb, pts, ups, rect_profile(0.013, 0.0016, 0.0005), uv_v=(0.02, 0.10), u_scale=3.0, cap=True)
    jk(v0, 0.0)
    acc = [0.0]
    for i in range(1, len(pts)): acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
    L = acc[-1]
    def on_band(a, lift=0.0, across=0.0):
        for i in range(len(acc) - 1):
            if acc[i + 1] >= a:
                t = (a - acc[i]) / max(acc[i + 1] - acc[i], 1e-9)
                p = pts[i].lerp(pts[i + 1], t); up = ups[i].lerp(ups[i + 1], t).normalized()
                tt = (pts[i + 1] - pts[i]).normalized(); sd = tt.cross(up).normalized()
                if sd.z < 0: sd = -sd
                return p + up * lift + sd * across, up, sd
        return pts[-1], ups[-1], Vector((0, 0, 1))
    r = random.Random(3)
    # coins (centre medallion bigger)
    for k in range(-5, 6):
        a = L / 2 + k * 0.0195
        big = k == 0
        rr = 0.0098 if big else 0.0066
        c, up, sd = on_band(a, lift=0.0018, across=-0.0015 if not big else -0.003)
        v0 = len(mb.v)
        prof = [(0.0, 0.0016 + (0.0016 if big else 0.0)), (rr * 0.35, 0.0016 + (0.0012 if big else 0.0)), (rr * 0.80, 0.0014), (rr, 0.0008), (rr, -0.0002), (0.0, -0.0002)]
        lathe_capped(mb, prof, 12, c, axis=up, uv_rect=(0.1 + 0.06 * (k + 5), 0.2, 0.15 + 0.06 * (k + 5), 0.3))
        jk(v0, 0.0)
    # red beads along the top edge, silver drops along the bottom edge
    nb = int((L - 0.02) / 0.0072)
    for k in range(nb):
        a = 0.01 + k * 0.0072
        c, up, sd = on_band(a, lift=0.0016, across=0.0086)
        v0 = len(mb.v); bead(mb, c, 0.0024, seg=6, rings=3, axis=sd, uvc=(r.random() * 0.8, 0.6), uvr=0.03); jk(v0, 1.0)
    nd = int((L - 0.03) / 0.0125)
    for k in range(nd):
        a = 0.015 + k * 0.0125
        c, up, sd = on_band(a, lift=0.0008, across=-0.0070)
        v0 = len(mb.v)
        lk = [c + up * 0.0008 - Vector((0, 0, 0.0085 * q / 3)) for q in range(4)]
        sweep(mb, lk, [up] * 4, rect_profile(0.0012, 0.0006, 0.0), uv_v=(0.1, 0.12), u_scale=3.0, cap=True)
        bead(mb, lk[-1] + Vector((0, 0, -0.0028)) + up * 0.0006, 0.0018, seg=6, rings=3, sy=1.6, uvc=(r.random() * 0.8, 0.8), uvr=0.03)
        jk(v0, 0.0)
    # temple pendants: three bead strands per side ending in silver leaves
    for end in (0.004, L - 0.004):
        c, up, sd = on_band(end, lift=0.002, across=-0.002)
        for q, (dl, off) in enumerate(((0.095, -0.006), (0.118, 0.0), (0.088, 0.006))):
            fwd = up.cross(Vector((0, 0, 1))).normalized()
            bead_strand(mb, c + fwd * off * (1 if end < 1 else -1) + up * 0.002, dl, 5, outward=up, seed=int(end * 1000) + q,
                        cord_r=0.0009, bead_r=0.0032)
    done(mb.build('GUL_Headband', [M_JEWEL]), 'head', 'Head')
