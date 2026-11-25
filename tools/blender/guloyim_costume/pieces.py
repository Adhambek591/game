# Executed inside build.py's namespace. Every piece of Guloyim's costume + armour.
# Conventions: metres, +Z up, -Y = front, +X = character's left. Rest/A-pose of her MetaHuman body (1.71 m).
import math, random
from mathutils import Vector, Matrix

def bone(n, end='head'):
    return Vector(BONES[n][end])

def mirror_mb(mb):
    m = MB()
    m.v = [(-x, y, z) for x, y, z in mb.v]
    m.f = [tuple(reversed(f)) for f in mb.f]
    m.uv = [list(reversed(u)) for u in mb.uv]
    m.m = list(mb.m)
    m.va = {k: dict(d) for k, d in mb.va.items()}
    return m

def build_pair(mbL, name, mats, boneL, group, sheet=False):
    obL = done(mbL.build(name + '_L', mats), boneL, group)
    obR = done(mirror_mb(mbL).build(name + '_R', mats), boneL[:-1] + 'r', group)
    obR['bake_skip'] = 1   # mirrored UVs overlap the left piece
    if sheet: obL['sheet'] = obR['sheet'] = 1
    return obL, obR

def surf_normal(S, u, v, center_fn, e=1e-3):
    p = S(u, v)
    n = (S(u + e, v) - S(u - e, v)).cross(S(u, v + e) - S(u, v - e)).normalized()
    if n.dot(p - center_fn(p)) < 0: n = -n
    return n

def strap(mb, pts, ups, w=0.03, t=0.004, key='strap', closed=False, mat=0, bevel=0.0012):
    return sweep(mb, pts, ups, rect_profile(w, t, bevel), closed=closed, uv_v=TRIM[key], u_scale=TRIM_U, mat=mat, cap=not closed)

def rivet_line(mb, pts, ups, every=0.05, offset=0.0, side_vecs=None, lift=0.0, r=0.0032, rng=None, mat=0):
    L = 0.0; nxt = every * 0.5
    for i in range(1, len(pts)):
        seg = (pts[i] - pts[i - 1]).length
        while L + seg >= nxt:
            t = (nxt - L) / seg
            p = pts[i - 1].lerp(pts[i], t)
            up = ups[i - 1].lerp(ups[i], t).normalized()
            if side_vecs:
                p = p + side_vecs[i].normalized() * offset
            u = (rng.random() * 0.9 + 0.05) if rng else 0.5
            rivet(mb, p + up * lift, up, r=r, h=r * 0.5, uvc=(u, 0.80 + (rng.random() * 0.15 if rng else 0.07)), uvr=0.011, mat=mat)
            nxt += every
        L += seg

def catmull(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)

def spline(ctrl, step):
    """Catmull-Rom through control points, resampled by arc length"""
    P = [ctrl[0]] + list(ctrl) + [ctrl[-1]]
    dense = []
    for i in range(1, len(P) - 2):
        for k in range(12):
            dense.append(catmull(P[i - 1], P[i], P[i + 1], P[i + 2], k / 12))
    dense.append(ctrl[-1].copy())
    return resample(dense, step=step)[0]

def circ_smooth(a, it=2):
    n = len(a)
    for _ in range(it):
        a = [(a[i - 1] + 2 * a[i] + a[(i + 1) % n]) / 4 for i in range(n)]
    return a

def fill_circ(vals):
    """fill None entries of a circular list by linear interpolation between known neighbours"""
    n = len(vals); known = [i for i in range(n) if vals[i] is not None]
    if not known: return None
    out = list(vals)
    for i in range(n):
        if out[i] is None:
            a = max([k for k in known if k < i], default=known[-1] - n)
            b = min([k for k in known if k > i], default=known[0] + n)
            t = (i - a) / (b - a)
            out[i] = vals[a % n] * (1 - t) + vals[b % n] * t
    return out

# =========================================================== torso radial tables (real body)
TZ0, TDZ, TNZ = 0.94, 0.01, 57          # z 0.94 .. 1.50
TNU = 96
_TC = ('torso', 'neck', 'legL', 'legR')
def _cy(z):
    s = FIT.slice(('torso', 'neck'), z, dz=0.008, xlim=(-0.13, 0.13))
    return (s[2] + s[3]) / 2 if s else None
TCY = fill_circ([_cy(TZ0 + TDZ * k) for k in range(TNZ)] + [None] * 0)   # (linear fill; ends copied)
for _ in range(3):
    TCY = [TCY[0]] + [(TCY[k - 1] + 2 * TCY[k] + TCY[k + 1]) / 4 for k in range(1, TNZ - 1)] + [TCY[-1]]
TR = []
for k in range(TNZ):
    z = TZ0 + TDZ * k
    row = []
    for i in range(TNU):
        u = 2 * math.pi * i / TNU
        row.append(FIT.ray_dist(_TC, Vector((0, TCY[k], z)), Vector((math.sin(u), -math.cos(u), 0)), 0.4))
    TR.append(row)
for k in range(TNZ):
    TR[k] = fill_circ(TR[k]) or (TR[k - 1] if k else None)
TR_BODY = [circ_smooth(r, 2) for r in TR]

def convex_row(cy, row):
    """convex hull of the polar row (in its slice plane), resampled on the same rays"""
    P = [(math.sin(2 * math.pi * i / TNU) * r, -math.cos(2 * math.pi * i / TNU) * r) for i, r in enumerate(row)]
    pts = sorted(P)
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    H = lo[:-1] + up[:-1]
    out = []
    for i in range(TNU):
        u = 2 * math.pi * i / TNU; d = (math.sin(u), -math.cos(u))
        best = row[i]
        for k in range(len(H)):
            a, b = H[k], H[(k + 1) % len(H)]
            e = (b[0] - a[0], b[1] - a[1])
            den = d[0] * e[1] - d[1] * e[0]
            if abs(den) < 1e-12: continue
            t = (a[0] * e[1] - a[1] * e[0]) / den
            s = (a[0] * d[1] - a[1] * d[0]) / den
            if t > 0 and -1e-6 <= s <= 1 + 1e-6:
                best = max(best, t); break
        out.append(best)
    return out
TR_HULL = [circ_smooth(convex_row(TCY[k], TR[k]), 1) for k in range(TNZ)]
# rigid lamellar can't follow the waist in: limit the radial slope between rows (both directions)
SLOPE = 0.30 * TDZ
for i in range(TNU):
    for k in range(TNZ - 2, -1, -1):
        TR_HULL[k][i] = max(TR_HULL[k][i], TR_HULL[k + 1][i] - SLOPE)
    for k in range(1, TNZ):
        TR_HULL[k][i] = max(TR_HULL[k][i], TR_HULL[k - 1][i] - SLOPE)
for _ in range(2):
    TR_HULL = [TR_HULL[0]] + [[(TR_HULL[k - 1][i] + 2 * TR_HULL[k][i] + TR_HULL[k + 1][i]) / 4 for i in range(TNU)] for k in range(1, TNZ - 1)] + [TR_HULL[-1]]

def tab_r(tab, u, z):
    """bicubic (Catmull-Rom) lookup: periodic in u, clamped in z"""
    fu = (u % (2 * math.pi)) / (2 * math.pi) * TNU
    iu = int(math.floor(fu)); tu = fu - iu
    fz = min(max((z - TZ0) / TDZ, 0.0), TNZ - 1.0001)
    iz = int(math.floor(fz)); tz = fz - iz
    rows = []
    for dz in (-1, 0, 1, 2):
        k = min(max(iz + dz, 0), TNZ - 1)
        r = tab[k]
        rows.append(catmull(r[(iu - 1) % TNU], r[iu % TNU], r[(iu + 1) % TNU], r[(iu + 2) % TNU], tu))
    return catmull(rows[0], rows[1], rows[2], rows[3], tz)
def cy_at(z):
    fz = min(max((z - TZ0) / TDZ, 0.0), TNZ - 1.0001); iz = int(fz); t = fz - iz
    return TCY[iz] * (1 - t) + TCY[min(iz + 1, TNZ - 1)] * t
def torso_S(u, v, grow=0.0, tab=None):
    r = tab_r(tab or TR_HULL, u, v) + grow
    return Vector((math.sin(u) * r, cy_at(v) - math.cos(u) * r, v))
axis_c = lambda p: Vector((0, cy_at(p.z), p.z))
print('TORSO R hull z1.00/1.10/1.25/1.35 front', [round(tab_r(TR_HULL, 0, z), 3) for z in (1.0, 1.1, 1.25, 1.35)],
      'side', [round(tab_r(TR_HULL, math.pi / 2, z), 3) for z in (1.0, 1.1, 1.25, 1.35)])

# =========================================================== skirt dims (body slices, A-line)
def _skirt_dims():
    out = []
    zs = [1.02 - 0.01 * k for k in range(56)]           # 1.02 .. 0.47
    prev = None
    for z in zs:
        s = FIT.slice(('torso', 'legL', 'legR'), z, dz=0.008, xlim=(-0.26, 0.26))     # hands hang at hip height: keep them out
        a = max(abs(s[0]), abs(s[1])); cy = cy_at(min(max(z, 0.95), 1.0))
        bf = cy - s[2]; bb = s[3] - cy
        tc = 0.012 + 0.014 * smoothstep(0.975, 0.90, z)   # clears the baggy trousers on the thighs, stays under the belt at the waist
        a += tc; bf += tc; bb += tc - 0.002
        fl = max(0.0, 0.96 - z)
        a += fl * 0.05; bf += fl * 0.05; bb += fl * 0.08
        if prev and z < 0.97:
            a, bf, bb = max(a, prev[1]), max(bf, prev[2]), max(bb, prev[3])
        prev = (z, a, bf, bb)
        out.append((z, a, bf, bb, cy))
    return out[::-1]
SKD = _skirt_dims()
def skirt_dims(z):
    a, bf, bb, cy = interp_table(SKD, z)
    return a, bf, bb, cy
def skirt_S(u, z, grow=0.0, n=2.3):
    a, bf, bb, cy = skirt_dims(z)
    a += grow; bf += grow; bb += grow
    s, c = math.sin(u), math.cos(u)
    x = a * math.copysign(abs(s) ** (2 / n), s)
    y = cy - bf * abs(c) ** (2 / n) if c > 0 else cy + bb * abs(c) ** (2 / n)
    return Vector((x, y, z))
skirt_c = lambda p: Vector((0, skirt_dims(p.z)[3], p.z))

# =========================================================== CLOTH: tunic torso + collar
def build_tunic_torso():
    mb = MB()
    nu = 64
    zc = 1.36; cyc = cy_at(zc)
    rows = []
    for k in range(17):                                   # cylindrical part 0.955 .. 1.36
        z = 0.955 + (zc - 0.955) * k / 16
        rows.append([torso_S(2 * math.pi * i / nu, z, grow=0.0045, tab=TR_BODY) for i in range(nu)])
    for k in range(1, 9):                                 # spherical yoke up to the neck base
        e = math.radians(62) * k / 8
        R = []
        for i in range(nu):
            u = 2 * math.pi * i / nu
            d = Vector((math.cos(e) * math.sin(u), -math.cos(e) * math.cos(u), math.sin(e)))
            R.append(FIT.ray_dist(('torso', 'neck'), Vector((0, cyc, zc)), d, 0.4))
        R = circ_smooth(fill_circ(R), 2)
        rows.append([Vector((0, cyc, zc)) + Vector((math.cos(e) * math.sin(2 * math.pi * i / nu), -math.cos(e) * math.cos(2 * math.pi * i / nu), math.sin(e))) * (R[i] + 0.0045) for i in range(nu)])
    gfit.smooth_grid(rows, 2, closed_u=True, fix_rows=(0,), fac=0.35)
    for j in range(len(rows)):
        rows[j] = [FIT.conform(p, ('torso', 'neck'), 0.004) for p in rows[j]]
    shell(mb, rows, 0.003, out_fn=lambda p: p - Vector((0, cyc, min(p.z, zc) - 0.02)), closed_u=True, back=False)
    done(mb.build('GUL_Tunic_Torso', [M_CLOTH]), 'spine_03', 'Cloth')
    return rows[-1]

def build_collar(neck_ring):
    """stand collar on the neck base with a V opening at the front, blue with edging (border attributes)"""
    mb = MB()
    nb = sum(neck_ring, Vector()) / len(neck_ring)
    gap = 0.30
    ni, nj = 34, 5
    G = []
    for j in range(nj):
        row = []
        for i in range(ni + 1):
            u = gap + (2 * math.pi - 2 * gap) * i / ni
            h = 0.034 * j / (nj - 1) * (0.75 + 0.25 * abs(math.cos(u / 2)))       # lower toward the V
            base = Vector((nb.x + math.sin(u) * 0.075, nb.y - math.cos(u) * 0.065, nb.z - 0.010 + 0.012 * (1 - math.cos(u)) / 2 + h))
            d = Vector((math.sin(u), -math.cos(u), 0))
            r = FIT.ray_dist(('neck', 'torso', 'head'), Vector((0, nb.y + 0.005, base.z)), d, 0.3) or 0.06
            row.append(Vector((0, nb.y + 0.005, base.z)) + d * (r + 0.007 + 0.002 * (1 - j / (nj - 1))))
        G.append(row)
    F, N = shell(mb, G, 0.0035, out_fn=lambda p: Vector((p.x, p.y - nb.y, 0)))
    # border attributes: distance to top edge and to the V edges (metres)
    for j in range(nj):
        for i in range(ni + 1):
            dv = (nj - 1 - j) * 0.034 / (nj - 1)
            du = min(i, ni - i) * (2 * math.pi - 2 * gap) * 0.07 / ni
            mb.set_attr('edist', F[j][i], min(dv, du)); mb.set_attr('ealong', F[j][i], i * 0.012 + j * 0.0)
    done(mb.build('GUL_Tunic_Collar', [M_CLOTH]), 'neck_01', 'Cloth')

# =========================================================== CLOTH: skirt (Chaos Cloth grid with front slit)
SK_TOP, SK_HEM, SLIT_TOP = 1.000, 0.480, 0.800
def build_skirt():
    mb = MB()
    NS, NR = 46, 21
    zs = [SK_TOP - (SK_TOP - SK_HEM) * j / NR for j in range(NR + 1)]
    def gap(z):
        return 0.0 if z >= SLIT_TOP else 0.008 + 0.034 * (SLIT_TOP - z) / (SLIT_TOP - SK_HEM)
    P = []
    for j, z in enumerate(zs):
        a, bf, bb, cy = skirt_dims(z)
        ga = gap(z) / max(bf, 0.05)
        depth = (SK_TOP - z) / (SK_TOP - SK_HEM)
        row = []
        for i in range(NS + 1):
            u = ga + (2 * math.pi - 2 * ga) * i / NS
            p = skirt_S(u, z)
            amp = 0.020 * depth ** 1.25
            r = Vector((p.x, p.y - cy, 0)).normalized()
            # soft hanging folds: 9 main lobes with uneven phase, smaller ones between, deeper toward the hem
            ph = u * 9 + 0.5 + 0.6 * math.sin(u * 2 + 0.3)
            p = p + r * (amp * math.sin(ph) + amp * 0.30 * math.sin(u * 17 + 1.9)) + Vector((0, 0, 0.004 * depth * math.cos(ph)))
            row.append(p)
        P.append(row)
    # hem allowance turned inside (one row, 12 mm up), keeps the edge looking thick
    hem = [p + Vector((0, 0, 0.012)) - Vector((p.x, p.y - skirt_dims(SK_HEM)[3], 0)).normalized() * 0.004 for p in P[-1]]
    P.append(hem)
    # vertices: columns 0 and NS share vertices above the slit
    idx = []
    for j, row in enumerate(P):
        z = zs[min(j, NR)]
        closed = gap(z) == 0.0 and j <= NR
        ids = [mb.add_v(p) for p in row[:NS]]
        ids.append(ids[0] if closed else mb.add_v(row[NS]))
        idx.append(ids)
    # metric UV (u = arc, v = down) + border attributes
    arcs = []
    for row in P:
        a = [0.0]
        for i in range(1, NS + 1): a.append(a[-1] + (row[i] - row[i - 1]).length)
        arcs.append(a)
    vpos = [0.0]
    for j in range(1, len(P)): vpos.append(vpos[-1] + (P[j][NS // 2] - P[j - 1][NS // 2]).length)
    for j in range(len(P) - 1):
        for i in range(NS):
            q = (idx[j][i], idx[j][i + 1], idx[j + 1][i + 1], idx[j + 1][i])
            uv = ((arcs[j][i], -vpos[j]), (arcs[j][i + 1], -vpos[j]), (arcs[j + 1][i + 1], -vpos[j + 1]), (arcs[j + 1][i], -vpos[j + 1]))
            mb.add_f(q, uv)
    Lhem = vpos[NR]
    for j in range(len(P)):
        z = zs[min(j, NR)]
        for i in range(NS + 1):
            dh = Lhem - vpos[j] if j <= NR else -0.004
            ds = min(arcs[j][i], arcs[j][NS] - arcs[j][i]) if gap(z) > 0 else 9.0
            if gap(z) > 0 and j > 0 and gap(zs[j - 1]) == 0: ds = min(ds, 9.0)
            vi = idx[j][i]
            if ds < dh:
                mb.set_attr('edist', vi, ds); mb.set_attr('ealong', vi, vpos[min(j, NR)])
            else:
                mb.set_attr('edist', vi, dh); mb.set_attr('ealong', vi, arcs[min(j, NR)][i])
    # outward winding
    f0 = mb.f[NS * 5 + NS // 4]
    pa, pb, pc = (Vector(mb.v[k]) for k in f0[:3])
    n = (pb - pa).cross(pc - pa)
    if n.dot(Vector((pa.x, pa.y - skirt_dims(pa.z)[3], 0))) < 0:
        mb.f = [tuple(reversed(f)) for f in mb.f]; mb.uv = [list(reversed(u)) for u in mb.uv]
    o = done(mb.build('GUL_Tunic_Skirt', [M_CLOTH]), 'pelvis', 'Cloth')
    o['sheet'] = 1; o['chaos_cloth'] = 1
    return o

# =========================================================== CLOTH: trousers
def limb_tube(path, cats, ring_n, clear_fn, frames=None, min_r=0.03, ripple=None):
    """ring around each path point; radius = body hit along each ring direction + clear_fn(j); misses filled"""
    frames = frames or ring_frames(path)
    G = []
    for j, p in enumerate(path):
        t, n, b = frames[j]
        R = []
        for i in range(ring_n):
            a = 2 * math.pi * i / ring_n
            d = n * math.cos(a) + b * math.sin(a)
            R.append(FIT.ray_dist(cats, p, d, 0.3))
        R = fill_circ(R) or [min_r] * ring_n
        R = circ_smooth([max(r, min_r) for r in R], 2)
        c = clear_fn(j)
        rp = (lambda i: ripple(j, 2 * math.pi * i / ring_n)) if ripple else (lambda i: 0.0)
        G.append([p + (n * math.cos(2 * math.pi * i / ring_n) + b * math.sin(2 * math.pi * i / ring_n)) * (R[i] + c + rp(i)) for i in range(ring_n)])
    return G

def build_trousers():
    mb = MB()
    th = bone('thigh_l'); ca = bone('calf_l'); ft = bone('foot_l')
    top = th + Vector((-0.012, 0.0, 0.055))
    endz = 0.335                                           # tucked 4 cm into the boot
    end = ca.lerp(ft, (ca.z - endz) / (ca.z - ft.z))
    ctrl = [top, th, th.lerp(ca, 0.5), ca, end]
    path = spline(ctrl, 0.022)
    n = len(path)
    def clear(j):
        z = path[j].z
        c = 0.011 + 0.004 * smoothstep(0.95, 0.80, z)                       # roomy seat / thighs
        c += 0.013 * math.exp(-((z - 0.42) / 0.050) ** 2)                   # bloused over the boot tops
        c += 0.008 * math.exp(-((z - 0.55) / 0.08) ** 2)                    # baggy at the knee
        c -= (c - 0.0035) * smoothstep(0.385, 0.355, z)                     # tucked into the boot shaft
        return c
    def ripple(j, a):
        z = path[j].z
        w = math.exp(-((z - 0.43) / 0.07) ** 2)
        return w * 0.0045 * math.sin(z * 2 * math.pi / 0.028 + 2.2 * math.sin(2 * a + 0.7))
    G = limb_tube(path, ('legL',), 24, clear, ripple=ripple)
    for j in range(n):
        G[j] = [FIT.conform(p, ('legL', 'torso'), 0.008 if path[j].z > 0.45 else 0.0035) for p in G[j]]
    gfit.smooth_grid(G, 1, closed_u=True, fac=0.25)
    shell(mb, G, 0.003, out_fn=lambda p: p - min(path, key=lambda q: (q - p).length), closed_u=True, back=False)
    build_pair(mb, 'GUL_Trousers', [M_CLOTH], 'thigh_l', 'Cloth')

# =========================================================== CLOTH: sleeves
def build_sleeves():
    mb = MB()
    sh = bone('upperarm_l'); el = bone('lowerarm_l'); wr = bone('hand_l')
    d0 = (el - sh).normalized()
    ua = gfit.limb_centres(FIT, 'armL', sh, el, [0.25, 0.5, 0.75], rmax=0.075)
    fa = gfit.limb_centres(FIT, 'armL', el, wr, [0.0, 0.3, 0.6, 0.85, 0.96], rmax=0.06)
    ctrl = [sh - d0 * 0.035, sh] + ua + fa
    path = spline(ctrl, 0.021)
    n = len(path)
    Lup = (el - sh).length + 0.035
    acc = [0.0]
    for j in range(1, n): acc.append(acc[-1] + (path[j] - path[j - 1]).length)
    def clear(j):
        s = acc[j]
        if s < Lup: return 0.014 - 0.004 * (s / Lup)
        t = (s - Lup) / (acc[-1] - Lup)
        return 0.010 - 0.004 * smoothstep(0.15, 0.4, t) + 0.002 * smoothstep(0.92, 1.0, t)
    G = limb_tube(path, ('armL',), 24, clear, min_r=0.028)
    for j in range(n):
        G[j] = [FIT.conform(p, ('armL', 'torso'), 0.005) for p in G[j]]
    gfit.smooth_grid(G, 2, closed_u=True, fac=0.3)
    shell(mb, G, 0.003, out_fn=lambda p: p - min(path, key=lambda q: (q - p).length), closed_u=True, back=False)
    build_pair(mb, 'GUL_Sleeve', [M_CLOTH], 'upperarm_l', 'Cloth')

# =========================================================== TORSO: lamellar cuirass
CU_GROW = 0.011
SH_DZ = bone('upperarm_l').z - 1.383          # shoulder height relative to the body these tables were drawn on
_CT0 = [(0.00, 1.302), (0.12, 1.312), (0.30, 1.352), (0.62, 1.392), (0.95, 1.360), (1.30, 1.272), (1.62, 1.252), (1.95, 1.300), (2.35, 1.395), (2.80, 1.415), (math.pi, 1.418)]
_CT = [(a_, z_ + SH_DZ * smoothstep(1.0, 1.40, z_)) for a_, z_ in _CT0]
def cuirass_top(u):
    au = abs(math.atan2(math.sin(u), math.cos(u)))
    return interp_table(_CT, au)[0]
CU_BOT = 1.000

def build_cuirass():
    mb = MB()
    rows = [CU_BOT + 0.032 * i for i in range(14)]
    S = lambda u, v: torso_S(u, v, grow=CU_GROW)
    mask = lambda u, v: v + PLATE_H * 0.80 <= min(cuirass_top(u + d) for d in (-0.07, -0.035, 0.0, 0.035, 0.07)) + 0.002
    n = place_rows(mb, S, rows, 0.0192, axis_c, rng, PLATES, LACES, closed=True, u_range=(0, 2 * math.pi), mask=mask,
                   tilt=math.radians(-3.5), yaw=math.radians(2.5), jitter=0.22)
    print('cuirass plates', n)
    done(mb.build('GUL_Cuirass_Lamellar', [M_LAM]), 'spine_04', 'Torso')
    tm = MB()
    us = [2 * math.pi * k / 360 for k in range(360)]
    pts = [torso_S(u, cuirass_top(u), grow=CU_GROW + 0.003) for u in us]
    ups = [surf_normal(S, u, cuirass_top(u), axis_c) for u in us]
    upv = [(S(u, cuirass_top(u) + 0.01) - S(u, cuirass_top(u) - 0.01)).normalized() for u in us]
    pts = smooth_pts(pts, 2, closed=True)
    prof = edging_profile(w_front=0.022, w_back=0.008, t=0.0065)
    if (pts[1] - pts[0]).normalized().cross(ups[0]).dot(upv[0]) < 0:
        pts = pts[::-1]; ups = ups[::-1]; upv = upv[::-1]
    sweep(tm, pts, ups, prof, closed=True, uv_v=TRIM['edge'], u_scale=TRIM_U)
    rivet_line(tm, pts + [pts[0]], ups + [ups[0]], every=0.055, offset=-0.012, side_vecs=upv + [upv[0]], lift=0.0068, rng=rng, r=0.0030)
    # shoulder straps: front top edge -> over the trapezius -> back top edge
    for sx in (1, -1):
        uf, ub = 0.66 * sx, (math.pi - 0.78) * sx
        pf = torso_S(uf, cuirass_top(uf) - 0.016, grow=CU_GROW + 0.005)
        pb = torso_S(ub, cuirass_top(ub) - 0.016, grow=CU_GROW + 0.005)
        xm = (pf.x + pb.x) / 2
        ctrl = [pf, Vector((xm * 1.02, pf.y * 0.55 + 0.01, 1.448 + SH_DZ)), Vector((xm * 1.02, 0.006 + bone('neck_01').y - 0.013, 1.478 + SH_DZ)),
                Vector((xm * 1.02, pb.y * 0.55, 1.452 + SH_DZ)), pb]
        path = spline(ctrl, 0.010)
        path = [FIT.conform(p, ('torso', 'neck'), 0.011) for p in path]
        path = smooth_pts(path, 4)
        ups2 = [(p - Vector((p.x * 0.6, cy_at(min(p.z, 1.5)), 1.36))).normalized() for p in path]
        strap(tm, path, ups2, w=0.034, t=0.0045)
        rivet_line(tm, path, ups2, every=0.05, lift=0.0045, rng=rng, r=0.0028)
    done(tm.build('GUL_Cuirass_Trim', [M_TRIM]), 'spine_05', 'Torso')

# =========================================================== TORSO: belt, silver plaques, cords
BELT_Z, BELT_W = 1.010, 0.058
BELT_GROW = CU_GROW + 0.0085
_BELT_CACHE = {}
def _skirt_polar(v, grow):
    key = (round(v, 4), round(grow, 4))
    if key not in _BELT_CACHE:
        cy = cy_at(v); tab = [0.0] * 360
        for k in range(1440):
            q = skirt_S(2 * math.pi * k / 1440, max(v, TAS_BOT), grow=grow)
            a = math.atan2(q.x, -(q.y - cy)) % (2 * math.pi); i = int(a / (2 * math.pi) * 360) % 360
            tab[i] = max(tab[i], math.hypot(q.x, q.y - cy))
        for i in range(360):
            if tab[i] == 0.0: tab[i] = tab[i - 1]
        _BELT_CACHE[key] = tab
    return _BELT_CACHE[key]
def belt_S(u, v, grow=0.0):
    """belt surface: over the cuirass AND over the tasset tops that hang from under it"""
    p = torso_S(u, v, grow=BELT_GROW + grow)
    cy = cy_at(v)
    d = Vector((p.x, p.y - cy, 0)); r1 = d.length; d.normalize()
    a = math.atan2(d.x, -d.y) % (2 * math.pi)
    r2 = _skirt_polar(v, 0.014 + 0.0105)[int(a / (2 * math.pi) * 360) % 360] + grow
    return Vector((0, cy, v)) + d * max(r1, r2)

def build_belt():
    bm = MB()
    us = [2 * math.pi * k / 150 for k in range(150)]
    S = lambda u, v: belt_S(u, v)
    pts = [S(u, BELT_Z) for u in us]
    ups = [surf_normal(S, u, BELT_Z, axis_c) for u in us]
    strap(bm, pts, ups, w=BELT_W, t=0.006, key='redstrap', closed=True)
    done(bm.build('GUL_Belt', [M_TRIM]), 'spine_01', 'Torso')
    gm = MB()
    PLQ = []
    def plaque(u, r, boss):
        p = belt_S(u, BELT_Z, 0.006)
        nrm = surf_normal(S, u, BELT_Z, axis_c)
        PLQ.append([p.x, p.y, p.z, nrm.x, nrm.y, nrm.z, r])
        M = frame(p, nrm, Vector((0, 0, 1)))
        prof = [(0.0, 0.0028 + boss), (r * 0.30, 0.0026 + boss * 0.8), (r * 0.55, 0.0028), (r * 0.80, 0.0024), (r * 0.95, 0.0016), (r, 0.0006), (r, -0.0012), (0.0, -0.0012)]
        lathe_capped(gm, prof, 16, M.translation, axis=nrm, uv_rect=(0.02 + (u % 1) * 0.5, 0.02, 0.5 + (u % 1) * 0.5, 0.4))
    for u in (0.56, 1.12, 1.72, 2.40, -0.56, -1.12, -1.72, -2.40, math.pi):
        plaque(u, 0.0235, 0.0012)
    plaque(0.0, 0.0315, 0.0040)
    for k in range(len(gm.v)): gm.set_attr('jk', k, 0.0)
    o = done(gm.build('GUL_Belt_Silver', [M_JEWEL]), 'spine_01', 'Torso')
    o['plaques'] = PLQ
    # dangling bead + pendant cords (front right long, left side short)
    cm = MB()
    for u, L, nb in ((-0.42, 0.290, 8), (0.86, 0.170, 5)):
        top = belt_S(u, BELT_Z - BELT_W * 0.45, 0.006)
        bead_strand(cm, top, L, nb, outward=surf_normal(S, u, BELT_Z, axis_c), seed=int(u * 100), cord_r=0.0017, bead_r=0.0058, pscale=1.7)
    done(cm.build('GUL_Belt_Cords', [M_JEWEL]), 'pelvis', 'Torso')

def bead_strand(mb, top, L, nbeads, outward, seed=0, pendant=True, cord_r=0.0011, bead_r=0.0042, pscale=1.0):
    """hanging cord with alternating red / silver beads and a silver leaf pendant; 'jk' attr: 0 silver 1 red 2 cord"""
    r = random.Random(seed)
    out = (outward - Vector((0, 0, 1)) * outward.z).normalized() if outward.length > 0 else Vector((0, -1, 0))
    pts = [top + out * (0.004 * math.sin(math.pi * k / 16)) + Vector((0, 0, -L * k / 16)) for k in range(17)]
    v0 = len(mb.v)
    sweep(mb, pts, [out] * len(pts), [(math.cos(2 * math.pi * q / 4) * cord_r, math.sin(2 * math.pi * q / 4) * cord_r) for q in range(5)],
          uv_v=(0.0, 0.05), u_scale=2.0, cap=True)
    for k in range(v0, len(mb.v)): mb.set_attr('jk', k, 2.0)
    for b in range(nbeads):
        z = L * (0.10 + 0.70 * b / max(nbeads - 1, 1))
        c = top + Vector((0, 0, -z)) + out * 0.003
        red = b % 2 == 0
        v0 = len(mb.v)
        bead(mb, c, bead_r * (1.0 if red else 0.8), seg=8, rings=4, sy=0.85 if red else 1.15, uvc=(r.random() * 0.8, 0.5 + r.random() * 0.4), uvr=0.03)
        for k in range(v0, len(mb.v)): mb.set_attr('jk', k, 1.0 if red else 0.0)
    if pendant:
        c = top + Vector((0, 0, -L - 0.004)) + out * 0.004
        v0 = len(mb.v)
        prof = [(r_ * pscale, h_ * pscale) for r_, h_ in ((0.0, 0.0), (0.0035, -0.004), (0.0060, -0.014), (0.0055, -0.024), (0.0030, -0.033), (0.0, -0.040))]
        lathe_capped(mb, prof, 8, c, sx=1.0, sy=0.35, uv_rect=(0.6, 0.1, 0.95, 0.45))
        for k in range(v0, len(mb.v)): mb.set_attr('jk', k, 0.0)

# =========================================================== TORSO: tassets (on the skirt surface)
TAS_TOP, TAS_BOT = 1.000, 0.835
def tas_S(u, v, grow=0.0):
    return skirt_S(u, v, grow=0.014 + grow)
def build_tassets():
    mb = MB(); tm = MB()
    panels = [(0.56, 2.55), (-2.55, -0.56)]          # approved picture: one wrap-around plate skirt on each hip, tunic open front and back
    for (u0, u1) in panels:
        S = lambda u, w: tas_S(u, TAS_BOT + w)
        mg = 0.013 / 0.22
        rows = [0.010 + 0.032 * k for k in range(8) if TAS_BOT + 0.010 + 0.032 * k + PLATE_H * 0.5 < TAS_TOP]
        mask = lambda u, w: TAS_BOT + w + PLATE_H * 0.7 < TAS_TOP + 0.03
        place_rows(mb, S, rows, 0.0192, skirt_c, rng, PLATES, LACES, closed=False, u_range=(u0 + mg, u1 - mg), mask=mask, tilt=math.radians(-3.5), yaw=math.radians(2.5), jitter=0.22)
        pts = []; ups = []
        def addp(u, v):
            pts.append(tas_S(u, v, grow=0.003)); ups.append(surf_normal(tas_S, u, v, skirt_c))
        K = 10
        for k in range(K + 1): addp(u0, TAS_TOP - (TAS_TOP - TAS_BOT) * k / K)
        for k in range(1, 30): addp(u0 + (u1 - u0) * k / 30, TAS_BOT)
        for k in range(K + 1): addp(u1, TAS_BOT + (TAS_TOP - TAS_BOT) * k / K)
        pts = smooth_pts(pts, 1)
        prof = edging_profile(w_front=0.019, w_back=0.008, t=0.006)
        t0 = (pts[1] - pts[0]).normalized()
        outward0 = (tas_S(u0 - 0.05, TAS_TOP - 0.05) - tas_S(u0, TAS_TOP - 0.05)).normalized()
        if t0.cross(ups[0]).dot(outward0) < 0:
            pts = pts[::-1]; ups = ups[::-1]
        sweep(tm, pts, ups, prof, uv_v=TRIM['edge'], u_scale=TRIM_U, cap=True)
    done(mb.build('GUL_Tassets_Lamellar', [M_LAM]), 'pelvis', 'Torso')
    done(tm.build('GUL_Tassets_Trim', [M_TRIM]), 'pelvis', 'Torso')

# =========================================================== ARMS: pauldrons
_PF = {}
def pauldron_frame():
    """axis = the real upper-arm section centres (fit), Up = upward normal of the arm, F = front"""
    if not _PF:
        sh = bone('upperarm_l'); el = bone('lowerarm_l')
        C = gfit.limb_centres(FIT, 'armL', sh, el, [0.15, 0.32, 0.50, 0.68], rmax=0.08)
        D = (C[-1] - C[0]).normalized()
        J = C[0] - D * (0.15 * (el - sh).length) + Vector((0, 0, 0.004))
        Up = (Vector((0, 0, 1)) - D * D.z).normalized()
        F = Up.cross(D).normalized()
        if F.y > 0: F = -F
        SS = [-0.075 + 0.02 * k for k in range(16)]
        UU = [-1.95 + 3.9 * k / 26 for k in range(27)]
        R = []
        for s_ in SS:
            row = []
            for u in UU:
                d = Up * math.cos(u) + F * math.sin(u)
                cats = ('armL', 'torso') if s_ < 0.03 else ('armL',)
                h = FIT.ray_dist(cats, J + D * s_, d, 0.2)
                row.append(min(h, 0.105) if h else None)
            kn = [x for x in row if x is not None]
            R.append([x if x is not None else (max(kn) if kn else 0.07) for x in row])
        for _ in range(3):        # smooth over s and u
            R = [[(R[max(j - 1, 0)][i] + R[min(j + 1, len(SS) - 1)][i] + R[j][max(i - 1, 0)] + R[j][min(i + 1, len(UU) - 1)] + 4 * R[j][i]) / 8
                  for i in range(len(UU))] for j in range(len(SS))]
        # a rigid layered shell: never narrower toward the bottom than above (no waist), hugs otherwise
        for j in range(1, len(SS)):
            R[j] = [max(R[j][i], R[j - 1][i] - 0.006) for i in range(len(UU))]
        _PF.update(J=J, D=D, Up=Up, F=F, SS=SS, UU=UU, R=R)
    return _PF['J'], _PF['D'], _PF['Up'], _PF['F']
def _paul_r(s_, u):
    SS, UU, R = _PF['SS'], _PF['UU'], _PF['R']
    fs = min(max((s_ - SS[0]) / (SS[1] - SS[0]), 0.0), len(SS) - 1.001); j = int(fs); ts = fs - j
    fu = min(max((u - UU[0]) / (UU[1] - UU[0]), 0.0), len(UU) - 1.001); i = int(fu); tu = fu - i
    a = R[j][i] * (1 - tu) + R[j][i + 1] * tu; b = R[j + 1][i] * (1 - tu) + R[j + 1][i + 1] * tu
    return a * (1 - ts) + b * ts
def paul_S(u, v, dr=0.0):
    J, D, Up, F = pauldron_frame()
    s_ = -v
    R = _paul_r(s_, u) + 0.022 + 0.020 * smoothstep(0.0, 0.21, s_) ** 1.3 + dr      # over sleeve + backing, slight flare of the lower layers
    return J + D * s_ + (Up * math.cos(u) + F * math.sin(u)) * R
def build_pauldrons():
    J, D, Up, F = pauldron_frame()
    mb = MB(); tm = MB(); bk = MB()
    s0, s1 = -0.060, 0.220
    umax = 1.72
    ctr = lambda p: J + D * (p - J).dot(D)
    rows = []
    s = s1 - 0.006
    while s - PLATE_H * 0.6 > s0:
        rows.append(-s); s -= 0.031
    place_rows(mb, paul_S, rows, 0.0192, ctr, rng, PLATES, LACES, closed=False, u_range=(-umax + 0.05, umax - 0.05),
               mask=lambda u, v: -v - PLATE_H * 0.85 > s0 - 0.01, tilt=math.radians(-7), yaw=math.radians(2.5), jitter=0.22)
    G = [[paul_S(-umax + 2 * umax * i / 22, -(s0 + (s1 - s0) * j / 9), dr=-0.005) for i in range(23)] for j in range(10)]
    shell(bk, G, 0.0035, out_fn=lambda p: p - ctr(p))
    pts = []; ups = []
    def addp(u, v):
        pts.append(paul_S(u, v, dr=0.0025)); ups.append(surf_normal(paul_S, u, v, ctr))
    for k in range(44): addp(-umax + 2 * umax * k / 44, -s1)
    for k in range(14): addp(umax, -(s1 + (s0 - s1) * k / 14))
    for k in range(44): addp(umax - 2 * umax * k / 44, -s0)
    for k in range(14): addp(-umax, -(s0 + (s1 - s0) * k / 14))
    prof = edging_profile(w_front=0.020, w_back=0.008, t=0.0065)
    t0 = (pts[1] - pts[0]).normalized()
    if t0.cross(ups[0]).dot(D) < 0:
        pts = pts[::-1]; ups = ups[::-1]
    sweep(tm, pts, ups, prof, closed=True, uv_v=TRIM['edge'], u_scale=TRIM_U)
    side = []
    for i in range(len(pts)):
        t = (pts[(i + 1) % len(pts)] - pts[i - 1]).normalized(); side.append(t.cross(ups[i]))
    rivet_line(tm, pts + [pts[0]], ups + [ups[0]], every=0.05, offset=-0.012, side_vecs=side + [side[0]], lift=0.0068, rng=rng, r=0.0028)
    build_pair(mb, 'GUL_Pauldron_Lamellar', [M_LAM], 'upperarm_l', 'Arms')
    build_pair(tm, 'GUL_Pauldron_Trim', [M_TRIM], 'upperarm_l', 'Arms')
    build_pair(bk, 'GUL_Pauldron_Backing', [M_ARM], 'upperarm_l', 'Arms')

# =========================================================== ARMS: iron bracers with straps
def buckle(mb, c, n, along, w=0.018, h=0.016, bar=0.0026):
    n = n.normalized(); ax = (along - n * along.dot(n)).normalized(); by = n.cross(ax).normalized()
    K = 16
    rect = []
    for k in range(K):
        a = 2 * math.pi * k / K
        ca, sa = math.cos(a), math.sin(a)
        x = math.copysign(abs(ca) ** 0.5, ca) * w / 2; y = math.copysign(abs(sa) ** 0.5, sa) * h / 2
        rect.append(c + ax * x + by * y + n * 0.0012)
    sweep(mb, rect, [n] * K, rect_profile(bar, bar * 0.9, bar * 0.25), closed=True, uv_v=(0.80, 0.86), u_scale=TRIM_U)
    tg = [c + ax * (w * 0.62 * k / 5) + n * (0.0022 + 0.0006 * math.sin(math.pi * k / 5)) for k in range(6)]
    sweep(mb, tg, [n] * 6, rect_profile(0.0019, 0.0013, 0.0004), uv_v=(0.90, 0.94), u_scale=TRIM_U, cap=True)

def build_bracers():
    el0 = bone('lowerarm_l'); wr0 = bone('hand_l')
    cen = gfit.limb_centres(FIT, 'armL', el0, wr0, [0.25, 0.45, 0.65, 0.85, 0.97], rmax=0.06)
    el, wr = cen[0] + (cen[0] - cen[-1]) * (0.25 / 0.72), cen[-1] + (cen[-1] - cen[0]) * (0.03 / 0.72)
    ax = (wr - el).normalized()
    outd = Vector((0.45, -0.80, 0.35)); outd = (outd - ax * outd.dot(ax)).normalized()
    side = ax.cross(outd).normalized()
    t0, t1 = 0.30, 0.95
    L = (wr - el).length
    CT = [(0.25 + 0.20 * k, cen[k]) for k in range(4)] + [(0.97, cen[4])]
    def C(t):
        for k in range(len(CT) - 1):
            if t <= CT[k + 1][0] or k == len(CT) - 2:
                f = (t - CT[k][0]) / (CT[k + 1][0] - CT[k][0])
                return CT[k][1].lerp(CT[k + 1][1], f)
    # forearm radius along the bracer from the body (mean of ring hits)
    RT = []
    for k in range(11):
        t = t0 - 0.03 + (t1 - t0 + 0.05) * k / 10
        hs = [FIT.ray_dist(('armL',), C(t), outd * math.cos(a) + side * math.sin(a), 0.07) for a in [2 * math.pi * q / 16 for q in range(16)]]
        hs = sorted(h for h in hs if h) or [0.03]
        RT.append((t, min(hs[int(len(hs) * 0.75)], 0.045)))
    RT = [(t, (RT[max(i - 1, 0)][1] + 2 * r + RT[min(i + 1, len(RT) - 1)][1]) / 4) for i, (t, r) in enumerate(RT)]
    print('BRACER R', [round(r, 3) for t, r in RT])
    def R(t): return interp_table(RT, t)[0] + 0.0095     # over the sleeve
    def P(t, a, dr=0.0):
        return C(t) + (outd * math.cos(a) + side * math.sin(a)) * (R(t) + dr)
    axis_out = lambda p: p - C(min(max((p - el).dot(ax) / L, 0.0), 1.0))
    pl = MB(); lt = MB(); tr = MB()
    span = math.radians(118)
    nj, ni = 12, 18
    G = [[P(t0 + (t1 - t0) * j / (nj - 1), -span + 2 * span * i / (ni - 1),
            dr=0.0055 + 0.004 * smoothstep(0.75, 1.0, j / (nj - 1)) + 0.0025 * smoothstep(0.2, 0.0, j / (nj - 1)) + 0.0015 * (1 - abs(2 * i / (ni - 1) - 1)) ** 2)
          for i in range(ni)] for j in range(nj)]
    shell(pl, G, 0.0025, out_fn=axis_out)
    G2 = [[P(t0 - 0.02 + (t1 - t0 + 0.03) * j / 10, 2 * math.pi * i / 24, dr=0.0018) for i in range(24)] for j in range(11)]
    shell(lt, G2, 0.004, out_fn=axis_out, closed_u=True, back=True)
    # rolled iron rim along the plate border (part of the plate texture set)
    bpts = [G[0][i] for i in range(ni)] + [G[j][ni - 1] for j in range(1, nj)] + [G[nj - 1][i] for i in range(ni - 2, -1, -1)] + [G[j][0] for j in range(nj - 2, 0, -1)]
    bpts, _ = resample(bpts, step=0.006, closed=True)
    bpts = smooth_pts(bpts, 2, closed=True)
    ups = [axis_out(p).normalized() for p in bpts]
    sweep(pl, bpts, ups, [(math.cos(2 * math.pi * q / 6) * 0.0022, math.sin(2 * math.pi * q / 6) * 0.0022 + 0.0006) for q in range(7)], closed=True,
          uv_v=(0.0, 0.02), u_scale=1.0)
    for tt in (0.50, 0.82):
        a0, a1 = span - 0.10, 2 * math.pi - span + 0.10
        arc = [P(tt, a0 + (a1 - a0) * k / 24, dr=0.0068) for k in range(25)]
        strap(tr, arc, [axis_out(p).normalized() for p in arc], w=0.018, t=0.003)
        ab = span + 0.36
        bcen = P(tt, ab, dr=0.010); bn = axis_out(bcen).normalized()
        tang = (P(tt, ab + 0.05) - P(tt, ab - 0.05)).normalized()
        buckle(tr, bcen, bn, tang)
        tail = [P(tt, ab - 0.02 - 0.36 * k / 7, dr=0.0085 + (0.0035 if k < 3 else 0.005)) for k in range(8)]
        strap(tr, tail, [axis_out(p).normalized() for p in tail], w=0.015, t=0.0025)
        for a in (a0 + 0.07, a1 - 0.07):
            p = P(tt, a, dr=0.0095); rivet(tr, p, axis_out(p), r=0.0026, h=0.0015, uvc=(0.4, 0.86), uvr=0.011)
    build_pair(pl, 'GUL_Bracer_Plate', [M_ARM], 'lowerarm_l', 'Arms')
    build_pair(lt, 'GUL_Bracer_Leather', [M_ARM], 'lowerarm_l', 'Arms')
    build_pair(tr, 'GUL_Bracer_Trim', [M_TRIM], 'lowerarm_l', 'Arms')

# =========================================================== LEGS: tall brown riding boots
# Fitted ring by ring to her real foot / ankle / calf (rays from each slice centre), convex like stiff leather,
# slightly pointed toe, heel seat lifted onto a 2.5 cm stacked heel, layered 1.5 cm sole, welt, side / back seams,
# top binding, creases at the ankle. Ground (sole bottom) at z = -0.015.
BOOT_TOP = 0.378          # the turnaround: shafts end well below the knee, the trousers blouse over them
BNU = 48
SOLE_Z = -0.015
def heel_lift(y):
    """the heel seat rises onto the stacked heel (flat ground under both the forefoot and the heel)"""
    return 0.022 * smoothstep(-0.062, -0.022, y)

def hull_radii(R):
    n = len(R)
    P = [(math.sin(2 * math.pi * i / n) * r, -math.cos(2 * math.pi * i / n) * r) for i, r in enumerate(R)]
    pts = sorted(P)
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    H = lo[:-1] + up[:-1]
    out = []
    for i in range(n):
        u = 2 * math.pi * i / n; d = (math.sin(u), -math.cos(u)); best = R[i]
        for k in range(len(H)):
            a, b = H[k], H[(k + 1) % len(H)]
            e = (b[0] - a[0], b[1] - a[1]); den = d[0] * e[1] - d[1] * e[0]
            if abs(den) < 1e-12: continue
            t = (a[0] * e[1] - a[1] * e[0]) / den; s_ = (a[0] * d[1] - a[1] * d[0]) / den
            if t > 0 and -1e-6 <= s_ <= 1 + 1e-6: best = max(best, t); break
        out.append(best)
    return out

_BC = {}
def boot_cx(z):
    """slice centre of the left leg at z (outward directions for seams)"""
    k = round(min(max(z, 0.004), BOOT_TOP), 2)
    if k not in _BC:
        s = FIT.slice('legL', k, dz=0.006, xlim=(0.02, 0.4))
        _BC[k] = Vector(((s[0] + s[1]) / 2, (s[2] + s[3]) / 2, k))
    return _BC[k]
def boot_out(p):
    c = boot_cx(p.z)
    return Vector((p.x - c.x, p.y - c.y, 0.0))

def _boot_grid():
    zs = [0.004, 0.009, 0.014, 0.020, 0.026, 0.033, 0.040, 0.048, 0.056]
    zs += [0.064 + 0.0065 * k for k in range(19)]          # dense rings through the ankle (creases)
    zs += [0.19, 0.212, 0.236, 0.26, 0.285, 0.31, 0.335, 0.355, 0.368, BOOT_TOP]
    def slice_pts(z):
        s = FIT.slice('legL', z, dz=0.004, xlim=(0.02, 0.4))
        c = Vector(((s[0] + s[1]) / 2, (s[2] + s[3]) / 2, z))
        R = fill_circ([FIT.ray_dist(('legL',), c, Vector((math.sin(2 * math.pi * i / BNU), -math.cos(2 * math.pi * i / BNU), 0)), 0.3) for i in range(BNU)])
        return c, [c + Vector((math.sin(2 * math.pi * i / BNU), -math.cos(2 * math.pi * i / BNU), 0)) * R[i] for i in range(BNU)]
    LOW = {z: slice_pts(z) for z in (0.004, 0.009, 0.014, 0.020, 0.026, 0.032, 0.038, 0.044, 0.050, 0.056, 0.062, 0.068)}
    G = []
    for z in zs:
        if z < 0.05:
            # foot part: outline of everything from here up to 3.5 cm higher (toes, heel bulge stay inside)
            P = [q for zz, (cc, qs) in LOW.items() if z - 0.001 <= zz <= z + 0.035 for q in qs]
            xs = [q.x for q in P]; ys = [q.y for q in P]
            c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, z))
            R = [None] * BNU
            for q in P:
                v = Vector((q.x - c.x, q.y - c.y)); a = math.atan2(v.x, -v.y) % (2 * math.pi)
                i = int(round(a / (2 * math.pi) * BNU)) % BNU
                R[i] = max(R[i] or 0.0, v.length)
            R = fill_circ(R)
        else:
            s = FIT.slice('legL', z, dz=0.004, xlim=(0.02, 0.4))
            c = Vector(((s[0] + s[1]) / 2, (s[2] + s[3]) / 2, z))
            R = fill_circ([FIT.ray_dist(('legL',), c, Vector((math.sin(2 * math.pi * i / BNU), -math.cos(2 * math.pi * i / BNU), 0)), 0.3) for i in range(BNU)])
        R = circ_smooth(hull_radii(R), 1)
        clr = 0.0060 if z < 0.06 else (0.0055 + 0.0070 * smoothstep(0.13, 0.22, z))     # shaft over the tucked trousers
        clr += 0.005 * smoothstep(0.34, BOOT_TOP, z)
        row = []
        for i in range(BNU):
            a = 2 * math.pi * i / BNU; d = Vector((math.sin(a), -math.cos(a), 0))
            r = R[i] + clr
            ca = math.cos(a)
            if z < 0.062:                                         # soft rounded toe box
                r += 0.008 * max(0.0, ca) ** 3 * (1 - z / 0.062)
            if 0.066 < z < 0.19:                                  # creases at the ankle / instep
                w = (0.55 + 0.45 * max(0.0, ca)) * smoothstep(0.066, 0.09, z) * (1 - smoothstep(0.15, 0.19, z))
                r += 0.0016 * w * math.sin(z * 2 * math.pi / 0.0175 + 1.3 * math.sin(3 * a + 0.5))
            p = c + d * r
            p.z = z + heel_lift(p.y) * (1 - smoothstep(0.0, 0.11, z))
            row.append(p)
        G.append(row)
    ja = min(range(len(G)), key=lambda j: abs(G[j][0].z - 0.17)); jt = len(G) - 1
    ca_, ct_ = sum(G[ja], Vector()) / BNU, sum(G[jt], Vector()) / BNU
    for j in range(ja + 1, jt):
        t = (G[j][0].z - G[ja][0].z) / (G[jt][0].z - G[ja][0].z)
        cj = sum(G[j], Vector()) / BNU
        for i in range(BNU):
            ra = (G[ja][i] - ca_).length; rt = (G[jt][i] - ct_).length
            d = Vector((G[j][i].x - cj.x, G[j][i].y - cj.y, 0)).normalized()
            rl = ra + (rt - ra) * t
            rj = Vector((G[j][i].x - cj.x, G[j][i].y - cj.y, 0)).length
            if rl > rj:
                G[j][i] = Vector((cj.x, cj.y, G[j][i].z)) + d * rl
    gfit.smooth_grid(G, 1, closed_u=True, fix_rows=(0, len(G) - 1), fac=0.25)
    # nothing of the foot may show through between rings (toes, heel): push out of the leg with 4 mm
    for j in range(len(G)):
        if G[j][0].z < 0.12:
            G[j] = [FIT.conform(p, ('legL',), 0.0045 + 0.003 * (1 - smoothstep(0.02, 0.06, G[j][0].z))) for p in G[j]]
    return G

def build_boots():
    mb = MB(); sm = MB(); hb = MB(); tr = MB()
    G = _boot_grid()
    tcen = sum(G[-1], Vector()) / BNU
    lip = [G[-1][i] - Vector((G[-1][i].x - tcen.x, G[-1][i].y - tcen.y, 0)).normalized() * 0.0045 + Vector((0, 0, -0.006)) for i in range(BNU)]
    shell(mb, G + [lip], 0.0, out_fn=boot_out, closed_u=True, back=False, walls=False)
    # layered sole (outsole + midsole step) following the foot outline; flat on the ground, raised under the arch
    base = G[0]
    cen = sum(base, Vector()) / BNU
    def sring(dz, g):
        out = []
        for p in base:
            d = Vector((p.x - cen.x, p.y - cen.y, 0)).normalized()
            q = p + d * g
            q.z = SOLE_Z + dz + heel_lift(q.y)
            out.append(q)
        return out
    rows = [(0.0, 0.0030), (0.0016, 0.0050), (0.0072, 0.0050), (0.0080, 0.0038), (0.0090, 0.0056), (0.0142, 0.0056), (0.0160, 0.0020)]
    S = [sring(dz, g) for dz, g in rows]
    capb = [[S[0][i].lerp(Vector((cen.x, cen.y, S[0][i].z)), f) for i in range(BNU)] for f in (0.75, 0.45)]
    capt = [[S[-1][i].lerp(Vector((cen.x, cen.y, S[-1][i].z)), f) for i in range(BNU)] for f in (0.45, 0.75)]
    shell(sm, capb[::-1] + S + capt, 0.0, out_fn=lambda p: Vector((p.x - cen.x, p.y - cen.y, (p.z - SOLE_Z - heel_lift(p.y) - 0.008) * 6)),
          closed_u=True, back=False, walls=False)
    # stacked heel block under the heel seat (2.5 cm from the ground to the heel seat)
    yh = -0.030
    def hring(z, g):
        R = sring(0.0, g)
        ids = [i for i in range(BNU) if R[i].y > yh]          # contiguous arc around the back (index 0 = toe)
        arc = [R[i] for i in ids]
        a0, a1 = arc[-1], arc[0]
        line = [a0.lerp(a1, k / 8) for k in range(1, 8)]      # straight breast of the heel
        poly = resample(arc + line, count=BNU, closed=True)[0]
        return [Vector((q.x, q.y, z)) for q in poly]
    H = [hring(SOLE_Z, 0.0018), hring(SOLE_Z + 0.0015, 0.0034)] + [hring(SOLE_Z + 0.0015 + 0.0205 * k / 4, 0.0034 - 0.0004 * k / 4) for k in range(1, 5)]
    hc = sum(H[0], Vector()) / BNU
    hcb = [[H[0][i].lerp(Vector((hc.x, hc.y, H[0][i].z)), f) for i in range(BNU)] for f in (0.75, 0.45)]
    hct = [[H[-1][i].lerp(Vector((hc.x, hc.y, H[-1][i].z)), f) for i in range(BNU)] for f in (0.45, 0.75)]
    shell(hb, hcb[::-1] + H + hct, 0.0, out_fn=lambda p: Vector((p.x - hc.x, p.y - hc.y, (p.z - SOLE_Z - 0.011) * 6)), closed_u=True, back=False, walls=False)
    # stitched welt strip at the sole / upper join
    welt = resample(sring(0.0168, 0.0028), step=0.006, closed=True)[0]
    sweep(tr, welt, [Vector((0, 0, 1))] * len(welt), rect_profile(0.007, 0.0022, 0.0006), closed=True, uv_v=TRIM['strap'], u_scale=TRIM_U)
    from mathutils.bvhtree import BVHTree
    flatG = [p for row in G for p in row]
    upper_bvh = BVHTree.FromPolygons(flatG, [(j * BNU + i, j * BNU + (i + 1) % BNU, (j + 1) * BNU + (i + 1) % BNU, (j + 1) * BNU + i)
                                            for j in range(len(G) - 1) for i in range(BNU)])
    def onto_upper(pts, lift):
        out, ups = [], []
        for p in pts:
            loc, n, _, _ = upper_bvh.find_nearest(p)
            n = n.normalized()
            if n.dot(boot_out(loc)) < 0: n = -n
            out.append(loc + n * lift); ups.append(n)
        return out, ups
    def column(a, z0, z1, n=30):
        i0 = int(round(a / (2 * math.pi) * BNU)) % BNU
        pts = [row[i0] for row in G if z0 <= row[i0].z <= z1]
        pts = smooth_pts(resample(smooth_pts(pts, 3), count=n)[0], 3)
        return onto_upper(pts, 0.0004)
    for a in (math.pi / 2, 3 * math.pi / 2):                 # stitched side seams
        pts, ups = column(a, 0.05, BOOT_TOP - 0.004)
        strap(tr, pts, ups, w=0.0065, t=0.0011, key='strap', bevel=0.0003)
    pts, ups = column(math.pi, 0.03, BOOT_TOP - 0.004)       # back seam
    strap(tr, pts, ups, w=0.0075, t=0.0012, key='strap', bevel=0.0003)
    # top binding: leather folded over the shaft edge
    top = resample(G[-1], step=0.006, closed=True)[0]
    sweep(tr, [p + Vector((0, 0, -0.0005)) for p in top], [Vector((0, 0, 1))] * len(top),
          [(-0.0040, -0.0115), (0.0030, -0.0115), (0.0034, 0.0), (0.0, 0.0028), (-0.0058, 0.0), (-0.0062, -0.0115), (-0.0040, -0.0115)],
          closed=True, uv_v=TRIM['edge'], u_scale=TRIM_U)
    build_pair(mb, 'GUL_Boot', [M_ARM], 'foot_l', 'Legs')
    build_pair(sm, 'GUL_Boot_Sole', [M_ARM], 'foot_l', 'Legs')
    build_pair(hb, 'GUL_Boot_Heel', [M_ARM], 'foot_l', 'Legs')
    build_pair(tr, 'GUL_Boot_Trim', [M_TRIM], 'calf_l', 'Legs')

exec(open(os.path.join(HERE, "pieces_head.py"), encoding="utf-8").read())
exec(open(os.path.join(HERE, "pieces_gear.py"), encoding="utf-8").read())

# =========================================================== run
neck = None
if want('tunic'): neck = build_tunic_torso()
if want('collar'): build_collar(neck or [Vector((0, 0.0, 1.455))] * 4)
if want('skirt'): build_skirt()
if want('trousers'): build_trousers()
if want('sleeves'): build_sleeves()
if want('cuirass'): build_cuirass()
if want('belt'): build_belt()
if want('tassets'): build_tassets()
if want('pauldrons'): build_pauldrons()
if want('bracers'): build_bracers()
if want('boots'): build_boots()
if want('scarf'): build_scarf()
if want('band'): build_headband()
if want('amulet'): build_amulet()
if want('sabre'): build_sabre_and_scabbard()
