# Executed inside the build.py / pieces.py namespace.
# Surtaysha's riding boots, built from the reference silhouettes (boot_ref/: masks -> boot_profile.npz -> boot_hull.Hull).
# One two-tone leather boot per leg, NO armour: brown boot (foot, heel, back of the shaft), grey leather front panel on
# the shaft with a raised border and a centre rib, two brown straps round the back with a small buckle on the outer side,
# welted sole with a low heel. Pieces: SUR_Boot (brown upper), SUR_Boot_Sole, SUR_Boot_Shaft (grey panel),
# SUR_Boot_Straps (straps, buckles, studs, seams, welt; trim sheet).
import sys as _sys, importlib as _il
_sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else r"F:\qirq-qiz\tools\blender\surtaysha_final", 'boot_ref'))
import numpy as _np
import boot_hull; _il.reload(boot_hull)

BOOT_TOP = 0.450
# the boot points where this body's foot points (heel centre -> toe centre), not at a fixed toe-out
_ft = [p for p in FIT.V if p.x > 0.02 and p.z < 0.10]
_fy0, _fy1 = min(p.y for p in _ft), max(p.y for p in _ft)
_hl = [p for p in _ft if p.y > _fy1 - 0.04]; _te = [p for p in _ft if p.y < _fy0 + 0.05]
FOOT_THETA = math.atan2(sum(p.x for p in _te) / len(_te) - sum(p.x for p in _hl) / len(_hl), -(sum(p.y for p in _te) / len(_te) - sum(p.y for p in _hl) / len(_hl)))
print('FOOT toe-out %.1f deg, foot y %.3f..%.3f' % (math.degrees(FOOT_THETA), _fy0, _fy1))
HULL = boot_hull.Hull(theta=FOOT_THETA)
_lg = [FIT.leg_at(0.26 + 0.02 * k) for k in range(8)]
BOOT_O = (sum(c[0] for c in _lg) / len(_lg) + float(os.environ.get('SUR_BOOT_DX', '0.0')), sum((c[2] + c[3]) / 2 for c in _lg) / len(_lg))   # shaft axis = leg centre at mid shaft
print('BOOT origin', BOOT_O, 'toe-out %.1f deg' % math.degrees(HULL.theta))

BOOT_S = float(os.environ.get('SUR_BOOT_S', '1.0'))
BOOT_SF = float(os.environ.get('SUR_BOOT_SF', '1.0')); TOE_LOW = float(os.environ.get('SUR_TOE_LOW', '0.0')); TOE_LONG = float(os.environ.get('SUR_TOE_LONG', '0.0'))
TOE_Y0 = HULL.y_toe * 0.40; TOE_ZS = 0.014
print('BOOT hull y_toe %.3f y_heel %.3f' % (HULL.y_toe, HULL.y_heel))
def BW(p):
    """hull local -> world"""
    # shaft widened around its axis for this body's calf (BOOT_S); the foot part less (BOOT_SF), and the toe is drawn
    # lower and longer, less bulbous (reference turnaround): height over the welt reduced toward the tip, tip moved forward
    x, y, z = float(p[0]), float(p[1]), float(p[2])
    sc = BOOT_SF + (BOOT_S - BOOT_SF) * smoothstep(0.10, 0.20, z)
    t = max(0.0, min(1.0, (y - TOE_Y0) / (HULL.y_toe - TOE_Y0)))
    if t > 0.0 and z < 0.16:
        z = TOE_ZS + (z - TOE_ZS) * (1.0 - TOE_LOW * t * t); y = y + (HULL.y_toe - TOE_Y0) * TOE_LONG * t * t
    return Vector(HULL.to_world((x * sc, y * sc, z), BOOT_O).tolist())
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

_BOOT_OBJS = {}
def _leg_envelope(side):
    """smooth skin-tight envelope of one lower leg + foot (toes merged): the body faces 2 mm out, voxel-remeshed, relaxed"""
    import bmesh
    bm = bmesh.new(); bm.from_mesh(proxy.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.x * side < 0.01 or v.co.z > BOOT_TOP + 0.07], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    # a boot has one smooth toe box, not five toes: wrap the forefoot in its convex hull before the remesh
    ft_ = [v for v in bm.verts if v.co.z < 0.10]; y0_ = min(v.co.y for v in ft_); y1_ = max(v.co.y for v in ft_)
    fore = [v for v in ft_ if v.co.y < y0_ + 0.45 * (y1_ - y0_) and v.co.z < 0.085]
    hv_ = [bm.verts.new(v.co.copy()) for v in fore]
    bmesh.ops.convex_hull(bm, input=hv_)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.002
    me_ = bpy.data.meshes.new('env'); bm.to_mesh(me_); bm.free()
    ob_ = bpy.data.objects.new('env', me_); bpy.context.scene.collection.objects.link(ob_)
    m_ = ob_.modifiers.new('rm', 'REMESH'); m_.mode = 'VOXEL'; m_.voxel_size = 0.005
    m_ = ob_.modifiers.new('sm', 'SMOOTH'); m_.factor = 0.5; m_.iterations = 6
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    ev = bpy.data.meshes.new_from_object(ob_.evaluated_get(dg)); ev.calc_loop_triangles()
    vs = [v.co.copy() for v in ev.vertices]; ns = [v.normal.copy() for v in ev.vertices]; fs = [tuple(t.vertices) for t in ev.loop_triangles]
    bpy.data.objects.remove(ob_); bpy.data.meshes.remove(me_); bpy.data.meshes.remove(ev)
    return _BVH.FromPolygons(vs, fs), vs, ns, fs

def _fit_boots():
    """The author: the boot must hug the foot, ankle and calf (no air inside, no oversized toe). The reference-shaped
    boot is laid onto the leg: every point of the upper goes to the leg envelope + leather thickness, and every other
    part (panel, straps, seams, sole) moves with the point of the upper it sits on, so the two-tone design is kept."""
    GAP = float(os.environ.get('SUR_BOOT_GAP', '0.0045'))
    for si, side in ((0, 1), (1, -1)):
        up = _BOOT_OBJS['SUR_Boot'][si]; env, EV, EN, EF = _leg_envelope(side)
        up.data.calc_loop_triangles()
        ubvh = _BVH.FromPolygons([v.co.copy() for v in up.data.vertices], [tuple(t.vertices) for t in up.data.loop_triangles])
        zf = 0.030                                               # below this the upper meets the sole: keep heights there
        def disp(q):
            h = env.find_nearest(q)
            if h[0] is None: return Vector((0, 0, 0))
            n = h[1]; t = h[0] + n * GAP
            d = t - q
            if q.z < zf: d.z *= max(0.0, q.z / zf)
            return d
        cache = {}
        for name, pair in _BOOT_OBJS.items():
            o = pair[si]; flat = name == 'SUR_Boot_Sole'
            if name == 'SUR_Boot': continue                      # the upper itself is rebuilt from the envelope below
            for v in o.data.vertices:
                q = ubvh.find_nearest(v.co)[0]
                if q is None: continue
                if flat:
                    k = (round(q.x, 4), round(q.y, 4), round(q.z, 4))
                    d = cache.get(k)
                    if d is None: d = disp(q); cache[k] = d
                    v.co = v.co + Vector((d.x, d.y, 0)); continue
                hgt = (v.co - q).length                      # how far this point stands off the old upper
                e = env.find_nearest(v.co)
                if e[0] is None: continue
                t = e[0] + e[1] * (GAP + hgt); d = t - v.co
                if v.co.z < zf: d.z *= max(0.0, v.co.z / zf)
                v.co = v.co + d
            o.data.update()
        # the panel was laid on point by point: relax it so its lower edge over the instep is a clean line again
        import bmesh as _bmx
        pm = _BOOT_OBJS['SUR_Boot_Shaft'][si].data; bx = _bmx.new(); bx.from_mesh(pm)
        for _ in range(5): _bmx.ops.smooth_vert(bx, verts=bx.verts[:], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bx.normal_update()
        for v in bx.verts: v.co += v.normal * 0.0012
        bx.to_mesh(pm); bx.free(); pm.update()
        # the brown upper = the leg envelope itself + leather thickness (dense, so no chord cuts through ankle or heel),
        # open at the cuff and under the foot (the sole closes it)
        import bmesh
        bm = bmesh.new(); vv = [bm.verts.new(EV[i] + EN[i] * GAP) for i in range(len(EV))]
        for f in EF:
            try: bm.faces.new((vv[f[0]], vv[f[1]], vv[f[2]]))
            except ValueError: pass
        ztop = max(v.co.z for v in up.data.vertices)
        for co, outer in ((Vector((0, 0, ztop)), True), (Vector((0, 0, 0.009)), False)):
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=Vector((0, 0, 1)), clear_outer=outer, clear_inner=not outer)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        cx_ = sum(v.co.x for v in bm.verts) / len(bm.verts); cy_ = sum(v.co.y for v in bm.verts if v.co.z > 0.2) / max(1, sum(1 for v in bm.verts if v.co.z > 0.2))
        uvl = bm.loops.layers.uv.new('UVMap')
        def wrap_(a): return (a + math.pi) % (2 * math.pi) - math.pi
        for f in bm.faces:
            c = f.calc_center_median()
            if c.z > 0.13: ang = lambda p: math.atan2(p.x - cx_, p.y - cy_); u0 = 0.0; vf = lambda p: p.z          # shaft: seam down the front under the panel? no: at the back (angle 0 = back)
            else: ang = lambda p: math.atan2(p.z - 0.05, (p.x - cx_) * side); u0 = 1.0; vf = lambda p: -p.y            # foot: seam under the sole side
            ac = ang(c)
            for l in f.loops:
                p = l.vert.co; l[uvl].uv = (u0 + (ac + wrap_(ang(p) - ac)) * 0.10, vf(p))
        nm_ = bpy.data.meshes.new(up.data.name + '_fit'); bm.to_mesh(nm_); bm.free()
        mats_ = list(up.data.materials); old_ = up.data; up.data = nm_
        for m_ in mats_: nm_.materials.append(m_)
        dm = up.modifiers.new('dc', 'DECIMATE'); dm.ratio = min(1.0, 4200.0 / max(1, len(nm_.polygons)))
        bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
        fin = bpy.data.meshes.new_from_object(up.evaluated_get(dg)); up.modifiers.clear(); up.data = fin; bpy.data.meshes.remove(nm_); bpy.data.meshes.remove(old_)
        for p_ in fin.polygons: p_.use_smooth = True
        if not fin.materials:
            for m_ in mats_: fin.materials.append(m_)
        if 'bake_skip' in up: del up['bake_skip']             # left and right uppers are separate meshes now: both are baked
    print('BOOT fitted to the leg, leather offset %.1f mm over the envelope' % (GAP * 1000))

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
        _BOOT_OBJS[name] = (obL, obR)
    _fit_boots()
