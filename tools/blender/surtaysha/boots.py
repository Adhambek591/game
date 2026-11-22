# Executed inside the build.py / pieces.py namespace.
# Surtaysha's riding boots, built from the reference silhouettes (boot_ref/: masks -> boot_profile.npz -> boot_hull.Hull).
# One two-tone leather boot per leg, NO armour: brown boot (foot, heel, back of the shaft), grey leather front panel on
# the shaft with a raised border and a centre rib, two brown straps round the back with a small buckle on the outer side,
# welted sole with a low heel. Pieces: SUR_Boot (brown upper), SUR_Boot_Sole, SUR_Boot_Shaft (grey panel),
# SUR_Boot_Straps (straps, buckles, studs, seams, welt; trim sheet).
import sys as _sys, importlib as _il
_sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else r"F:\qirq-qiz\tools\blender\surtaysha", 'boot_ref'))
import numpy as _np
import boot_hull; _il.reload(boot_hull)

BOOT_TOP = 0.450
HULL = boot_hull.Hull()
_lg = [FIT.leg_at(0.26 + 0.02 * k) for k in range(8)]
BOOT_O = (sum(c[0] for c in _lg) / len(_lg), sum((c[2] + c[3]) / 2 for c in _lg) / len(_lg))   # shaft axis = leg centre at mid shaft
print('BOOT origin', BOOT_O, 'toe-out %.1f deg' % math.degrees(HULL.theta))

def BW(p):
    """hull local -> world"""
    return Vector(HULL.to_world(p, BOOT_O).tolist())
def BWn(n):
    st, ct = math.sin(HULL.theta), math.cos(HULL.theta)
    return Vector((n[0] * ct - n[1] * st, n[0] * st + n[1] * ct, n[2]))

BOOT_RINGS = HULL.upper_rings(N=40)
_SPINE = [BW(r.mean(axis=0)) for r in BOOT_RINGS]
def boot_out(p):
    """outward direction at a world point near the boot (away from the nearest point of the boot's spine)"""
    c = min(_SPINE, key=lambda q: (q - p).length_squared)
    return p - c

# the low-poly upper itself (the panel and straps are laid on the mesh, not on the ideal surface, so nothing pokes through)
from mathutils.bvhtree import BVHTree as _BVH
_Rw = [[BW(p) for p in ring] for ring in BOOT_RINGS]
_bv = [p for ring in _Rw for p in ring]; _n = len(_Rw[0])
_bf = [(j * _n + i, j * _n + (i + 1) % _n, (j + 1) * _n + (i + 1) % _n, (j + 1) * _n + i) for j in range(len(_Rw) - 1) for i in range(_n)]
BOOT_BVH = _BVH.FromPolygons(_bv, _bf)
def snap(p, n):
    """world point p (near the boot, outward normal n) -> the point of the upper mesh under it"""
    hit = BOOT_BVH.ray_cast(p + n * 0.03, -n, 0.07)
    return hit[0] if hit[0] is not None else p

def _weld(ob, dist=2e-5):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(ob.data); bm.free(); ob.data.update()

# ---- reference landmarks (side view of the turnaround sheet, pixels -> local y, z)
_px = HULL.side_px
PZ_TOP = _px(0, 617.0)[1]                 # top edge of the grey panel
PZ_SIDE = _px(0, 713.0)[1]                # bottom of the side flaps
PZ_FRONT = _px(0, 699.4)[1]               # bottom of the panel on the front centre line (on the instep)
PY_EDGE = _px(918.3, 0)[0]                # back edge of the panel on the side of the shaft
PY_KINK = _px(890.0, 0)[0]                # where the bottom edge starts to climb toward the instep
P_RC = 0.022                              # radius of the lower back corners
P_LIFT, P_THICK = 0.0024, 0.0030          # panel sits on the boot leather
STRAP_Z = (_px(0, 636.5)[1] + 0.008, _px(0, 681.0)[1] + 0.011)   # between the side view and the (slightly higher) front view

def _front_y(z):
    if z >= HULL.P[1]:
        s = HULL.sec_shaft(round(z, 4)); return s['O'][0] + s['c0'] + 0.0004
    c = HULL.chord((HULL.fy0 * HULL.ky, z), (1.0, 0.0))
    return HULL.fy0 * HULL.ky + c[0] + 0.0004

def panel_local(u, v):
    """point of the boot surface under the grey panel. u -1..1 round the front (0 = front centre line, +1 = outer back
    edge), v 0..1 top -> bottom edge (side flaps reach lower than the middle over the instep)"""
    zE = PZ_TOP + (PZ_SIDE - PZ_TOP) * v; zF = PZ_TOP + (PZ_FRONT - PZ_TOP) * v
    yF = _front_y(zF)
    hgt = PZ_TOP - PZ_SIDE
    t = min(1.0, max(0.0, (v - (1 - P_RC / hgt)) / (P_RC / hgt)))
    yE = PY_EDGE - P_RC * (1 - math.sqrt(max(0.0, 1 - t * t)))
    b = -yF
    gE = math.acos(max(-1.0, min(1.0, -yE / b)))
    y = -b * math.cos(abs(u) * gE)
    z = zE + (zF - zE) * smoothstep(0.0, 1.0, (PY_KINK - y) / (PY_KINK - yF))
    cx, W = HULL.half_width(y, z)
    return _np.array((cx + math.copysign(W, u), y, z))

def panel_frame(u, v, e=0.01):
    p = BW(panel_local(u, v))
    du = BW(panel_local(min(1, u + e), v)) - BW(panel_local(max(-1, u - e), v))
    dv = BW(panel_local(u, min(1, v + e))) - BW(panel_local(u, max(0, v - e)))
    n = du.cross(dv)
    if n.length < 1e-10: n = boot_out(p)
    n.normalize()
    if n.dot(boot_out(p)) < 0: n = -n
    return snap(p, n), n

def shaft_pt(z, a, lift=0.0):
    """shaft surface at height z, angle a (0 = front, pi/2 = outer side, pi = back) + lift along the normal"""
    s = HULL.sec_shaft(round(z, 4))
    o = _np.array((s['cx'], s['O'][0] + (s['c0'] + s['c1']) / 2, z))
    d = _np.array((math.sin(a), -math.cos(a), 0.0))
    p = HULL.ray(o, d, 0.0, 0.3, 0.002)
    n = BWn(HULL.normal(p).tolist()).normalized()
    return snap(BW(p), n) + n * lift, n, p

def build_boots():
    up = MB(); sm = MB(); gm = MB(); tr = MB()
    # ------------------------------------------------ brown upper: hull rings (all quads, ankle loops) + toe cap
    R = [[BW(p) for p in ring] for ring in BOOT_RINGS]
    c0 = sum(R[0], Vector()) / len(R[0])
    rim = [p + (c0 - p).normalized() * 0.008 + Vector((0, 0, -0.008)) for p in R[0]]      # turn-in of the cuff
    shell(up, [rim] + R, 0.0, out_fn=boot_out, closed_u=True, back=False, walls=False)
    cap = [[BW(p) for p in row] for row in HULL.toe_cap(BOOT_RINGS[-1])]
    fwd = BWn((0, -1, 0))
    shell(up, cap, 0.0, out_fn=lambda p: fwd, back=False, walls=False, uv_off=(1.2, 0.0))
    # ------------------------------------------------ sole: welt band + outsole following the side-view underside
    fp = HULL.footprint()
    NS = 64
    P2 = [Vector((x, y, 0)) for x, y in fp]
    P2 = smooth_pts(P2, 2, closed=True)
    k0 = max(range(len(P2)), key=lambda i: P2[i].y)                 # start at the back of the heel
    P2, _ = resample(P2[k0:] + P2[:k0], count=NS, closed=True)
    cen = sum(P2, Vector()) / NS
    def outn(i):
        t = (P2[(i + 1) % NS] - P2[i - 1]).normalized(); n = Vector((t.y, -t.x, 0))
        return n if n.dot(P2[i] - cen) > 0 else -n
    WELT = 0.0060
    def srow(grow, zf):
        row = []
        for i in range(NS):
            q = P2[i] + outn(i) * (WELT + grow)
            q.y = min(max(q.y, HULL.y_toe_sole + 0.0005 - grow), HULL.y_heel_sole - 0.0005 + grow)     # never past the reference sole
            zt = float(HULL.z_feather(q.y)); zb = HULL.z_bottom(q.y)
            row.append(BW((q.x, q.y, zf(zt, zb))))
        return row
    rows = [srow(-0.022, lambda t, b: t + 0.0005), srow(-0.0012, lambda t, b: t + 0.0004), srow(0.0, lambda t, b: t - 0.0014),
            srow(0.0, lambda t, b: t - 0.40 * (t - b)), srow(-0.0022, lambda t, b: t - 0.44 * (t - b)), srow(-0.0022, lambda t, b: t - 0.48 * (t - b)),
            srow(0.0006, lambda t, b: t - 0.52 * (t - b)), srow(0.0006, lambda t, b: b + 0.0030), srow(-0.0022, lambda t, b: b)]
    scen = BW((cen.x, cen.y, 0.0))
    shell(sm, rows, 0.0, out_fn=lambda p: Vector((p.x - scen.x, p.y - scen.y, (p.z + 0.02) * 2)), closed_u=True, back=False, walls=False)
    last_local = [(P2[i] + outn(i) * (WELT - 0.0022)) for i in range(NS)]
    bot = HULL.coons([(q.x, q.y, 0.0) for q in last_local])
    botw = [[BW((p[0], p[1], HULL.z_bottom(p[1]))) for p in row] for row in bot]
    # the rim of the patch must be exactly the last wall row (same points, welded afterwards)
    q = NS // 4; o = q // 2
    idx = lambda i: rows[-1][(i + o) % NS]
    for k in range(q + 1):
        botw[0][k] = idx(-k); botw[q][k] = idx(q + k); botw[k][0] = idx(k); botw[k][q] = idx(NS - q - k)
    shell(sm, botw, 0.0, out_fn=lambda p: Vector((0, 0, -1)), back=False, walls=False, uv_off=(1.2, 0.0))
    # ------------------------------------------------ grey leather panel on the front of the shaft
    NU, NV = 11, 24
    G0 = [[None] * (2 * NU + 1) for _ in range(NV + 1)]; GN = [[None] * (2 * NU + 1) for _ in range(NV + 1)]
    for j in range(NV + 1):
        for i in range(2 * NU + 1):
            G0[j][i], GN[j][i] = panel_frame((i - NU) / NU, j / NV)
    Gp = [[G0[j][i] + GN[j][i] * (P_LIFT + P_THICK) for i in range(2 * NU + 1)] for j in range(NV + 1)]
    shell(gm, Gp, P_THICK, out_fn=boot_out)
    # raised border band all round the panel
    du, dv = 0.050, 0.026
    path = [(u, dv) for u in _np.linspace(-(1 - du), 1 - du, 25)] + [(1 - du, v) for v in _np.linspace(dv, 1 - dv, 25)[1:]] + \
           [(u, 1 - dv) for u in _np.linspace(1 - du, -(1 - du), 33)[1:]] + [(-(1 - du), v) for v in _np.linspace(1 - dv, dv, 25)[1:-1]]
    fr = [panel_frame(u, v) for u, v in path]
    bp = [p + n * (P_LIFT + P_THICK + 0.0004) for p, n in fr]
    bp, _ = resample(bp, step=0.010, closed=True); bp = smooth_pts(bp, 2, closed=True)
    sweep(gm, bp, [boot_out(p).normalized() for p in bp], rect_profile(0.0135, 0.0024, 0.0009), closed=True, uv_v=(0.0, 0.03), u_scale=1.0)
    # centre rib down the shin
    rib = [panel_frame(0.0, v) for v in _np.linspace(dv * 1.3, 1 - dv * 1.3, 22)]
    ribp = smooth_pts([p + n * (P_LIFT + P_THICK + 0.0003) for p, n in rib], 6)       # a straight clean rib, not the low-poly facets under it
    sweep(gm, ribp, [n for p, n in rib], rect_profile(0.013, 0.0022, 0.0009), uv_v=(0.0, 0.03), u_scale=1.0)
    # studs in the lower corners of the side flaps
    for u in (0.80, -0.80):
        p, n = panel_frame(u, 0.925)
        rivet(tr, p + n * (P_LIFT + P_THICK + 0.0006), n, r=0.0045, uvc=(0.5, 0.86), uvr=0.011)
    # ------------------------------------------------ two straps round the back, tab ends on the panel, buckle outside
    a_tab = math.radians(64)
    for z in STRAP_Z:
        K = 56; pts = []; ups = []
        for k in range(K + 1):
            a = a_tab + (2 * math.pi - 2 * a_tab) * k / K
            p0, n, pl = shaft_pt(z, a)
            on = smoothstep(PY_EDGE + 0.012, PY_EDGE - 0.004, pl[1])        # over the panel (and its border band)
            pts.append(p0 + n * (0.0020 + on * (P_LIFT + P_THICK + 0.0026))); ups.append(n)
        strap(tr, pts, ups, w=0.026, t=0.0034)
        for e, sgn in ((2, 1), (K - 2, -1)):                                 # round stud at each tab end
            rivet(tr, pts[e] + ups[e] * 0.0022, ups[e], r=0.0062, h=0.0030, uvc=(0.5, 0.86), uvr=0.011, seg=8)
        ab = math.radians(118)
        pb, nb, _ = shaft_pt(z, ab, 0.0020 + 0.0036)
        tang = (shaft_pt(z, ab + 0.05)[0] - shaft_pt(z, ab - 0.05)[0]).normalized()
        buckle(tr, pb, nb, tang, w=0.026, h=0.034)
    # ------------------------------------------------ seams, welt, cuff binding (stitched leather, trim sheet)
    def _wp(i):
        q = P2[i] + outn(i) * 0.0030
        q.y = min(max(q.y, HULL.y_toe_sole + 0.0040), HULL.y_heel_sole - 0.0040)        # stays on the sole's top edge at toe and heel
        return BW((q.x, q.y, float(HULL.z_feather(q.y)) + 0.0030))
    welt = [_wp(i) for i in range(NS)]
    welt, _ = resample(welt, count=110, closed=True)
    sweep(tr, welt, [(boot_out(p).normalized() + Vector((0, 0, 0.8))).normalized() for p in welt],
          [(math.cos(2 * math.pi * q_ / 6) * 0.0024, math.sin(2 * math.pi * q_ / 6) * 0.0021) for q_ in range(7)], closed=True, uv_v=TRIM['cord'], u_scale=TRIM_U * 2)
    # back seam from the cuff to the heel
    nb_ = 14 + 6
    seam = [R[j][0] for j in range(1, nb_)]
    seam, _ = resample(seam, step=0.012)
    strap(tr, [p + boot_out(p).normalized() * 0.0008 for p in seam], [boot_out(p).normalized() for p in seam], w=0.009, t=0.0014, key='strap', bevel=0.0004)
    # heel counter seam: arc from the back seam down and forward to the welt, both sides
    arc = [(945.0, 704.5), (939, 706), (932, 710), (925.5, 716.5), (920.5, 723.0), (918.5, 727.5)]
    side_pts = []
    for sgn in (1, -1):
        row = []
        for x, y in arc:
            yl, zl = _px(x, y)
            cx, W = HULL.half_width(yl - 0.0015, zl)
            row.append(BW((cx + sgn * W, yl - 0.0015, zl)))
        side_pts.append(row)
    hc = side_pts[0][::-1] + side_pts[1][1:]
    hc, _ = resample(hc, step=0.008); hc = smooth_pts(hc, 2)
    strap(tr, [p + boot_out(p).normalized() * 0.0008 for p in hc], [boot_out(p).normalized() for p in hc], w=0.006, t=0.0012, key='strap', bevel=0.0004)
    # cuff binding round the top
    rimp, _ = resample([p + (c0 - p).normalized() * 0.0015 + Vector((0, 0, 0.0005)) for p in R[0]], count=64, closed=True)
    sweep(tr, rimp, [(boot_out(p).normalized() + Vector((0, 0, 0.8))).normalized() for p in rimp],
          [(math.cos(2 * math.pi * q_ / 8) * 0.0042, math.sin(2 * math.pi * q_ / 8) * 0.0036) for q_ in range(9)], closed=True, uv_v=TRIM['strap'], u_scale=TRIM_U)
    for mb_, name, mats_, bn in ((up, 'SUR_Boot', [M_ARM], 'foot_l'), (sm, 'SUR_Boot_Sole', [M_ARM], 'foot_l'),
                                 (gm, 'SUR_Boot_Shaft', [M_ARM], 'calf_l'), (tr, 'SUR_Boot_Straps', [M_TRIM], 'calf_l')):
        obL, obR = build_pair(mb_, name, mats_, bn, 'Legs')
        if name in ('SUR_Boot', 'SUR_Boot_Sole'):
            _weld(obL); _weld(obR)
        obL['boot_origin'] = list(BOOT_O)
