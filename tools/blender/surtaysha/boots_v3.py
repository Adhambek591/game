# =========================================================== steppe riding boots + shin plates (fitted to the body's foot)
BOOT_TOP = 0.470
BOOT_N = 48
BOOT_Z = [0.000, 0.007, 0.015, 0.024, 0.034, 0.045, 0.057, 0.069, 0.081, 0.094, 0.107, 0.121, 0.136, 0.152, 0.170,
          0.190, 0.212, 0.236, 0.262, 0.290, 0.320, 0.350, 0.380, 0.410, 0.440, BOOT_TOP]

def _hull(pts):
    pts = sorted(set((round(p[0], 5), round(p[1], 5)) for p in pts))
    if len(pts) < 3: return pts
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]          # counter-clockwise (seen from +Z): front(-y) -> +x -> back -> -x

def _offset(poly, c):
    n = len(poly); out = []
    for i in range(n):
        a, b, d = Vector(poly[i - 1]), Vector(poly[i]), Vector(poly[(i + 1) % n])
        e1 = (b - a).normalized(); e2 = (d - b).normalized()
        n1 = Vector((e1.y, -e1.x)); n2 = Vector((e2.y, -e2.x))
        nn = (n1 + n2); nn = nn.normalized() if nn.length > 1e-9 else n1
        out.append(b + nn * c / max(0.5, nn.dot(n1)))
    return out

def _resample_front(poly, N):
    P = [Vector(p) for p in poly]
    k0 = min(range(len(P)), key=lambda i: P[i].y)
    P = P[k0:] + P[:k0]
    R, _ = resample(P, count=N, closed=True)
    return R

def _ellipse_ring(cx, cy, hx, hy, N, n=2.3):
    out = []
    for i in range(N):
        a = 2 * math.pi * i / N
        s, c = math.sin(a), math.cos(a)
        out.append(Vector((cx + hx * math.copysign(abs(s) ** (2 / n), s), cy - hy * math.copysign(abs(c) ** (2 / n), c))))
    return out

def _boot_rings():
    V = [p for p in FIT.V if p.x > 0.02 and p.z < BOOT_TOP + 0.03]
    rings = []
    for z in BOOT_Z:
        band = 0.004 if z > 0.0 else 0.006
        sl = [(p.x, p.y) for p in V if abs(p.z - max(z, 0.003)) < band]
        hull = _hull(sl)
        cl = 0.0075 + 0.0045 * smoothstep(0.10, 0.22, z)
        hr = _resample_front(_offset(hull, cl), BOOT_N)
        xs = [p[0] for p in sl]; ys = [p[1] for p in sl]
        er = _ellipse_ring((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2 + 0.003, (max(xs) - min(xs)) / 2 + 0.012,
                           (max(ys) - min(ys)) / 2 + 0.013, BOOT_N)
        w = smoothstep(0.17, 0.25, z)
        rings.append([h.lerp(e, w) for h, e in zip(hr, er)])
    # smooth across heights (keeps the shaft stiff, keeps the heel / instep / ankle shape)
    for _ in range(2):
        nr = [r[:] for r in rings]
        for j in range(2, len(rings) - 1):
            for i in range(BOOT_N):
                nr[j][i] = (rings[j - 1][i] + rings[j][i] * 2 + rings[j + 1][i]) / 4
        rings = nr
    # pointed toe: stretch the front of the low rings forward and pull it toward the toe line
    yF = min(p.y for p in rings[0]); xt = min(rings[0], key=lambda p: p.y).x
    for j, z in enumerate(BOOT_Z):
        if z > 0.08: break
        f = 1 - z / 0.08
        for i, p in enumerate(rings[j]):
            s = smoothstep(yF + 0.065, yF, p.y)
            rings[j][i] = Vector((xt + (p.x - xt) * (1 - 0.30 * s * f), p.y - 0.022 * s * f))
    return rings

BOOT_RINGS = _boot_rings()
BOOT_TIP_Y = min(p.y for p in BOOT_RINGS[0])
BOOT_HEEL_Y = max(p.y for p in BOOT_RINGS[0])

def toe_spring(y, z):
    """upturned toe: lift of the sole/upper near the tip"""
    return 0.011 * smoothstep(BOOT_TIP_Y + 0.07, BOOT_TIP_Y, y) * max(0.0, 1 - z / 0.07)

def _ring_at(z):
    zs = BOOT_Z
    if z <= zs[0]: return BOOT_RINGS[0], zs[0]
    if z >= zs[-1]: return BOOT_RINGS[-1], zs[-1]
    for j in range(len(zs) - 1):
        if zs[j] <= z <= zs[j + 1]:
            t = (z - zs[j]) / (zs[j + 1] - zs[j])
            return [a.lerp(b, t) for a, b in zip(BOOT_RINGS[j], BOOT_RINGS[j + 1])], z

def boot_ring(z, a, grow=0.0):
    """point on the boot surface at height z, angle a (0 = toe/front, +pi/2 = outer side of the left boot)"""
    ring, _ = _ring_at(z)
    f = (a % (2 * math.pi)) / (2 * math.pi) * BOOT_N
    i0 = int(f) % BOOT_N; i1 = (i0 + 1) % BOOT_N; t = f - int(f)
    p = ring[i0].lerp(ring[i1], t)
    if grow:
        tg = (ring[i1] - ring[i0]); nrm = Vector((tg.y, -tg.x)).normalized()
        p = p + nrm * grow
    q = Vector((p.x, p.y, z))
    q.z += toe_spring(q.y, z)
    return q

def boot_center(z):
    ring, _ = _ring_at(z)
    return sum(ring, Vector((0, 0))) / len(ring)

def boot_xc(z):
    return boot_center(z).x

def boot_out(p):
    c = boot_center(max(p.z, 0.0))
    return Vector((p.x - c.x, p.y - c.y, 0.0))

def build_boots():
    up = MB(); sm = MB(); gm = MB(); tr = MB()
    N = BOOT_N
    # ---- upper: rings from the foot hull up to the cuff, plus an inner turn-in at the top
    G = [[boot_ring(z, 2 * math.pi * i / N) for i in range(N)] for z in BOOT_Z]
    G.append([boot_ring(BOOT_TOP - 0.006, 2 * math.pi * i / N, grow=-0.007) for i in range(N)])
    shell(up, G, 0.0, out_fn=boot_out, closed_u=True, back=False, walls=False)
    # ---- layered sole (two leather lifts) proud of the upper, stacked heel block under the heel
    def srow(z, g):
        return [boot_ring(0.0, 2 * math.pi * i / N, grow=g) + Vector((0, 0, z)) for i in range(N)]
    rows = [srow(0.0015, 0.0030), srow(-0.0010, 0.0055), srow(-0.0080, 0.0055), srow(-0.0092, 0.0040),
            srow(-0.0104, 0.0055), srow(-0.0175, 0.0055), srow(-0.0190, 0.0035)]
    cen = boot_center(0.0)
    cen3 = Vector((cen.x, cen.y, -0.019))
    cap = [[p.lerp(cen3 + Vector((0, 0, toe_spring(p.y, 0.0))), f) for p in rows[-1]] for f in (0.55, 0.85)]
    for c in cap:
        for p in c: p.z = -0.019 + toe_spring(p.y, 0.0)
    shell(sm, rows + cap, 0.0, out_fn=lambda p: boot_out(p) + Vector((0, 0, (p.z + 0.009) * 6)), closed_u=True, back=False, walls=False)
    # heel: stacked block (three lifts) under the back 30 % of the sole
    yh = BOOT_HEEL_Y - 0.075
    heel_ring = [p for p in srow(0.0, 0.0040) if p.y > yh]
    heel_ring.sort(key=lambda p: math.atan2(p.x - cen.x, -(p.y - cen.y)) % (2 * math.pi))
    xl = min(p.x for p in heel_ring); xr = max(p.x for p in heel_ring)
    front = [Vector((xr + (xl - xr) * k / 6, yh, 0.0)) for k in range(7)]
    hpoly = heel_ring + front
    hpoly, _ = resample(hpoly, count=36, closed=True)
    hc = sum(hpoly, Vector()) / len(hpoly)
    H = []
    for z, s in ((-0.017, 1.0), (-0.0185, 1.02), (-0.026, 1.02), (-0.027, 0.995), (-0.0345, 0.99), (-0.036, 0.965)):
        H.append([Vector((hc.x + (p.x - hc.x) * s, hc.y + (p.y - hc.y) * s, z)) for p in hpoly])
    H.append([Vector((hc.x + (p.x - hc.x) * 0.5, hc.y + (p.y - hc.y) * 0.5, -0.036)) for p in hpoly])
    shell(sm, H, 0.0, out_fn=lambda p: Vector((p.x - hc.x, p.y - hc.y, -0.5 if p.z < -0.0355 else 0.0)), closed_u=True, back=False, walls=False)
    # ---- welt with stitching where the upper meets the sole
    welt = [boot_ring(0.004, 2 * math.pi * k / 96, grow=0.0022) for k in range(96)]
    wu = [(boot_out(p).normalized() + Vector((0, 0, 0.7))).normalized() for p in welt]
    sweep(tr, welt, wu, [(math.cos(2 * math.pi * q / 6) * 0.0021, math.sin(2 * math.pi * q / 6) * 0.0019) for q in range(7)],
          closed=True, uv_v=TRIM['cord'], u_scale=TRIM_U * 2)
    # ---- vertical side seams (outer, inner) and back seam, stitched leather welts
    for a in (math.pi / 2 + 0.10, 3 * math.pi / 2 - 0.10, math.pi):
        seam = [boot_ring(z, a, grow=0.0007) for z in [0.012 + (BOOT_TOP - 0.03) * k / 22 for k in range(23)]]
        strap(tr, seam, [boot_out(p).normalized() for p in seam], w=0.008, t=0.0013, key='strap', bevel=0.0004)
    # ---- toe-cap seam across the vamp
    toe = []
    for k in range(29):
        a = -1.30 + 2.60 * k / 28
        z = 0.030 + 0.020 * math.cos(a * 1.1)
        toe.append(boot_ring(z, a, grow=0.0007))
    strap(tr, toe, [(boot_out(p).normalized() + Vector((0, 0, 0.6))).normalized() for p in toe], w=0.006, t=0.0011, key='strap', bevel=0.0004)
    # ---- top binding + cuff band
    cuff = [boot_ring(BOOT_TOP - 0.018, 2 * math.pi * k / 64, grow=0.0012) for k in range(64)]
    strap(tr, cuff, [boot_out(p).normalized() for p in cuff], w=0.030, t=0.0022, key='strap', closed=True)
    rim = [boot_ring(BOOT_TOP - 0.002, 2 * math.pi * k / 64, grow=-0.0025) for k in range(64)]
    sweep(tr, rim, [(boot_out(p).normalized() + Vector((0, 0, 0.8))).normalized() for p in rim],
          [(math.cos(2 * math.pi * q / 8) * 0.0040, math.sin(2 * math.pi * q / 8) * 0.0034) for q in range(9)], closed=True, uv_v=TRIM['strap'], u_scale=TRIM_U)
    # ---- shin plate (greave): front plate only, strapped over the shaft, from the instep to below the knee
    span = math.radians(72)
    gz = [0.150 + (0.425 - 0.150) * j / 13 for j in range(14)]
    def gr(z): return 0.0045 + 0.010 * smoothstep(0.20, 0.15, z)
    Gg = [[boot_ring(z, (-span + 2 * span * i / 16), grow=gr(z)) for i in range(17)] for z in gz]
    for row in Gg:
        for i, p in enumerate(row):
            p += boot_out(p).normalized() * (0.007 * (1 - abs(i - 8) / 8) ** 4 + 0.0015 * (1 - abs(i - 8) / 8))
    shell(gm, Gg, 0.003, out_fn=boot_out)
    # rolled edges all round the plate
    bord = [Gg[0][i] for i in range(17)] + [Gg[j][16] for j in range(1, 14)] + [Gg[13][i] for i in range(15, -1, -1)] + [Gg[j][0] for j in range(12, 0, -1)]
    bord, _ = resample(bord, step=0.008, closed=True); bord = smooth_pts(bord, 2, closed=True)
    sweep(gm, bord, [boot_out(p).normalized() for p in bord],
          [(math.cos(2 * math.pi * q / 8) * 0.0030, math.sin(2 * math.pi * q / 8) * 0.0030 - 0.0008) for q in range(9)], closed=True, uv_v=(0.0, 0.02), u_scale=1.0)
    # two straps around the shaft holding the plate, buckles on the outer-front, rivets through the plate
    for z in (0.205, 0.375):
        K = 48
        arc = []
        for k in range(K + 1):
            a = 2 * math.pi * k / K
            on_plate = a < span or a > 2 * math.pi - span
            arc.append(boot_ring(z, a, grow=(gr(z) + 0.0045) if on_plate else 0.0030))
        strap(tr, arc, [boot_out(p).normalized() for p in arc], w=0.024, t=0.0035)
        ab = span + 0.30
        pb = boot_ring(z, ab, grow=0.0068)
        tang = (boot_ring(z, ab + 0.05) - boot_ring(z, ab - 0.05)).normalized()
        buckle(tr, pb, boot_out(pb), tang, w=0.024, h=0.026)
        tail = [boot_ring(z, ab - 0.03 - 0.30 * k / 8, grow=(gr(z) + 0.0085) if (ab - 0.03 - 0.30 * k / 8) < span else 0.0062) for k in range(9)]
        strap(tr, tail, [boot_out(p).normalized() for p in tail], w=0.019, t=0.003)
        for a in (span - 0.12, -(span - 0.12)):
            p = boot_ring(z, a, grow=gr(z) + 0.0082); rivet(tr, p, boot_out(p).normalized(), r=0.0042, uvc=(0.5, 0.86), uvr=0.011)
    build_pair(up, 'SUR_Boot', [M_ARM], 'foot_l', 'Legs')
    build_pair(sm, 'SUR_Boot_Sole', [M_ARM], 'foot_l', 'Legs')
    build_pair(gm, 'SUR_Greave', [M_ARM], 'calf_l', 'Legs')
    build_pair(tr, 'SUR_Greave_Straps', [M_TRIM], 'calf_l', 'Legs')

