# Surtaysha's armour built ON the body, layer on layer, at real size (author, 26 Nov: every layer must rest on the one
# below, no air, no interpenetration). Stages, each saved to out/armor_C.blend (body + clothes + armour, simple
# materials that read in Solid / Material preview):
#   1  kaftan: body surface of the trunk and arms + 4.5 mm, relaxed, plane-cut hems, leather binding
#   2  cuirass base: ONE continuous leather shell = kaftan surface + 6 mm, neck-line to waist, wrapped round the sides
#      and the back, open at the armholes; leather edging on its edges; shoulder straps laid on the shoulders
#   3  lamellae placed ON that shell: rows equally spaced ALONG the surface (arc length), each plate turned to the
#      local normal / tangent, ~30 % overlap, bottom edge tilted out <= 3 mm
#   4  waist guard + belt (tight on the waist), skirt panels and kaftan skirt (hanging from the belt on the thighs)
# blender -b <out/proxy.blend | out/armor_C.blend> --python armor_c.py -- <stage>
# Every stage prints signed distances between layers (min must be >= 0: no interpenetration) and the largest gaps.
import bpy, bmesh, sys, os, math, json, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
OUT = os.path.join(HERE, 'out'); STAGE = int(sys.argv[sys.argv.index('--') + 1])
BON = json.load(open(os.path.join(OUT, 'landmarks.json')))['bones']
def bone(n):
    # the landmark file's hand_r joint is wrong: every right-side joint is the mirror of the left one (the body is symmetric)
    if n.endswith('_r'): l = BON[n[:-2] + '_l']['head']; return Vector((-l[0], l[1], l[2]))
    return Vector(BON[n]['head'])
body = bpy.data.objects['SUR_BodyProxy']; me = body.data
GN = {g.index: g.name for g in body.vertex_groups}
def wsum(v, keys): return sum(g.weight for g in v.groups if any(k in GN.get(g.group, '') for k in keys))
ARMK = ('upperarm', 'lowerarm', 'hand_', 'thumb', 'index', 'middle', 'ring', 'pinky', 'wrist')
HANDK = ('thumb', 'index', 'middle', 'ring', 'pinky')
LEGK = ('thigh', 'calf', 'foot', 'ball', 'toe')
HEADK = ('head', 'FACIAL')
ARMW = [wsum(v, ARMK) for v in me.vertices]; LEGW = [wsum(v, LEGK) for v in me.vertices]; HEADW = [wsum(v, HEADK) for v in me.vertices]; HANDW = [wsum(v, HANDK) for v in me.vertices]
KAFT, SHELL = 0.0045, 0.0055

def mat(name, col, metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*col, 1); m.metallic = metal; m.roughness = rough; m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if b: b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m
M_BODY = mat('C_Skin', (0.55, 0.36, 0.26)); M_KAFT = mat('C_Kaftan', (0.20, 0.12, 0.07), rough=0.9); M_LEATH = mat('C_Leather', (0.16, 0.08, 0.04), rough=0.5)
M_IRON = mat('C_Lamellar', (0.36, 0.37, 0.40), 0.35, 0.75); M_GOLD = mat('C_Gold', (0.85, 0.62, 0.22), 1.0, 0.3); M_TROU = mat('C_Trousers', (0.10, 0.09, 0.08), rough=0.9)
if not me.materials: me.materials.append(M_BODY)

def bvh_of(ob):
    ob.data.calc_loop_triangles()
    return BVHTree.FromPolygons([v.co.copy() for v in ob.data.vertices], [tuple(t.vertices) for t in ob.data.loop_triangles])
def signed(pts, ob):
    """signed distance of points to the surface of ob (+ = outside, along the surface normal)"""
    t = bvh_of(ob); out = []
    for p in pts:
        q, n, i, d = t.find_nearest(p)
        out.append((p - q).dot(n) if q is not None else 0.0)
    return out
def report(tag, pts, ob, zones=None):
    s = signed(pts, ob)
    print('DIST %-34s min %+6.1f mm  max %+6.1f mm  mean %+5.1f mm  (n %d, negative = inside)' % (tag, min(s) * 1000, max(s) * 1000, sum(s) / len(s) * 1000, len(s)))
    if zones:
        for zn, fn in zones:
            zs = [d for p, d in zip(pts, s) if fn(p)]
            if zs: print('     %-30s min %+6.1f mm  max %+6.1f mm  (n %d)' % (zn, min(zs) * 1000, max(zs) * 1000, len(zs)))
    return s
def body_sheet(keep):
    """welded copy of the body faces whose vertices pass keep(i, co), outward normals"""
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.index, v.co)], context='VERTS')
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5)
    seen = set(); drop = []
    for v0 in bm.verts:
        if v0 in seen: continue
        st = [v0]; seen.add(v0); comp = []
        while st:
            v = st.pop(); comp.append(v)
            for e in v.link_edges:
                w = e.other_vert(v)
                if w not in seen: seen.add(w); st.append(w)
        if len(comp) < 300: drop += comp
    if drop: bmesh.ops.delete(bm, geom=drop, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
    return bm
def obj_from(bm, name, m_):
    md = bpy.data.meshes.new(name); bm.to_mesh(md); bm.free()
    old = bpy.data.objects.get(name)
    if old: bpy.data.objects.remove(old)
    o = bpy.data.objects.new(name, md); bpy.context.scene.collection.objects.link(o); md.materials.append(m_)
    for p in md.polygons: p.use_smooth = True
    return o
def cut(bm, co, no, sel=None):
    g = [f for f in bm.faces if sel is None or sel(f.calc_center_median())]
    geom = list({v for f in g for v in f.verts}) + list({e for f in g for e in f.edges}) + g
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True, clear_inner=False)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
def loops_of(bm):
    out = []; used = set()
    for e0 in [e for e in bm.edges if e.is_boundary]:
        if e0 in used: continue
        lp = [e0.verts[0], e0.verts[1]]; used.add(e0)
        while True:
            nx = [e for e in lp[-1].link_edges if e.is_boundary and e not in used]
            if not nx: break
            used.add(nx[0]); w = nx[0].other_vert(lp[-1])
            if w is lp[0]: break
            lp.append(w)
        if len(lp) > 12: out.append([v.co.copy() for v in lp])
    return out
TRIM = {'edge': (0.0, 0.159), 'strap': (0.159, 0.330), 'belt': (0.330, 0.553), 'goldband': (0.553, 0.593), 'border': (0.593, 0.726), 'cord': (0.726, 0.748), 'metal': (0.748, 1.0)}      # bands of the trim sheet (0.60 m per U)
ATLAS_COLS, TILE_W, TILE_H = 8, 1.0 / 8, (3900 / 4096) / 6                      # the lamellar atlas: 40 plate variants in 8 x 5 tiles
def fuv(bm, verts, uvs):
    f = bm.faces.new(verts); l = bm.loops.layers.uv.verify()
    for lp, uv in zip(f.loops, uvs): lp[l].uv = uv
    return f
def tube_along(bm, pts, nrm_fn, r=0.004, seg=8, lift=0.0, fix=None, band='edge'):
    """closed binding: a small round section swept along a closed polyline, sitting on the surface"""
    # an even bound edge: the rim curve is smoothed and re-spaced, the surface normals are averaged along it, the section
    # is one constant circle; the centre line is smoothed once more after any clearance correction (no kinks, no knots)
    def sm(L, it):
        for _ in range(it): L = [(L[i - 1] + L[i] * 2 + L[(i + 1) % len(L)]) / 4 for i in range(len(L))]
        return L
    pts = sm(list(pts), 3); n = len(pts)
    tot = sum((pts[(i + 1) % n] - pts[i]).length for i in range(n)); step = tot / n; acc = 0.0; even = [pts[0].copy()]; j = 0; d_next = step      # re-space evenly
    while len(even) < n:
        seg_l = (pts[(j + 1) % n] - pts[j]).length
        if acc + seg_l >= d_next - 1e-12 and seg_l > 1e-12: even.append(pts[j].lerp(pts[(j + 1) % n], (d_next - acc) / seg_l)); d_next += step
        else: acc += seg_l; j += 1
        if j > 4 * n: break
    pts = even; n = len(pts)
    N = sm([nrm_fn(p_) for p_ in pts], 5); cen = []
    for i in range(n):
        nn = N[i].normalized(); c = pts[i] + nn * (lift + r * 0.6)
        if fix: c = fix(c, r)
        cen.append(c)
    cen = sm(cen, 3 if fix else 1); rings = []
    for i in range(n):
        t = (cen[(i + 1) % n] - cen[i - 1]).normalized(); nn = N[i] - t * N[i].dot(t); nn = nn.normalized(); b = t.cross(nn).normalized()
        rings.append([bm.verts.new(cen[i] + (nn * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    pts = cen
    v0, v1 = TRIM[band]; arc = [0.0]
    for i in range(n): arc.append(arc[-1] + (pts[(i + 1) % n] - pts[i]).length)
    sc = max(1, round(arc[-1] / 0.60)) / arc[-1]                                   # a whole number of sheet repeats round the loop
    vv = [v0 + (v1 - v0) * (0.08 + 0.84 * (((k / seg) + 0.5) % 1.0)) for k in range(seg)]; vv.append(vv[0])      # the seen (outer) side takes the middle of the band
    for i in range(n):
        a, b_ = rings[i], rings[(i + 1) % n]; u0, u1 = arc[i] * sc, arc[i + 1] * sc
        for k in range(seg):
            va, vb = vv[k], vv[k + 1]
            if abs(va - vb) > (v1 - v0) * 0.5: vb = va                             # the wrap-round face sits under the tube: no stretched band there
            fuv(bm, (a[k], a[(k + 1) % seg], b_[(k + 1) % seg], b_[k]), ((u0, va), (u0, vb), (u1, vb), (u1, va)))
def resample(pts, step):
    L = [0.0]; P = pts + [pts[0]]
    for i in range(1, len(P)): L.append(L[-1] + (P[i] - P[i - 1]).length)
    n = max(8, int(L[-1] / step)); out = []; j = 0
    for k in range(n):
        d = L[-1] * k / n
        while L[j + 1] < d: j += 1
        t = (d - L[j]) / max(1e-9, L[j + 1] - L[j]); out.append(P[j].lerp(P[j + 1], t))
    return out
def smooth_closed(pts, it):
    for _ in range(it): pts = [(pts[i - 1] + pts[i] * 2 + pts[(i + 1) % len(pts)]) / 4 for i in range(len(pts))]
    return pts

Z_WAIST = bone('spine_01').z - 0.02          # kaftan upper ends here (under the waist guard)
Z_COL = min(bone('neck_01').z + 0.03, bone('head').z - 0.10)
WR = {s: (bone('lowerarm_' + s), bone('hand_' + s)) for s in 'lr'}

def lower_boots(ratio=0.70):
    """boot tops at `ratio` of the knee height (ref: top 133 px above the sole, knee ~190 px -> 0.70); the shaft is a smooth
    convex leather tube: per height the convex outline of the leg + trousers, eased along the height (no calf-muscle relief)"""
    boots = [o for o in bpy.data.objects if o.name.startswith('SUR_Boot') and 'Sole' not in o.name]
    if not boots: return
    tr = bpy.data.objects.get('SUR_Trousers'); z_a = 0.165; z_old = max(v.co.z for o in boots for v in o.data.vertices); z_new = ratio * bone('calf_l').z
    for sx in (1, -1):
        sd = 'l' if sx > 0 else 'r'; c0 = bone('foot_' + sd); c1 = bone('calf_' + sd)
        def cen(z): t = (z - c0.z) / (c1.z - c0.z); return c0.x + (c1.x - c0.x) * t, c0.y + (c1.y - c0.y) * t
        P = [v.co for i, v in enumerate(me.vertices) if LEGW[i] > 0.5 and v.co.x * sx > 0 and v.co.z < z_old + 0.08] + ([v.co for v in tr.data.vertices if v.co.x * sx > 0 and v.co.z < z_old + 0.08] if tr else [])
        cache = {}
        def hull_at(zq):
            if zq not in cache:
                z = zq * 0.005; cx, cy = cen(z); cache[zq] = hull2([(q.x - cx, q.y - cy) for q in P if abs(q.z - z) < 0.012])
            return cache[zq]
        def env(z, ca, sa): h = hull_at(int(round(z / 0.005))); return ray_poly(h, 0.0, 0.0, ca, sa) if len(h) > 2 else 0.0
        def env_s(z, ca, sa): e = [env(z + dz, ca, sa) for dz in (-0.03, -0.015, 0.0, 0.015, 0.03)]; return max(e[2], sum(e) / 5.0)
        n_ = 0
        for o in boots:
            for v in o.data.vertices:
                p_ = v.co
                if p_.x * sx <= 0 or p_.z <= z_a: continue
                cx, cy = cen(p_.z); dx, dy = p_.x - cx, p_.y - cy; r_ = math.hypot(dx, dy)
                if r_ < 1e-6: continue
                ca, sa = dx / r_, dy / r_; off = min(0.02, max(0.0035, r_ - env(p_.z, ca, sa)))
                zn = z_a + (p_.z - z_a) / (z_old - z_a) * (z_new - z_a); cxn, cyn = cen(zn); rn = env_s(zn, ca, sa) + off
                w_ = min(1.0, (p_.z - z_a) / 0.04); w_ = w_ * w_ * (3 - 2 * w_)
                v.co = Vector((p_.x + (cxn + ca * rn - p_.x) * w_, p_.y + (cyn + sa * rn - p_.y) * w_, p_.z + (zn - p_.z) * w_)); n_ += 1
        print('boots %s: top %.3f -> %.3f m (%.2f of the knee height), %d verts refitted on the smooth leg outline' % (sd, z_old, z_new, ratio, n_))
    for o in boots: o.data.update()

def stage1():
    with bpy.data.libraries.load(os.path.join(OUT, 'armor_low.blend')) as (f, t):   # the accepted fitted boots and trousers
        t.objects = [n for n in f.objects if ('Trouser' in n or 'Boot' in n) and n not in bpy.data.objects]
    for o in t.objects:
        if o: bpy.context.scene.collection.objects.link(o)
    # the kaftan's upper part ends just above the trousers' band (its skirt, stage 4, hangs from there outside the trousers):
    # the two cloths never share a zone, so there is nothing to tear or flicker at the band
    lower_boots()
    global Z_WAIST
    if 'SUR_Trousers' in bpy.data.objects: Z_WAIST = max(v.co.z for v in bpy.data.objects['SUR_Trousers'].data.vertices) + 0.004
    def keep(i, p):
        if HEADW[i] > 0.5 or HANDW[i] > 0.5 or (LEGW[i] > 0.5 and p.z < Z_WAIST - 0.02): return False
        if p.z < Z_WAIST - 0.04 and abs(p.x) < 0.33: return False
        if p.z > Z_COL + 0.04 and abs(p.x) < 0.13: return False
        for s in 'lr':
            a, b = WR[s]; d = (b - a).normalized()
            if (p - b).dot(d) > 0.03 and (p - b).length < 0.25: return False
        return True
    bm = body_sheet(keep)
    for v in bm.verts: v.co += v.normal * KAFT
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(2): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in inner: v.co += v.normal * 0.001
    n0 = bone('neck_01'); nax = (bone('head') - n0).normalized(); zc0 = bone('clavicle_l').z      # collar: a round opening about the neck's axis
    def in_neck(c): d_ = c - n0; return d_.dot(nax) > -0.035 and (d_ - nax * d_.dot(nax)).length < 0.098
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if in_neck(f.calc_center_median())], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    smooth_boundary(bm, 12, lambda c: c.z > zc0 - 0.06 and abs(c.x) < 0.2)
    cut(bm, Vector((0, 0, Z_WAIST)), Vector((0, 0, -1)), lambda c: abs(c.x) < 0.34 and c.z < Z_WAIST + 0.06)
    for s in 'lr':
        a, b = WR[s]; d = (b - a).normalized()
        cut(bm, b - d * 0.062, d, lambda c, a=a, d=d, b=b: (c - a).dot(d) > 0.5 * (b - a).length and (c - b).length < 0.30)
    # no vertex may be inside the body: push out any that the relaxing left under 2 mm
    bt = bvh_of(body); fixed = 0
    for it in range(30):
        nf = 0
        for v in bm.verts:
            q, n, i, d = bt.find_nearest(v.co)
            if q is not None and (v.co - q).dot(n) < 0.002: v.co = q + n * 0.003; nf += 1
        fixed += nf
        if not nf: break
    # creases where the arm lies against the trunk leave less room than the offset: sit the cloth in the crease
    tight = 0
    for v in bm.verts:
        q, n, i, d = bt.find_nearest(v.co)
        if q is None or (v.co - q).dot(n) >= 0.0: continue
        for _ in range(6):
            for off in (0.002, 0.001, 0.0004, 0.0001):
                c = q + n * off; q2, n2, i2, d2 = bt.find_nearest(c)
                if (c - q2).dot(n2) >= 0.0: v.co = c; break
            else:
                q, n = q2, n2; continue
            break
        tight += 1
    print('push-out passes', it + 1, 'left', nf, 'crease verts', tight)
    # the kaftan lies OVER the trousers' waistband: seen from the body's axis every kaftan point is outside the trousers
    # (a radial test: the band's rolled rim has no usable inside / outside), and the zone is relaxed into one smooth surface
    tr = bpy.data.objects.get('SUR_Trousers'); over = 0
    if tr:
        tt = bvh_of(tr); zt = max(v.co.z for v in tr.data.vertices); yax = bone('spine_01').y
        def clear_trousers(vs):
            n_ = 0
            for v in vs:
                o = Vector((0, yax, v.co.z)); d = v.co - o; r = d.length; d = d / r; far = None; p0 = o.copy()
                for _ in range(8):
                    h = tt.ray_cast(p0, d, 0.6)
                    if h[0] is None: break
                    far = (h[0] - o).length; p0 = h[0] + d * 1e-4
                if far is not None and r < far + 0.002: v.co = o + d * (far + 0.0028); n_ += 1
            return n_
        zone = [v for v in bm.verts if v.co.z < zt + 0.10]; inner = [v for v in zone if not v.is_boundary]
        over = clear_trousers(zone)
        for _ in range(14):
            bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=False)
            clear_trousers(zone)
            for v in zone:
                q, n, i, d = bt.find_nearest(v.co)
                if q is not None and (v.co - q).dot(n) < 0.003: v.co = q + n * 0.004
    print('laid over the trousers', over)
    lps = loops_of(bm)
    ko = obj_from(bm, 'SUR_Robe_Torso', M_KAFT)
    kt = bvh_of(ko); bb = bmesh.new(); nb = 0
    for lp in lps:
        cz = sum(p.z for p in lp) / len(lp); cxa = sum(abs(p.x) for p in lp) / len(lp)
        if cz < Z_WAIST + 0.03 and cxa < 0.30: continue
        if cxa > 0.30: continue          # the cuffs are under the bracers: no binding there
        pts = smooth_closed(resample(lp, 0.010), 2)
        tube_along(bb, pts, lambda p: kt.find_nearest(p)[1], r=0.004); nb += 1
    bmesh.ops.recalc_face_normals(bb, faces=bb.faces)
    obj_from(bb, 'SUR_Robe_Trim', M_LEATH)
    print('STAGE 1 kaftan: verts %d, pushed out %d, bound edges %d' % (len(ko.data.vertices), fixed, nb))
    report('kaftan -> body', [v.co for v in ko.data.vertices], body)

def torso_shell_bm():
    """the cuirass base surface: kaftan-level body surface of the trunk only (+ kaftan + shell offset), open armholes"""
    z_lo = bone('spine_02').z - 0.01; z_hi = bone('neck_01').z + 0.02
    tr_ = bpy.data.objects.get('SUR_Trousers')
    if tr_: z_lo = max(z_lo, max(v.co.z for v in tr_.data.vertices) + 0.012)      # the cuirass ends above the trousers' band; the waist guard takes over below
    def keep(i, p):
        return ARMW[i] < 0.25 and LEGW[i] < 0.5 and HEADW[i] < 0.5 and z_lo - 0.05 < p.z < z_hi + 0.14
    bm = body_sheet(keep)
    for v in bm.verts: v.co += v.normal * (KAFT + SHELL)
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(3): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in inner: v.co += v.normal * 0.0012
    return bm, z_lo, z_hi

class Surf:
    """a surface to rest things on: nearest point with the SMOOTH (vertex-interpolated) normal, so that the sign of a
    distance is right in creases and at edges too"""
    def __init__(self, ob):
        m = ob.data; m.calc_loop_triangles(); self.co = [v.co.copy() for v in m.vertices]; self.no = [v.normal.copy() for v in m.vertices]
        self.tri = [tuple(t.vertices) for t in m.loop_triangles]; self.t = BVHTree.FromPolygons(self.co, self.tri)
        cnt = {}
        for pl in m.polygons:
            for ek in pl.edge_keys: cnt[ek] = cnt.get(ek, 0) + 1
        bp = []
        for (a, b), c in cnt.items():
            if c == 1:
                n_ = max(1, int((self.co[a] - self.co[b]).length / 0.002))
                bp += [self.co[a].lerp(self.co[b], j / n_) for j in range(n_ + 1)]
        self.bk = KDTree(max(1, len(bp)))
        for j, q in enumerate(bp): self.bk.insert(q, j)
        self.bk.balance(); self.nb = len(bp)
    def at_edge(self, q, r=0.003):
        return self.nb > 0 and self.bk.find(q)[2] < r
    def near(self, p):
        q, n, i, d = self.t.find_nearest(p)
        if q is None: return None, None, 1e9
        a, b, c = self.tri[i]; A, B, C_ = self.co[a], self.co[b], self.co[c]
        v0, v1, v2 = B - A, C_ - A, q - A; d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1); den = d00 * d11 - d01 * d01
        if abs(den) > 1e-18:
            v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den; ns = self.no[a] * (1 - v - w) + self.no[b] * v + self.no[c] * w
            if ns.length > 1e-9: n = ns.normalized()
        return q, n, (p - q).dot(n)
    def sd(self, p): return self.near(p)[2]
def report2(tag, pts, S, zones=None):
    # samples whose nearest point is the free EDGE of the surface are left out (beyond an edge there is no inside / outside)
    keep = []; s = []
    for p in pts:
        q, n, d = S.near(p)
        if q is None or S.at_edge(q): continue
        keep.append(p); s.append(d)
    skipped = len(pts) - len(keep); pts = keep
    if not s: print('DIST %-34s no samples' % tag); return s
    print('DIST %-34s min %+6.1f mm  max %+6.1f mm  mean %+5.1f mm  (n %d, at the edge and left out %d)' % (tag, min(s) * 1000, max(s) * 1000, sum(s) / len(s) * 1000, len(s), skipped))
    w = sorted(zip(s, [tuple(round(c, 3) for c in p) for p in pts]))
    print('     lowest at', [(round(a * 1000, 1), b) for a, b in w[:3]], 'highest at', [(round(a * 1000, 1), b) for a, b in w[-2:]])
    for zn, fn in zones or []:
        zs = [d for p, d in zip(pts, s) if fn(p)]
        if zs: print('     %-36s min %+6.1f mm  max %+6.1f mm  (n %d)' % (zn, min(zs) * 1000, max(zs) * 1000, len(zs)))
    return s
def smooth_boundary(bm, it=12, where=None):
    """straighten the stepped free edges (they follow the body's polygons) into smooth curves"""
    bv = [v for v in bm.verts if v.is_boundary and (where is None or where(v.co))]
    nb = {v: [e.other_vert(v) for e in v.link_edges if e.is_boundary] for v in bv}
    for _ in range(it):
        new = {v: (v.co * 2 + nb[v][0].co + nb[v][1].co) / 4 for v in bv if len(nb[v]) == 2}
        for v, c in new.items(): v.co = c
def ZONES():
    zc = bone('clavicle_l').z
    return [('shoulder top (z > clavicle)', lambda p: p.z > zc), ('armhole ring (|x| > 0.17, z > 1.20)', lambda p: abs(p.x) > 0.17 and p.z > 1.20),
            ('upper back (y > 0.05, z > 1.25)', lambda p: p.y > 0.05 and p.z > 1.25), ('sides (|x| > 0.18, z < 1.20)', lambda p: abs(p.x) > 0.18 and p.z < 1.20)]

def stage2():
    kaft = bpy.data.objects['SUR_Robe_Torso']; K = Surf(kaft); BD = Surf(body)
    for n_ in ('SUR_Cuirass_Backing', 'SUR_Cuirass_Trim', 'SUR_Cuirass_Straps'):
        if n_ in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n_])
    bm, z_lo, z_hi = torso_shell_bm()
    neck = Vector((0, bone('neck_01').y, 0)); z_nl = bone('clavicle_l').z + 0.02
    cut(bm, Vector((0, 0, z_lo - 0.03)), Vector((0, 0, -1)))      # 3 cm long for now: the hem is cut level at the very end
    # neck-line: one clean slanted cut (low at the throat, higher at the nape)
    # neck-line: a round opening about the neck's own axis (the stepped rim is straightened by smooth_boundary below)
    n0 = bone('neck_01'); nax = (bone('head') - n0).normalized(); RN = float(os.environ.get('SUR_NECK_R', '0.125'))
    def in_neck(c): d_ = c - n0; return d_.dot(nax) > -0.035 and (d_ - nax * d_.dot(nax)).length < RN
    zc0 = bone('clavicle_l').z
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if in_neck(f.calc_center_median())], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    def snap(lo=SHELL - 0.0004, hi=SHELL + 0.0004):
        n_ = 0
        for v in bm.verts:
            q, n, s = K.near(v.co)
            if q is not None and (s < lo or s > hi): v.co = q + n * SHELL; n_ += 1
        return n_
    fixed = 0
    for rnd in range(6):
        for _ in range(4): fixed += snap()
        # where the arm's sleeve leaves no room (armpit crease) the shell cannot exist: the armhole is cut deeper there
        bad = [v for v in bm.verts if (K.sd(v.co) < 0.004 and abs(v.co.x) > 0.15 and v.co.z > 1.12) or BD.sd(v.co) < 0.006]      # ... or inside the arm lying on the trunk
        if rnd < 5 and bad:
            bmesh.ops.delete(bm, geom=bad, context='VERTS'); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        smooth_boundary(bm, 14 if rnd == 0 else 6, lambda c: c.z > z_lo + 0.02)
        if not bad and rnd > 0: break
    for _ in range(4): fixed += snap()
    cut(bm, Vector((0, 0, z_lo)), Vector((0, 0, -1)))
    # a stiff cuirass does not follow every muscle: in the HOLLOWS only (under the chest muscles, breast bone, spine groove)
    # the shell bridges, at most HOLLOW off the kaftan; within 5 cm of any rim it stays tight, so no gap shows from outside
    HOLLOW = float(os.environ.get('SUR_HOLLOW', '0.0095')); bm.verts.ensure_lookup_table()
    import heapq
    dist = {v: 1e9 for v in bm.verts}; hq = []
    for v in bm.verts:
        if v.is_boundary: dist[v] = 0.0; heapq.heappush(hq, (0.0, v.index))
    while hq:
        d, i = heapq.heappop(hq); v = bm.verts[i]
        if d > dist[v]: continue
        for e in v.link_edges:
            w = e.other_vert(v); nd = d + e.calc_length()
            if nd < dist[w]: dist[w] = nd; heapq.heappush(hq, (nd, w.index))
    def sst(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
    cap = {v: SHELL + (HOLLOW - SHELL) * sst((dist[v] - 0.02) / 0.03) for v in bm.verts}
    inner = [v for v in bm.verts if not v.is_boundary]; nfair = 0
    for it in range(40):
        new = {}
        for v in inner:
            a_ = Vector((0, 0, 0)); ws = 0
            for e in v.link_edges: a_ += e.other_vert(v).co; ws += 1
            new[v] = v.co * 0.4 + (a_ / ws) * 0.6
        for v, c in new.items():
            q, n, sdist = K.near(c)
            if q is None: continue
            v.co = q + n * min(cap[v], max(SHELL, sdist))
    nfair = sum(1 for v in inner if K.sd(v.co) > SHELL + 0.0008)
    print('faired in hollows: %d verts lifted, most %.1f mm off the kaftan' % (nfair, max(K.sd(v.co) for v in bm.verts) * 1000))
    left = [v for v in bm.verts if K.sd(v.co) < 0.0 or BD.sd(v.co) < 0.004]
    if left: bmesh.ops.delete(bm, geom=left, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
    if sum((f.calc_center_median() - K.near(f.calc_center_median())[0]).dot(f.normal) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.normal_update()      # outward = away from the kaftan
    lps = loops_of(bm)
    sh = obj_from(bm, 'SUR_Cuirass_Backing', M_LEATH); S = Surf(sh)
    tb = bmesh.new(); stb = bmesh.new(); ne = 0
    for lp in lps:
        if sum(p.z for p in lp) / len(lp) < z_lo + 0.03: continue
        pts = smooth_closed(resample(lp, 0.008), 6)
        pts = [S.near(p)[0] for p in pts]
        def clear_k(c, r):      # the binding may touch the kaftan / the sleeve, never enter it
            for _ in range(3):
                q, n, d = K.near(c)
                if q is None or d >= r + 0.0006: break
                c = c + n * (r + 0.0008 - d)
            return c
        tube_along(tb, pts, lambda p: S.near(p)[1], r=0.0052, lift=0.0016, fix=clear_k); ne += 1
    # shoulder straps: leather bands lying ON the shell, over the middle of each shoulder, front to back
    zc = bone('clavicle_l').z
    top = [v.co for v in sh.data.vertices if v.co.z > zc]; xo = max(abs(p.x) for p in top)
    for sx in (1, -1):
        x = sx * (0.085 + xo) / 2; path = []; y = -0.30
        while y < 0.36:
            h = S.t.ray_cast(Vector((x, y, 2.2)), Vector((0, 0, -1)), 1.5)
            if h[0] is not None and h[0].z > zc - 0.06: path.append(h[0].copy())
            y += 0.006
        if len(path) < 8: print('strap path too short', sx, len(path)); continue
        W, T0, T1 = 0.020, 0.0008, 0.0042; rows = []
        for i, p in enumerate(path):
            t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized(); q0, n0, _s = S.near(p); b = t.cross(n0).normalized(); row = []
            for side, lift in ((1, T0), (1, T1), (-1, T1), (-1, T0)):
                q, n, _s = S.near(p + b * W * side); row.append(stb.verts.new(q + n * lift))
            rows.append(row)
        for i in range(len(rows) - 1):
            for k in range(4): stb.faces.new((rows[i][k], rows[i][(k + 1) % 4], rows[i + 1][(k + 1) % 4], rows[i + 1][k]))
        for r_ in (rows[0], rows[-1]): stb.faces.new(r_)
    bmesh.ops.recalc_face_normals(tb, faces=tb.faces); bmesh.ops.recalc_face_normals(stb, faces=stb.faces)
    tr = obj_from(tb, 'SUR_Cuirass_Trim', M_LEATH); strp = obj_from(stb, 'SUR_Cuirass_Straps', M_LEATH)
    print('STAGE 2 cuirass base: verts %d, snapped to 6 mm %d, removed in creases %d, edged loops %d' % (len(sh.data.vertices), fixed, len(left), ne))
    P = [v.co for v in sh.data.vertices]
    report2('cuirass base -> kaftan', P, K, ZONES())
    report2('cuirass base -> body', P, BD)
    TS = [v.co for v in tr.data.vertices] + [v.co for v in strp.data.vertices]
    report2('edging + straps -> kaftan', TS, K, ZONES())
    report2('edging + straps -> body', TS, BD)
    report2('edging + straps -> cuirass base', TS, S, ZONES())
    # the other direction: no kaftan vertex may stick out through the shell
    kin = [v.co for v in kaft.data.vertices if abs(S.near(v.co)[2]) < 0.02 and (S.near(v.co)[0] - v.co).length < 0.012]
    report2('kaftan (under the shell) -> shell', kin, S)

def geodesic_from_hem(sh, z_hem):
    """per vertex: distance ALONG the shell surface up from the hem (rows of plates are its level lines)"""
    import heapq
    m = sh.data; n = len(m.vertices); adj = [[] for _ in range(n)]
    for e in m.edges:
        a, b = e.vertices; l = (m.vertices[a].co - m.vertices[b].co).length; adj[a].append((b, l)); adj[b].append((a, l))
    for pl in m.polygons:      # ... and across the quads, so that paths are not forced to zigzag
        vs = list(pl.vertices)
        if len(vs) == 4:
            for a, b in ((vs[0], vs[2]), (vs[1], vs[3])): l = (m.vertices[a].co - m.vertices[b].co).length; adj[a].append((b, l)); adj[b].append((a, l))
    f = [1e9] * n; hq = []
    for v in m.vertices:
        if v.co.z < z_hem + 0.0015: f[v.index] = v.co.z - z_hem; heapq.heappush(hq, (f[v.index], v.index))
    while hq:
        d, i = heapq.heappop(hq)
        if d > f[i]: continue
        for j, l in adj[i]:
            if d + l < f[j]: f[j] = d + l; heapq.heappush(hq, (f[j], j))
    # edge-path distances zigzag: scale to the true (straight) surface distance and relax
    fixed = [v.co.z < z_hem + 0.0015 for v in m.vertices]
    for _ in range(12):
        g = f[:]
        for i in range(n):
            if not fixed[i] and adj[i]: g[i] = 0.5 * f[i] + 0.5 * sum(f[j] for j, _l in adj[i]) / len(adj[i])
        f = g
    return f
def iso_lines(sh, f, level):
    """level lines of f on the mesh as chains of points"""
    m = sh.data; m.calc_loop_triangles(); seg = {}; pt = {}
    def cross(a, b):
        k = (min(a, b), max(a, b))
        if k not in pt:
            t = (level - f[a]) / (f[b] - f[a]); pt[k] = m.vertices[a].co.lerp(m.vertices[b].co, t)
        return k
    for t in m.loop_triangles:
        a, b, c = t.vertices; ks = [cross(u, v) for u, v in ((a, b), (b, c), (c, a)) if (f[u] > level) != (f[v] > level)]
        if len(ks) == 2: seg.setdefault(ks[0], []).append(ks[1]); seg.setdefault(ks[1], []).append(ks[0])
    used = set(); chains = []
    starts = [k for k in seg if len(seg[k]) == 1] + list(seg)
    for k0 in starts:
        if k0 in used: continue
        ch = [k0]; used.add(k0)
        while True:
            nx = [k for k in seg[ch[-1]] if k not in used]
            if not nx: break
            ch.append(nx[0]); used.add(nx[0])
        closed = len(ch) > 2 and ch[0] in seg[ch[-1]]
        chains.append(([pt[k] for k in ch], closed))
    return chains
def resample_open(pts, step, closed):
    P = pts + ([pts[0]] if closed else []); L = [0.0]
    for i in range(1, len(P)): L.append(L[-1] + (P[i] - P[i - 1]).length)
    if L[-1] < step: return []
    n = int(L[-1] / step); st = L[-1] / n if closed else step; off = 0.0 if closed else (L[-1] - n * step) / 2; out = []; j = 0
    for k in range(n if closed else n + 1):
        d = off + st * k
        while j < len(L) - 2 and L[j + 1] < d: j += 1
        t = (d - L[j]) / max(1e-9, L[j + 1] - L[j]); out.append(P[j].lerp(P[j + 1], min(1.0, max(0.0, t))))
    return out

ROW, PW, PPITCH, PT, PA, PB = 0.030, 0.0262, 0.0205, 0.0012, 0.0005, 0.0020      # row pitch, plate width, pitch along the row, thickness, lift at the top / bottom edge
PH = ROW / 0.70                                                                # plate length: every row covers 30 % of the row below
def stage3():
    sh = bpy.data.objects['SUR_Cuirass_Backing']; K = Surf(bpy.data.objects['SUR_Robe_Torso']); BD = Surf(body)
    z_hem = min(v.co.z for v in sh.data.vertices); zc = bone('clavicle_l').z; f = geodesic_from_hem(sh, z_hem)
    zt = float(os.environ.get('SUR_LAM_TOP', str(zc - 0.005)))      # lamellae up to the collar bones; above: the leather yoke with the straps
    lam, lace = lam_on(sh, f, zt, ('SUR_Cuirass_Lamellar', 'SUR_Cuirass_Lace'), [(K, 0.0003), (BD, 0.0005)], 'STAGE 3 cuirass', [('cuirass base', Surf(sh)), ('kaftan', K), ('body', BD)])
    # the upper end of the lamellar field: a leather band along the yoke line, over the clipped plate tops
    S = Surf(sh); yb = bmesh.new()
    for pts, closed in iso_lines(sh, [v.co.z for v in sh.data.vertices], zt):
        if len(pts) < 6: continue
        pts = resample_open(pts, 0.008, closed); rows = []
        for i, p_ in enumerate(pts):
            q, n, _d = S.near(p_); t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]); t = (t - n * t.dot(n)).normalized(); b = n.cross(t)
            if b.z < 0: b = -b
            row = []
            for off, lift in ((-0.013, PB + PT + 0.0004), (-0.013, PB + PT + 0.0036), (0.013, 0.0036), (0.013, 0.0004)):
                q2, n2, _d = S.near(q + b * off); row.append(yb.verts.new(q2 + n2 * lift))
            rows.append(row)
        for i in range(len(rows) - 1):
            for k_ in range(4): yb.faces.new((rows[i][k_], rows[i][(k_ + 1) % 4], rows[i + 1][(k_ + 1) % 4], rows[i + 1][k_]))
    bmesh.ops.recalc_face_normals(yb, faces=yb.faces)
    if 'SUR_Cuirass_Yoke' in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects['SUR_Cuirass_Yoke'])
    yo = obj_from(yb, 'SUR_Cuirass_Yoke', M_LEATH)
    report2('yoke band -> cuirass base', [v.co for v in yo.data.vertices], S); report2('yoke band -> kaftan', [v.co for v in yo.data.vertices], K)
def lam_on(sh, f, zt, names, avoid, tag, reports, lev0=None, drop_at_rim=False, ps=1.0, pt=None):
    """rows of plates on the surface sh along the level lines of f (distance up from the hem); avoid = [(Surf, least distance)]"""
    PT_ = PT if pt is None else pt      # plate thickness
    S = Surf(sh); ROW_, PW_, PP_, PH_ = ROW * ps, PW * ps, PPITCH * ps, PH * ps      # plate size scale
    for n_ in names:
        if n_ in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n_])
    bm = bmesh.new(); lb = bmesh.new(); rng = random.Random(7); nrow = 0; npl = 0; skipped = 0; rows_dev = []
    VS = (0.0, 0.34, 0.68, 1.0)
    lev = PH_ + 0.004 if lev0 is None else lev0
    while lev < max(f) :
        row_in = []
        for pts, closed in iso_lines(sh, f, lev):
            if len(pts) < 4: continue
            pts = [S.near(p)[0] for p in (smooth_closed(pts, 3) if closed else pts)]
            run = []
            cs = resample_open(pts, PP_, closed)
            if not closed and len(cs) >= 2:      # open rows overrun both rims by two plates; the overrun is clipped onto the rim
                t0 = (cs[0] - cs[1]).normalized(); t1 = (cs[-1] - cs[-2]).normalized()
                cs = [cs[0] + t0 * PP_ * 2, cs[0] + t0 * PP_] + cs + [cs[-1] + t1 * PP_, cs[-1] + t1 * PP_ * 2]
            for i, p in enumerate(cs):
                q0, n0, _d = S.near(p)
                a = cs[i - 1] if (i > 0 or closed) else cs[i]; b = cs[(i + 1) % len(cs)] if (i < len(cs) - 1 or closed) else cs[i]
                t = (b - a); t = (t - n0 * t.dot(n0)).normalized(); down = n0.cross(t)
                if down.z > 0: down = -down; t = -t
                if p.z > zt + PH_ * 0.8: run = lace_run(lb, run); continue
                ok = True; inner = []; outer = []; nedge = 0; nclip = 0
                for v in VS:
                    for u in (-0.5, -0.17, 0.17, 0.5):
                        P = p + t * (u * PW_) + down * (v * PH_ - PH_ * 0.0); q, n, _d = S.near(P)
                        if S.at_edge(q, 0.0015): nedge += 1
                        if q.z > zt: q2, n2, _d2 = S.near(Vector((q.x, q.y, zt)) + n * 0.002); q, n = (q2, n2) if q2 is not None else (q, n); nclip += 1
                        dome = 0.0006 * (1 - (2 * u) ** 2)                      # plates are slightly domed across
                        lift = PA + (PB - PA - 0.0007) * v + 0.0007 * (u + 0.5)      # every plate's one side lies over its neighbour (they overlap sideways too)
                        inner.append(q + n * lift); outer.append(q + n * (lift + PT_ + dome))
                if nedge > (2 if drop_at_rim else 14) or nclip > 11: ok = False      # drop_at_rim: curved rims (pauldrons, aventail) keep a clean leather margin instead of clipped slivers      # nothing of this plate is left inside the field
                if ok and any(min(A_.sd(o) for o in outer) < lim for A_, lim in avoid): ok = False      # no room: the sleeve / the arm is there
                if not ok: skipped += 1; run = lace_run(lb, run); continue
                vi = [bm.verts.new(c) for c in inner]; vo = [bm.verts.new(c) for c in outer]
                ti = rng.randrange(40); tu0, tv0 = (ti % ATLAS_COLS) * TILE_W, (ti // ATLAS_COLS) * TILE_H      # one of the 40 baked plate variants
                UV = [(tu0 + TILE_W * (0.06 + (0.10 + 0.80 * c / 3) * 0.40), tv0 + TILE_H * (0.04 + (0.08 + 0.74 * (1 - VS[r])) * 0.92)) for r in range(4) for c in range(4)]
                def q(ix, uvx): fuv(bm, [(vo if o_ else vi)[j] for o_, j in ix], [UV[j] for j in uvx])
                for r in range(3):
                    for c in range(3):
                        i0 = r * 4 + c; q([(1, i0), (1, i0 + 1), (1, i0 + 5), (1, i0 + 4)], (i0, i0 + 1, i0 + 5, i0 + 4))
                for r in range(3):
                    q([(0, r * 4), (1, r * 4), (1, r * 4 + 4), (0, r * 4 + 4)], (r * 4, r * 4, r * 4 + 4, r * 4 + 4)); q([(1, r * 4 + 3), (0, r * 4 + 3), (0, r * 4 + 7), (1, r * 4 + 7)], (r * 4 + 3, r * 4 + 3, r * 4 + 7, r * 4 + 7))
                for c in range(3):
                    q([(0, c + 1), (1, c + 1), (1, c), (0, c)], (c + 1, c + 1, c, c)); q([(0, 12 + c), (1, 12 + c), (1, 13 + c), (0, 13 + c)], (12 + c, 12 + c, 13 + c, 13 + c))
                npl += 1; row_in += inner
                if nedge > 5 or nclip > 5: run = lace_run(lb, run); continue
                qa, na, _d = S.near(p + down * (0.2 * PH_)); run.append(qa + na * (PA + (PB - PA) * 0.2 + PT_ + 0.0006 + 0.0011))
            lace_run(lb, run, closed and len(run) == len(cs))
        if row_in:
            d = [S.sd(c) for c in row_in]; rows_dev.append((lev, min(d), max(d), sum(c.z for c in row_in) / len(row_in), len(row_in) // 16)); nrow += 1
        lev += ROW_
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bmesh.ops.recalc_face_normals(lb, faces=lb.faces)
    lam = obj_from(bm, names[0], M_IRON); lace = obj_from(lb, names[1], M_LEATH)
    for p_ in lam.data.polygons: p_.use_smooth = False
    print(tag + ' lamellae: rows %d, plates %d, left out at rims / creases %d, row pitch %.0f mm, plate %.1f x %.1f mm, overlap %.0f %%' % (nrow, npl, skipped, ROW_ * 1000, PW_ * 1000, PH_ * 1000, (1 - ROW_ / PH_) * 100))
    for lev, lo, hi, zz, n_ in rows_dev: print('ROW_ at %3.0f mm along the surface (mean height %.3f m): %3d plates, inner face to shell %+.1f .. %+.1f mm' % (lev * 1000, zz, n_, lo * 1000, hi * 1000))
    P = [v.co for v in lam.data.vertices]
    for rn, RS in reports: report2('plates -> ' + rn, P, RS, ZONES() if 'cuirass' in tag else None)
    for rn, RS in reports[:2]: report2('laces -> ' + rn, [v.co for v in lace.data.vertices], RS)
    return lam, lace
def lace_run(lb, run, closed=False):
    """a leather thong over a run of neighbouring plates"""
    if len(run) >= 2:
        r, seg = 0.0011, 5; rings = []; n = len(run)
        for i, p in enumerate(run):
            a = run[i - 1] if (i > 0 or closed) else run[i]; b = run[(i + 1) % n] if (i < n - 1 or closed) else run[i]
            t = (b - a).normalized(); up = Vector((0, 0, 1)); s_ = t.cross(up)
            s_ = s_.normalized() if s_.length > 1e-6 else Vector((1, 0, 0)); u2 = s_.cross(t)
            rings.append([lb.verts.new(p + (s_ * math.cos(2 * math.pi * k / seg) + u2 * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
        v0, v1 = TRIM['cord']; u = 0.0
        for i in range(n - (0 if closed else 1)):
            a, b = rings[i], rings[(i + 1) % n]; u1 = u + (run[(i + 1) % n] - run[i]).length / 0.60
            for k in range(seg): fuv(lb, (a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]), ((u, v0 + (v1 - v0) * k / seg), (u, v0 + (v1 - v0) * (k + 1) / seg), (u1, v0 + (v1 - v0) * (k + 1) / seg), (u1, v0 + (v1 - v0) * k / seg)))
            u = u1
    return []

def hull2(pts):
    pts = sorted(set((round(a, 4), round(b, 4)) for a, b in pts))
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    up = []
    for p in reversed(pts):
        while len(up) >= 2 and cr(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]
def ray_poly(h, ox, oy, dx, dy):
    """distance from (ox, oy) along (dx, dy) to the convex polygon h's boundary"""
    best = 0.0
    for i in range(len(h)):
        ax, ay = h[i - 1]; bx, by = h[i]; ex, ey = bx - ax, by - ay; den = dx * ey - dy * ex
        if abs(den) < 1e-12: continue
        t = ((ax - ox) * ey - (ay - oy) * ex) / den; u = ((ax - ox) * dy - (ay - oy) * dx) / den
        if t > 0 and -1e-9 <= u <= 1 + 1e-9: best = max(best, t)
    return best
NT = 144
def ang_dir(k): a = 2 * math.pi * k / NT; return Vector((math.sin(a), -math.cos(a), 0))      # k = 0: straight ahead (front, -y), then round by the left side
def smooth_ring(r, it=2, keep_max=True):
    for _ in range(it):
        s_ = [(r[i - 1] + 2 * r[i] + r[(i + 1) % len(r)]) / 4 for i in range(len(r))]
        r = [max(a, b) for a, b in zip(r, s_)] if keep_max else s_
    return r
def loft(bm, rings, closed=True):
    vr = [[bm.verts.new(p) for p in ring] for ring in rings]; n = len(vr[0]); mid = rings[len(rings) // 2]; U = [0.0]
    for i in range(n): U.append(U[-1] + (mid[(i + 1) % n] - mid[i]).length)
    V = [0.0]
    for j in range(len(rings) - 1): V.append(V[-1] + (rings[j + 1][0] - rings[j][0]).length)
    for j in range(len(vr) - 1):
        for i in range(n if closed else n - 1):
            fuv(bm, (vr[j][i], vr[j][(i + 1) % n], vr[j + 1][(i + 1) % n], vr[j + 1][i]), ((U[i], -V[j]), (U[i + 1], -V[j]), (U[i + 1], -V[j + 1]), (U[i], -V[j + 1])))
    return vr
def envelope(objs, z, yax, rmax=0.30):
    """radius of the outermost of the given layers seen from the body's axis, per direction"""
    o = Vector((0, yax, z)); out = []
    for k in range(NT):
        d = ang_dir(k); far = 0.0
        for t in objs:
            p0 = o.copy()
            for _ in range(10):
                h = t.ray_cast(p0, d, rmax)
                if h[0] is None: break
                r = (h[0] - o).length
                if r > rmax: break
                far = max(far, r); p0 = h[0] + d * 1e-4
        out.append(far)
    return out

def stage4():
    names = ('SUR_WaistGuard', 'SUR_WaistGuard_Trim', 'SUR_Belt', 'SUR_Belt_Gold', 'SUR_Coat', 'SUR_Coat_Border', 'SUR_Tassets_Backing', 'SUR_Tassets_Trim', 'SUR_Tassets_Lamellar', 'SUR_Tassets_Lace')
    for n_ in names:
        if n_ in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n_])
    kaft = bpy.data.objects['SUR_Robe_Torso']; trou = bpy.data.objects['SUR_Trousers']; shell = bpy.data.objects['SUR_Cuirass_Backing']
    K = Surf(kaft); BD = Surf(body); TR = Surf(trou); yax = bone('pelvis').y
    z_hem = min(v.co.z for v in shell.data.vertices)                       # the cuirass's lower edge
    layers = [bvh_of(bpy.data.objects[n_]) for n_ in ('SUR_Robe_Torso', 'SUR_Trousers', 'SUR_Cuirass_Backing', 'SUR_Cuirass_Lamellar', 'SUR_Cuirass_Lace')]
    # ---- kaftan skirt: hangs from the waist over the hips and both thighs to the knee (cloth: convex round the legs, never
    #      narrower than higher up), slightly flared
    z_top = z_hem - 0.005; z_kn = float(os.environ.get('SUR_SKIRT_HEM', '0.345')); tv = [v.co for v in trou.data.vertices]; kv = [v.co for v in kaft.data.vertices]
    zs = []; z = z_top
    while z > z_kn: zs.append(z); z -= 0.0125
    zs.append(z_kn); R = []; R0 = []; AMP = []; run = [0.0] * NT; env = [0.0] * NT
    for z in zs:
        P2 = [(p.x, p.y) for p in tv if abs(p.z - z) < 0.014] + [(p.x, p.y) for p in kv if abs(p.z - z) < 0.014 and abs(p.x) < 0.27]      # (not the sleeves)
        h = hull2(P2); r = [ray_poly(h, 0.0, yax, ang_dir(k).x, ang_dir(k).y) + 0.0035 for k in range(NT)]
        # gravity: cloth hangs PLUMB from the widest point above it (never follows the body back in under the hip / seat),
        # falling very slightly inward; long folds deepen toward the hem; it only gives way where the legs are in its path
        run = [max(a, b) for a, b in zip(run, r)]; tz = (z_top - z) / (z_top - z_kn); here = smooth_ring(r, 2)
        plumb = [a * (1.0 - 0.03 * tz) for a in smooth_ring(run, 2)]; A = 0.010 + 0.042 * max(0.0, (tz - 0.62) / 0.38) ** 1.3      # shallow under the armour panels, deep free folds below them
        row = [max(here[k], plumb[k] * (1 + A * math.sin(13 * 2 * math.pi * k / NT + 2.2 * math.sin(3 * 2 * math.pi * k / NT) + 1.3 * tz))) for k in range(NT)]
        R.append(row); env = [max(a, b) for a, b in zip(env, row)]; R0.append(smooth_ring(env, 3)); AMP.append(A)
    # an OPEN riding-coat skirt: four flaps hanging free, split at the front centre (up to the crotch), at both sides and
    # at the back; the splits open toward the hem, the legs show between the flaps
    SL = [(0.0, 0.115), (90.0, 0.040), (180.0, 0.070), (270.0, 0.040)]; z_s = bone('pelvis').z - 0.05
    def gap(gm, z): return gm * max(0.0, (z_s - z) / (z_s - z_kn)) ** 0.8
    sb = bmesh.new(); hb = bmesh.new()
    for fi in range(4):
        a0, g0 = SL[fi]; a1, g1 = SL[(fi + 1) % 4]; c0 = int(round(a0 / 360 * NT)); c1 = int(round((a1 if a1 > a0 else a1 + 360) / 360 * NT)); ncol = c1 - c0; rings = []
        for j, z in enumerate(zs):
            ring = []
            for i in range(ncol + 1):
                a_ = 2 * math.pi * (c0 + i) / NT + gap(g0, z) * max(0.0, 1 - i / 6.0) - gap(g1, z) * max(0.0, 1 - (ncol - i) / 6.0)
                zz = z - (0.006 * (1 + math.sin(7 * a_ + 1.0)) if j == len(zs) - 1 else 0.0)      # a hem that is not ruler-straight
                ring.append(Vector((0, yax, zz)) + Vector((math.sin(a_), -math.cos(a_), 0)) * R[j][(c0 + i) % NT])
            rings.append(ring)
        loft(sb, rings, closed=False)
        per = rings[0][:] + [r_[-1] for r_ in rings[1:]] + rings[-1][-2::-1] + [r_[0] for r_ in rings[-2:0:-1]]
        tube_along(hb, resample(per, 0.01), lambda p: Vector((p.x, p.y - yax, 0)).normalized(), r=0.0035)
    bmesh.ops.recalc_face_normals(sb, faces=sb.faces); sb.normal_update()
    if sum(f.normal.dot(Vector((f.calc_center_median().x, f.calc_center_median().y - yax, 0))) for f in sb.faces) < 0: bmesh.ops.reverse_faces(sb, faces=sb.faces)
    coat = obj_from(sb, 'SUR_Coat', M_KAFT); CO = Surf(coat); bmesh.ops.recalc_face_normals(hb, faces=hb.faces)
    obj_from(hb, 'SUR_Coat_Border', M_LEATH)
    def Rs(z, k):      # the radius things hanging over the skirt take: outside its folds
        j = min(range(len(zs)), key=lambda j_: abs(zs[j_] - z)); return R0[j][k]      # (the widest the skirt has been down to here: panels hang plumb outside it)
    # ---- waist guard: a wide stiff leather band, tight over the cuirass's lower rows above and the kaftan / skirt below
    g_top = z_hem + 0.055; g_bot = z_hem - 0.090; gz = [g_top - (g_top - g_bot) * i / 10 for i in range(11)]; G = []
    for z in gz:
        r = envelope(layers, z, yax); r = [max(a, Rs(z, k) if z < z_top else 0.0) + 0.0025 for k, a in enumerate(r)]
        G.append(smooth_ring(r, 3))
    # stiff leather: no ripples from row to row
    for _ in range(2): G = [[max(G[j][k], (G[max(j - 1, 0)][k] + 2 * G[j][k] + G[min(j + 1, len(G) - 1)][k]) / 4) for k in range(NT)] for j in range(len(G))]
    def gshape(k): c_ = max(0.0, -ang_dir(k).y) ** 8; return g_top + 0.018 * c_, g_bot - 0.042 * c_      # front centre: higher top edge, pointed lower edge
    wb = bmesh.new(); grings = [[Vector((0, yax, gshape(k)[0] + (gshape(k)[1] - gshape(k)[0]) * j / 10)) + ang_dir(k) * (G[j][k] + 0.007 * max(0.0, -ang_dir(k).y) ** 8 * (j / 10)) for k in range(NT)] for j, z in enumerate(gz)]
    loft(wb, grings); bmesh.ops.recalc_face_normals(wb, faces=wb.faces); wg = obj_from(wb, 'SUR_WaistGuard', M_LEATH)
    tb = bmesh.new()
    for ring in (grings[0], grings[-1]): tube_along(tb, ring, lambda p: Vector((p.x, p.y - yax, 0)).normalized(), r=0.0035)
    bmesh.ops.recalc_face_normals(tb, faces=tb.faces); obj_from(tb, 'SUR_WaistGuard_Trim', M_LEATH)
    # ---- belt with gold plaques over the middle of the guard
    b_c = (g_top + g_bot) / 2 + 0.005; bh = 0.024
    def Gr(z, k):
        t = (g_top - z) / (g_top - g_bot) * 10; j = int(max(0, min(9, math.floor(t)))); f_ = t - j; return G[j][k] * (1 - f_) + G[j + 1][k] * f_
    bb = bmesh.new(); prof = ((bh, 0.0012), (bh, 0.0042), (-bh, 0.0042), (-bh, 0.0012)); brs = []
    for k in range(NT): brs.append([bb.verts.new(Vector((0, yax, b_c + dz)) + ang_dir(k) * (Gr(b_c + dz, k) + dr)) for dz, dr in prof])
    for k in range(NT):
        for i in range(4): bb.faces.new((brs[k][i], brs[k][(i + 1) % 4], brs[(k + 1) % NT][(i + 1) % 4], brs[(k + 1) % NT][i]))
    bmesh.ops.recalc_face_normals(bb, faces=bb.faces); belt = obj_from(bb, 'SUR_Belt', M_LEATH)
    gb = bmesh.new(); PLQ = []
    def plaque(k, w, h, th=0.004):
        d = ang_dir(k); t = Vector((-d.y, d.x, 0)); c = Vector((0, yax, b_c)); vs = []
        PLQ.append([list(c + d * (Gr(b_c, k) + 0.0043 + th)), w / 2, w > 0.05])
        for lift in (0.0043, 0.0043 + th):
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                inset = 0.0025 if lift > 0.005 else 0.0
                P = c + Vector((0, 0, sv * (h / 2 - inset)))
                kk = (k + su * (w / 2 - inset) / (2 * math.pi * Gr(b_c, k) / NT)) % NT; k0 = int(math.floor(kk)) % NT; f_ = kk - math.floor(kk)
                dd = (ang_dir(k0) * (1 - f_) + ang_dir((k0 + 1) % NT) * f_).normalized(); rr = Gr(P.z, k0) * (1 - f_) + Gr(P.z, (k0 + 1) % NT) * f_
                vs.append(gb.verts.new(Vector((0, yax, P.z)) + dd * (rr + lift)))
        for i in range(4): gb.faces.new((vs[i], vs[(i + 1) % 4], vs[4 + (i + 1) % 4], vs[4 + i]))
        gb.faces.new(vs[4:8])
    plaque(0, 0.075, 0.058, 0.006)
    for a in (26, 48, 70, 92, 114, 136, 158, 180, -26, -48, -70, -92, -114, -136, -158): plaque(int(round(a / 360 * NT)) % NT, 0.036, 0.036)
    bmesh.ops.recalc_face_normals(gb, faces=gb.faces); gold = obj_from(gb, 'SUR_Belt_Gold', M_GOLD)
    # ---- lamellar skirt panels hanging from under the guard, lying on the kaftan skirt (leather backing + bound edges + plates)
    t_top = g_bot + 0.025; panels = [(0, 31, 0.365, True), (62, 33, 0.47, False), (-62, 33, 0.47, False), (128, 29, 0.47, False), (-128, 29, 0.47, False), (180, 22, 0.40, True)]      # centre: tip at 0.73 of belt-to-knee, 0.52 of the hip width; sides to 0.93 (measured on the ref)
    pb = bmesh.new(); pt_ = bmesh.new(); pan_objs = []
    for ci, (cdeg, hw, ln, pointed) in enumerate(panels):
        one = bmesh.new(); k0 = int(round((cdeg - hw) / 360 * NT)); k1 = int(round((cdeg + hw) / 360 * NT)); cols = list(range(k0, k1 + 1)); nz = int(ln / 0.0125) + 1; rings_ = []
        for j in range(nz + 1):
            ring = []
            for ii, k in enumerate(cols):
                u = (ii / (len(cols) - 1)) * 2 - 1; L = ln * (1 - 0.22 * abs(u)) if pointed else ln; z = t_top - L * j / nz
                ring.append(Vector((0, yax, z)) + ang_dir(k % NT) * (Rs(z, k % NT) + 0.0045))
            rings_.append(ring)
        loft(one, rings_, closed=False); bmesh.ops.recalc_face_normals(one, faces=one.faces); one.normal_update()
        if sum(f.normal.dot(Vector((f.calc_center_median().x, f.calc_center_median().y - yax, 0))) for f in one.faces) < 0: bmesh.ops.reverse_faces(one, faces=one.faces)
        border = rings_[0] + [r_[-1] for r_ in rings_[1:]] + rings_[-1][-2::-1] + [r_[0] for r_ in rings_[-2:0:-1]]
        tube_along(pt_, resample(border, 0.008), lambda p: Vector((p.x, p.y - yax, 0)).normalized(), r=0.0045, lift=0.0)
        md = bpy.data.meshes.new('pan%d' % ci); one.to_mesh(md); one.free(); po = bpy.data.objects.new('SUR_TassetPanel_%d' % ci, md); bpy.context.scene.collection.objects.link(po); md.materials.append(M_LEATH); pan_objs.append(po)
    bmesh.ops.recalc_face_normals(pt_, faces=pt_.faces); obj_from(pt_, 'SUR_Tassets_Trim', M_LEATH)
    # plates on every panel (rows level: the panels hang straight), then everything joined
    lams = []; laces = []
    for ci, po in enumerate(pan_objs):
        zmin = min(v.co.z for v in po.data.vertices); f = [v.co.z - zmin for v in po.data.vertices]
        lam, lace = lam_on(po, f, 99.0, ('SUR_TL_%d' % ci, 'SUR_TC_%d' % ci), [], 'STAGE 4 skirt panel %d' % ci, [('panel', Surf(po)), ('kaftan skirt', CO)], lev0=PH + 0.012)
        lams.append(lam); laces.append(lace)
    def join(obs, name):
        bj = bmesh.new()
        for o in obs: bj.from_mesh(o.data)
        mats = obs[0].data.materials[0]
        for o in obs: bpy.data.objects.remove(o)
        return obj_from(bj, name, mats)
    tl = join(lams, 'SUR_Tassets_Lamellar'); join(laces, 'SUR_Tassets_Lace'); tbk = join(pan_objs, 'SUR_Tassets_Backing')
    for p_ in tl.data.polygons: p_.use_smooth = False
    json.dump({'g_top': g_top, 'g_bot': g_bot, 'belt_z': b_c, 'belt_h': bh, 'yax': yax, 'plaques': PLQ, 'skirt_top': z_top, 'skirt_hem': z_kn}, open(os.path.join(OUT, 'armor_c_meta.json'), 'w'), indent=1)
    # ---- reports
    print('STAGE 4: skirt rings %d (z %.3f .. %.3f), waist guard z %.3f .. %.3f, belt at %.3f, panels %d' % (len(zs), z_top, z_kn, g_bot, g_top, b_c, len(panels)))
    LAM = Surf(bpy.data.objects['SUR_Cuirass_Lamellar']); CS = Surf(shell); WG = Surf(wg)
    report2('kaftan skirt -> trousers', [v.co for v in coat.data.vertices], TR)
    report2('kaftan skirt -> body', [v.co for v in coat.data.vertices], BD)
    P = [v.co for v in wg.data.vertices]
    report2('waist guard -> kaftan (below the cuirass)', [p for p in P if p.z < z_hem - 0.004], K)
    report2('waist guard -> kaftan skirt', [p for p in P if p.z < z_top - 0.004], CO)
    report2('waist guard -> cuirass plates', [p for p in P if p.z > z_hem + 0.008], LAM)
    report2('waist guard -> cuirass base', [p for p in P if p.z > z_hem + 0.008], CS)
    report2('belt -> waist guard', [v.co for v in belt.data.vertices], WG)
    report2('gold plaques -> waist guard', [v.co for v in gold.data.vertices], WG)
    report2('panel backing -> kaftan skirt', [v.co for v in tbk.data.vertices], CO)
    report2('panel plates -> kaftan skirt', [v.co for v in tl.data.vertices], CO)
    report2('panel backing -> trousers', [v.co for v in tbk.data.vertices], TR)

def clear_of(pts_fn, surfs, least, it=4):
    """push points out until they are at least `least` outside every given surface"""
    n_ = 0
    for _ in range(it):
        moved = 0
        for v in pts_fn():
            for S_ in surfs:
                q, n, d = S_.near(v.co)
                if q is not None and (v.co - q).length < 0.03 and d < least: v.co = q + n * (least + 0.0003); moved += 1
        n_ += moved
        if not moved: break
    return n_
def stage5():
    names = ('SUR_Pauldron_Backing', 'SUR_Pauldron_Trim', 'SUR_Pauldron_Lamellar', 'SUR_Pauldron_Lace', 'SUR_Bracer', 'SUR_Bracer_Gold', 'SUR_Bracer_Straps')
    for n_ in names:
        if n_ in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n_])
    K = Surf(bpy.data.objects['SUR_Robe_Torso']); BD = Surf(body)
    under = [Surf(bpy.data.objects[n_]) for n_ in ('SUR_Cuirass_Backing', 'SUR_Cuirass_Trim', 'SUR_Cuirass_Lamellar', 'SUR_Cuirass_Straps', 'SUR_Cuirass_Yoke', 'SUR_Robe_Trim') if n_ in bpy.data.objects]
    Zu = Vector((0, 0, 1)); pads = []; trims = bmesh.new(); lam_all = []; lace_all = []
    for s_ in 'lr':
        ua = bone('upperarm_' + s_); la = bone('lowerarm_' + s_); d = (la - ua).normalized(); w = (Zu - d * Zu.dot(d)).normalized(); L = (la - ua).length
        T0, T1 = -0.080, 0.62 * L
        def keep(i, p, ua=ua, d=d, w=w, T0=T0, T1=T1):
            t = (p - ua).dot(d)
            if not (T0 - 0.03 < t < T1 + 0.03) or HEADW[i] > 0.3: return False
            rad = (p - ua) - d * t; r = rad.length
            if r > 0.19: return False
            return r < 1e-6 or rad.dot(w) / r > math.cos(math.radians(150 if t > 0.02 else 80))
        bm = body_sheet(keep)
        for v in bm.verts: v.co += v.normal * (KAFT + 0.008)
        for v in bm.verts:      # a stiff cap that flares away from the arm toward its lower rim
            t_ = (v.co - ua).dot(d)
            if t_ > 0:
                rad_ = (v.co - ua) - d * t_
                if rad_.length > 1e-6: v.co += rad_.normalized() * 0.032 * (t_ / T1) ** 1.5
        inner = [v for v in bm.verts if not v.is_boundary]
        for _ in range(3): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        smooth_boundary(bm, 14)
        cut(bm, ua + d * T1, d); cut(bm, ua + d * T0, -d)
        # a stiff cap: tight on the sleeve at its lower end, clear of the cuirass, its straps and bindings over the shoulder
        clear_of(lambda: bm.verts, [K], 0.0045); n1 = clear_of(lambda: bm.verts, under, 0.0015, 6)
        inner = [v for v in bm.verts if not v.is_boundary]
        for _ in range(6):
            bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            clear_of(lambda: bm.verts, [K], 0.0045, 1); clear_of(lambda: bm.verts, under, 0.0015, 2)
        clear_of(lambda: bm.verts, [BD], 0.006, 2); clear_of(lambda: bm.verts, [K], 0.0045, 2); clear_of(lambda: bm.verts, under, 0.002, 8)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
        if sum((f.calc_center_median() - K.near(f.calc_center_median())[0]).dot(f.normal) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.normal_update()
        lps = loops_of(bm); md = bpy.data.meshes.new('pad' + s_); bm.to_mesh(md); bm.free()
        po = bpy.data.objects.new('SUR_Pad_' + s_, md); bpy.context.scene.collection.objects.link(po); md.materials.append(M_LEATH); PS = Surf(po)
        for lp in lps:
            pts = [PS.near(p)[0] for p in smooth_closed(resample(lp, 0.012), 14)]      # a fair rim curve (the cap's corners are rounded off, no crossed binding)
            tube_along(trims, pts, lambda p, PS=PS: PS.near(p)[1], r=0.0065, lift=0.0)
        f = [(ua + d * T1 - v.co).dot(d) for v in po.data.vertices]
        lam, lace = lam_on(po, f, 99.0, ('SUR_PL_' + s_, 'SUR_PC_' + s_), [], 'STAGE 5 pauldron ' + s_, [('pauldron backing', PS), ('kaftan', K)] + [('cuirass layer %d' % i, u_) for i, u_ in enumerate(under[:3])], lev0=PH + 0.010, pt=0.0032)
        pads.append(po); lam_all.append(lam); lace_all.append(lace)
        P = [v.co for v in po.data.vertices]
        report2('pauldron %s backing -> kaftan' % s_, P, K)
        for nm_, u_ in zip(('cuirass base', 'cuirass bindings + straps', 'cuirass plates'), under[:3]): report2('pauldron %s backing -> %s' % (s_, nm_), [p for p in P if (p - u_.near(p)[0]).length < 0.02], u_)
        report2('pauldron %s backing -> body' % s_, P, BD)
    def join(obs, name):
        bj = bmesh.new()
        for o in obs: bj.from_mesh(o.data)
        mats = obs[0].data.materials[0]
        for o in obs: bpy.data.objects.remove(o)
        return obj_from(bj, name, mats)
    pl = join(lam_all, 'SUR_Pauldron_Lamellar'); join(lace_all, 'SUR_Pauldron_Lace'); join(pads, 'SUR_Pauldron_Backing')
    for p_ in pl.data.polygons: p_.use_smooth = False
    bmesh.ops.recalc_face_normals(trims, faces=trims.faces); obj_from(trims, 'SUR_Pauldron_Trim', M_LEATH)
    # ---- bracers: steel vambraces on the forearms over the sleeve, gold-bound ends, two straps
    bb = bmesh.new(); gb = bmesh.new(); sb = bmesh.new(); allv = []
    for s_ in 'lr':
        la = bone('lowerarm_' + s_); ha = bone('hand_' + s_); d = (ha - la).normalized(); L = (ha - la).length; T0, T1 = 0.11 * L, L - 0.048
        def keep(i, p, la=la, d=d, T0=T0, T1=T1):
            t = (p - la).dot(d); rad = (p - la) - d * t
            return T0 - 0.03 < t < T1 + 0.03 and rad.length < 0.13 and HANDW[i] < 0.3
        bm = body_sheet(keep)
        for v in bm.verts: v.co += v.normal * (KAFT + 0.004)
        inner = [v for v in bm.verts if not v.is_boundary]
        for _ in range(8): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        cut(bm, la + d * T1, d); cut(bm, la + d * T0, -d)
        clear_of(lambda: bm.verts, [K], 0.003, 6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.normal_update()
        if sum((f.calc_center_median() - K.near(f.calc_center_median())[0]).dot(f.normal) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.normal_update()
        print('bracer', s_, 'verts', len(bm.verts), 'mean x %.3f' % (sum(v.co.x for v in bm.verts) / max(1, len(bm.verts))), 'elbow', tuple(round(c, 3) for c in la), 'wrist', tuple(round(c, 3) for c in ha))
        lps = loops_of(bm); tmp = bpy.data.meshes.new('br' + s_); bm.to_mesh(tmp); to = bpy.data.objects.new('tmp_br', tmp); BS = Surf(to)
        for lp in lps:
            pts = [BS.near(p)[0] for p in smooth_closed(resample(lp, 0.008), 2)]
            tube_along(gb, pts, lambda p, BS=BS: BS.near(p)[1], r=0.0045, lift=0.0)
        for tt in (T0 + 0.30 * (T1 - T0), T0 + 0.70 * (T1 - T0)):      # straps round the forearm
            o = la + d * tt; e1 = d.cross(Vector((0, 0, 1))).normalized(); e2 = d.cross(e1); rows = []
            for k in range(40):
                a = 2 * math.pi * k / 40; dr = e1 * math.cos(a) + e2 * math.sin(a); h = BS.t.ray_cast(o + dr * 0.3, -dr, 0.3)
                if h[0] is None: continue
                q, n, _d = BS.near(h[0]); qa, na, _d = BS.near(q + d * 0.009); qb, nb_, _d = BS.near(q - d * 0.009); rows.append([sb.verts.new(qa + na * 0.0006), sb.verts.new(qa + na * 0.0032), sb.verts.new(qb + nb_ * 0.0032), sb.verts.new(qb + nb_ * 0.0006)])
            for i in range(len(rows)):
                for k_ in range(4): sb.faces.new((rows[i][k_], rows[i][(k_ + 1) % 4], rows[(i + 1) % len(rows)][(k_ + 1) % 4], rows[(i + 1) % len(rows)][k_]))
        allv += [v.co.copy() for v in bm.verts]; bb.from_mesh(tmp); bm.free(); bpy.data.objects.remove(to)
    for b_ in (bb, gb, sb): bmesh.ops.recalc_face_normals(b_, faces=b_.faces)
    br = obj_from(bb, 'SUR_Bracer', M_IRON); bg = obj_from(gb, 'SUR_Bracer_Gold', M_GOLD); bs = obj_from(sb, 'SUR_Bracer_Straps', M_LEATH)
    report2('bracers -> kaftan sleeve', [v.co for v in br.data.vertices], K); report2('bracers -> body', [v.co for v in br.data.vertices], BD)
    report2('bracer gold bindings -> kaftan sleeve', [v.co for v in bg.data.vertices], K); report2('bracer straps -> bracer', [v.co for v in bs.data.vertices], Surf(br))
    print('STAGE 5 pauldrons + bracers built')

def stage6():
    """helmet (steel bowl, gold brow band, ribs and finial, horse-hair plume) and a lamellar aventail hanging from its rim"""
    names = ('SUR_Helmet_Bowl', 'SUR_Helmet_Gold', 'SUR_Helmet_Plume', 'SUR_Aventail_Backing', 'SUR_Aventail_Trim', 'SUR_Aventail_Lamellar', 'SUR_Aventail_Lace')
    for n_ in names:
        if n_ in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n_])
    BD = Surf(body); K = Surf(bpy.data.objects['SUR_Robe_Torso'])
    hv = [v.co for i, v in enumerate(me.vertices) if HEADW[i] > 0.5]; ztop = max(p.z for p in hv)
    cy = sum(p.y for p in hv if p.z > ztop - 0.10) / max(1, sum(1 for p in hv if p.z > ztop - 0.10))      # skull centre (depth)
    z_rim = ztop - float(os.environ.get('SUR_HELM_RIM', '0.101'))      # brow line, just above the eyebrows
    def head_r(z, pad):
        P2 = [(p.x, p.y) for p in hv if abs(p.z - z) < 0.012]
        if len(P2) < 8: return [pad] * NT
        h = hull2(P2); return [ray_poly(h, 0.0, cy, ang_dir(k).x, ang_dir(k).y) + pad for k in range(NT)]
    r_rim = smooth_ring(head_r(z_rim, 0.017), 4); apex = ztop + 0.064; H = apex - z_rim
    # bowl: from the rim ring up to a pointed apex, never inside the skull (+7 mm)
    NB = 16; rings = []; radii = []
    for j in range(NB + 1):
        t = j / NB; z = z_rim + H * t; prof = max(0.0, 1 - t ** 2.4) ** 0.62 * (1 - 0.10 * t)
        hr = head_r(z, 0.014) if z < ztop + 0.004 else [0.0] * NT
        rr = [max(r_rim[k] * prof, hr[k] if z < ztop else 0.0, 0.006 * (1 - t) + 0.004) for k in range(NT)]
        rr = smooth_ring(rr, 2); radii.append(rr); rings.append([Vector((0, cy, z)) + ang_dir(k) * rr[k] for k in range(NT)])
    hb = bmesh.new(); loft(hb, rings); top = hb.verts.new(Vector((0, cy, apex + 0.004))); hb.verts.ensure_lookup_table()
    last = [v for v in hb.verts if abs(v.co.z - (z_rim + H)) < 1e-6 and v is not top]
    last.sort(key=lambda v: math.atan2(v.co.x, -(v.co.y - cy)) % (2 * math.pi))
    for i in range(len(last)): hb.faces.new((last[i], last[(i + 1) % len(last)], top))
    bmesh.ops.recalc_face_normals(hb, faces=hb.faces); bowl = obj_from(hb, 'SUR_Helmet_Bowl', M_IRON); HB = Surf(bowl)
    # gold: brow band, four ribs to the apex, finial
    gb = bmesh.new(); bw = 0.026
    brs = []
    for k in range(NT):
        row = []
        for dz, lift in ((0.0, 0.0006), (0.0, 0.0034), (bw, 0.0034), (bw, 0.0006)):
            q, n, _d = HB.near(Vector((0, cy, z_rim + dz)) + ang_dir(k) * (r_rim[k] + 0.002)); row.append(gb.verts.new(q + n * lift))
        brs.append(row)
    for k in range(NT):
        for i in range(4): gb.faces.new((brs[k][i], brs[k][(i + 1) % 4], brs[(k + 1) % NT][(i + 1) % 4], brs[(k + 1) % NT][i]))
    for kk in (0, NT // 4, NT // 2, 3 * NT // 4):
        rows = []; d = ang_dir(kk); t_ = Vector((-d.y, d.x, 0))
        for j in range(1, NB):
            p = rings[j][kk]; q, n, _d = HB.near(p); row = []
            for su, lift in ((1, 0.0005), (1, 0.003), (-1, 0.003), (-1, 0.0005)):
                q2, n2, _d = HB.near(q + t_ * su * 0.008); row.append(gb.verts.new(q2 + n2 * lift))
            rows.append(row)
        for i in range(len(rows) - 1):
            for k_ in range(4): gb.faces.new((rows[i][k_], rows[i][(k_ + 1) % 4], rows[i + 1][(k_ + 1) % 4], rows[i + 1][k_]))
    fin = [(0.016, -0.012), (0.019, 0.0), (0.012, 0.010), (0.007, 0.022), (0.009, 0.034), (0.006, 0.046), (0.0045, 0.075)]      # (radius, height above the apex)
    frs = [[gb.verts.new(Vector((0, cy, apex + h_)) + Vector((math.cos(2 * math.pi * k / 12), math.sin(2 * math.pi * k / 12), 0)) * r_) for k in range(12)] for r_, h_ in fin]
    for j in range(len(frs) - 1):
        for k in range(12): gb.faces.new((frs[j][k], frs[j][(k + 1) % 12], frs[j + 1][(k + 1) % 12], frs[j + 1][k]))
    gb.faces.new(frs[-1])
    bmesh.ops.recalc_face_normals(gb, faces=gb.faces); gold = obj_from(gb, 'SUR_Helmet_Gold', M_GOLD)
    # plume: a tapering, backward-curling tail of horse hair from the finial
    pb = bmesh.new(); base = Vector((0, cy, apex + 0.072)); NP = 14; prs = []
    for j in range(NP + 1):
        t = j / NP; c = base + Vector((0, 0.17 * t ** 1.6 + 0.03 * math.sin(t * 3), 0.24 * t - 0.42 * t ** 2.2)); r_ = 0.006 + 0.036 * math.sin(math.pi * min(1.0, t * 1.12)) ** 0.7 * (1 - 0.5 * t)
        prs.append([pb.verts.new(c + Vector((math.cos(2 * math.pi * k / 10) * r_ * 0.75, math.sin(2 * math.pi * k / 10) * r_ * 0.5, math.sin(2 * math.pi * k / 10) * r_ * 0.8))) for k in range(10)])
    for j in range(NP):
        for k in range(10): pb.faces.new((prs[j][k], prs[j][(k + 1) % 10], prs[j + 1][(k + 1) % 10], prs[j + 1][k]))
    pb.faces.new(prs[-1]); bmesh.ops.recalc_face_normals(pb, faces=pb.faces); obj_from(pb, 'SUR_Helmet_Plume', M_TROU)
    # aventail = a lamellar HOOD hanging from the helmet rim: round the cheeks, the sides of the chin and the neck (face
    # open), then out onto the shoulders as a cape-collar. Its surface is the outermost of everything under it + 11 mm,
    # followed DOWN each direction along the surface (so the part lying on the shoulders is sampled evenly too).
    extra = [bvh_of(bpy.data.objects[n_]) for n_ in ('SUR_BodyProxy', 'SUR_Robe_Torso', 'SUR_Robe_Trim', 'SUR_Cuirass_Backing', 'SUR_Cuirass_Trim', 'SUR_Cuirass_Straps', 'SUR_Cuirass_Yoke',
             'SUR_Cuirass_Lamellar', 'SUR_Pauldron_Backing', 'SUR_Pauldron_Lamellar', 'SUR_Pauldron_Trim') if n_ in bpy.data.objects]
    RCAP = float(os.environ.get('SUR_HOOD_R', '0.275')); z_min = bone('neck_01').z - 0.055; prof = [[] for _ in range(NT)]; prev = [r_rim[k] + 0.003 for k in range(NT)]; z = z_rim + 0.004; z_bot = z
    while z > z_min:
        o = Vector((0, cy, z)); need = []
        for k in range(NT):
            d = ang_dir(k); far = 0.0
            for t_ in extra:
                p0 = o.copy()
                for _ in range(8):
                    h = t_.ray_cast(p0, d, 0.30)
                    if h[0] is None: break
                    far = max(far, (h[0] - o).length); p0 = h[0] + d * 1e-4
            need.append(far + 0.011)
        if z < bone('neck_01').z + 0.02 and max(need) > RCAP: break          # the cape-collar ends where the shoulder pieces get this wide
        row = [max(need[k], prev[k] - 0.0032) for k in range(NT)]          # cloth of plates: falls in by at most ~40 degrees, out as far as it must
        for _ in range(2): row = [max(row[k], (row[k - 1] + 2 * row[k] + row[(k + 1) % NT]) / 4) for k in range(NT)]
        for k in range(NT): prof[k].append((row[k], z))
        prev = row; z_bot = z; z -= 0.004
    def along(k, t):
        P = prof[k]; L = [0.0]
        for i in range(1, len(P)): L.append(L[-1] + math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
        d = t * L[-1]; i = 1
        while i < len(L) - 1 and L[i] < d: i += 1
        f_ = (d - L[i - 1]) / max(1e-9, L[i] - L[i - 1]); r = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f_; zz = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f_
        return Vector((0, cy, zz)) + ang_dir(k) * r, L[-1]
    tot = sorted(along(k, 1.0)[1] for k in range(NT))[NT // 2]; NR = max(6, int(tot / 0.011) + 1); NC = 104; ringsA = []
    for j in range(NR):
        t = j / (NR - 1); a0 = math.radians(46.0 if t < 0.42 else 46.0 - 24.0 * (t - 0.42) / 0.58); ring = []      # face opening: cheeks covered, closing in under the chin
        for c in range(NC + 1):
            kf = (a0 + (2 * math.pi - 2 * a0) * c / NC) / (2 * math.pi) * NT; k0 = int(math.floor(kf)) % NT; f_ = kf - math.floor(kf)
            ring.append(along(k0, t)[0].lerp(along((k0 + 1) % NT, t)[0], f_))
        ringsA.append(ring)
    ab = bmesh.new(); loft(ab, ringsA, closed=False); bmesh.ops.recalc_face_normals(ab, faces=ab.faces); ab.normal_update()
    if sum(f.normal.dot(Vector((f.calc_center_median().x, f.calc_center_median().y - cy, 0))) for f in ab.faces) < 0: bmesh.ops.reverse_faces(ab, faces=ab.faces)
    border = ringsA[0] + [r_[-1] for r_ in ringsA[1:]] + ringsA[-1][-2::-1] + [r_[0] for r_ in ringsA[-2:0:-1]]
    av = obj_from(ab, 'SUR_Aventail_Backing', M_LEATH); AV = Surf(av)
    tb = bmesh.new(); tube_along(tb, resample(border, 0.006), lambda p: AV.near(p)[1], r=0.0042, lift=0.0); bmesh.ops.recalc_face_normals(tb, faces=tb.faces); obj_from(tb, 'SUR_Aventail_Trim', M_LEATH)
    ds_ = tot / (NR - 1); f = [(NR - 1 - (i // (NC + 1))) * ds_ for i in range(len(av.data.vertices))]      # distance up from the hem along the hood
    print('hood: %d rings x %d, length along the surface %.0f mm, hem at z %.3f' % (NR, NC + 1, tot * 1000, z_bot))
    lam, lace = lam_on(av, f, 99.0, ('SUR_Aventail_Lamellar', 'SUR_Aventail_Lace'), [], 'STAGE 6 aventail', [('aventail backing', AV), ('body', BD), ('kaftan', K)], lev0=PH * 0.62 + 0.004, ps=0.62)
    for p_ in lam.data.polygons: p_.use_smooth = False
    print('STAGE 6 helmet: rim z %.3f, apex %.3f, head top %.3f, aventail to z %.3f' % (z_rim, apex, ztop, z_bot))
    report2('helmet bowl -> head', [v.co for v in bowl.data.vertices], BD)
    report2('helmet gold -> bowl', [v.co for v in gold.data.vertices if v.co.z < apex - 0.02], HB)
    report2('aventail backing -> body', [v.co for v in av.data.vertices], BD)
    report2('aventail backing -> kaftan', [v.co for v in av.data.vertices if (v.co - K.near(v.co)[0]).length < 0.03], K)
    for n_ in ('SUR_Cuirass_Trim', 'SUR_Pauldron_Backing', 'SUR_Pauldron_Lamellar'):
        if n_ in bpy.data.objects:
            U_ = Surf(bpy.data.objects[n_]); report2('aventail backing -> ' + n_, [v.co for v in av.data.vertices if (v.co - U_.near(v.co)[0]).length < 0.03], U_)

{1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6}.get(STAGE, lambda: print('stage not in this file yet'))()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'armor_C.blend'))
print('SAVED armor_C.blend after stage', STAGE)
