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
def bone(n): return Vector(BON[n]['head'])
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
def tube_along(bm, pts, nrm_fn, r=0.004, seg=6, lift=0.0, fix=None):
    """closed binding: a small round section swept along a closed polyline, sitting on the surface"""
    n = len(pts); rings = []
    for i in range(n):
        p = pts[i]; t = (pts[(i + 1) % n] - pts[i - 1]).normalized(); nn = nrm_fn(p); b = t.cross(nn).normalized(); nn = b.cross(t).normalized()
        c = p + nn * (lift + r * 0.6)
        if fix: c = fix(c, r)
        rings.append([bm.verts.new(c + (nn * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(n):
        a, b_ = rings[i], rings[(i + 1) % n]
        for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], b_[(k + 1) % seg], b_[k]))
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

def stage1():
    with bpy.data.libraries.load(os.path.join(OUT, 'armor_low.blend')) as (f, t):   # the accepted fitted boots and trousers
        t.objects = [n for n in f.objects if ('Trouser' in n or 'Boot' in n) and n not in bpy.data.objects]
    for o in t.objects:
        if o: bpy.context.scene.collection.objects.link(o)
    # the kaftan's upper part ends just above the trousers' band (its skirt, stage 4, hangs from there outside the trousers):
    # the two cloths never share a zone, so there is nothing to tear or flicker at the band
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
        cut(bm, b - d * 0.035, d, lambda c, a=a, d=d, b=b: (c - a).dot(d) > 0.5 * (b - a).length and (c - b).length < 0.30)
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
    for n_ in ('SUR_Cuirass_Backing', 'SUR_Cuirass_Trim'):
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
    tb = bmesh.new(); ne = 0
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
        tube_along(tb, pts, lambda p: S.near(p)[1], r=0.0035, lift=0.0018, fix=clear_k); ne += 1
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
                q, n, _s = S.near(p + b * W * side); row.append(tb.verts.new(q + n * lift))
            rows.append(row)
        for i in range(len(rows) - 1):
            for k in range(4): tb.faces.new((rows[i][k], rows[i][(k + 1) % 4], rows[i + 1][(k + 1) % 4], rows[i + 1][k]))
        for r_ in (rows[0], rows[-1]): tb.faces.new(r_)
    bmesh.ops.recalc_face_normals(tb, faces=tb.faces)
    tr = obj_from(tb, 'SUR_Cuirass_Trim', M_LEATH)
    print('STAGE 2 cuirass base: verts %d, snapped to 6 mm %d, removed in creases %d, edged loops %d' % (len(sh.data.vertices), fixed, len(left), ne))
    P = [v.co for v in sh.data.vertices]
    report2('cuirass base -> kaftan', P, K, ZONES())
    report2('cuirass base -> body', P, BD)
    report2('edging + straps -> kaftan', [v.co for v in tr.data.vertices], K, ZONES())
    report2('edging + straps -> body', [v.co for v in tr.data.vertices], BD)
    report2('edging + straps -> cuirass base', [v.co for v in tr.data.vertices], S, ZONES())
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
            for off, lift in ((-0.009, PB + PT + 0.0004), (-0.009, PB + PT + 0.0034), (0.011, 0.0034), (0.011, 0.0004)):
                q2, n2, _d = S.near(q + b * off); row.append(yb.verts.new(q2 + n2 * lift))
            rows.append(row)
        for i in range(len(rows) - 1):
            for k_ in range(4): yb.faces.new((rows[i][k_], rows[i][(k_ + 1) % 4], rows[i + 1][(k_ + 1) % 4], rows[i + 1][k_]))
    bmesh.ops.recalc_face_normals(yb, faces=yb.faces)
    if 'SUR_Cuirass_Yoke' in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects['SUR_Cuirass_Yoke'])
    yo = obj_from(yb, 'SUR_Cuirass_Yoke', M_LEATH)
    report2('yoke band -> cuirass base', [v.co for v in yo.data.vertices], S); report2('yoke band -> kaftan', [v.co for v in yo.data.vertices], K)
def lam_on(sh, f, zt, names, avoid, tag, reports, lev0=None):
    """rows of plates on the surface sh along the level lines of f (distance up from the hem); avoid = [(Surf, least distance)]"""
    S = Surf(sh)
    for n_ in names:
        if n_ in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n_])
    bm = bmesh.new(); lb = bmesh.new(); rng = random.Random(7); nrow = 0; npl = 0; skipped = 0; rows_dev = []
    VS = (0.0, 0.34, 0.68, 1.0)
    lev = PH + 0.004 if lev0 is None else lev0
    while lev < max(f) :
        row_in = []
        for pts, closed in iso_lines(sh, f, lev):
            if len(pts) < 4: continue
            pts = [S.near(p)[0] for p in (smooth_closed(pts, 3) if closed else pts)]
            run = []
            cs = resample_open(pts, PPITCH, closed)
            for i, p in enumerate(cs):
                q0, n0, _d = S.near(p)
                a = cs[i - 1] if (i > 0 or closed) else cs[i]; b = cs[(i + 1) % len(cs)] if (i < len(cs) - 1 or closed) else cs[i]
                t = (b - a); t = (t - n0 * t.dot(n0)).normalized(); down = n0.cross(t)
                if down.z > 0: down = -down; t = -t
                if p.z > zt + PH * 0.8: run = lace_run(lb, run); continue
                ok = True; inner = []; outer = []; nedge = 0; nclip = 0
                for v in VS:
                    for u in (-0.5, -0.17, 0.17, 0.5):
                        P = p + t * (u * PW) + down * (v * PH - PH * 0.0); q, n, _d = S.near(P)
                        if S.at_edge(q, 0.0015): nedge += 1
                        if q.z > zt: q2, n2, _d2 = S.near(Vector((q.x, q.y, zt)) + n * 0.002); q, n = (q2, n2) if q2 is not None else (q, n); nclip += 1
                        dome = 0.0006 * (1 - (2 * u) ** 2)                      # plates are slightly domed across
                        lift = PA + (PB - PA - 0.0007) * v + 0.0007 * (u + 0.5)      # every plate's one side lies over its neighbour (they overlap sideways too)
                        inner.append(q + n * lift); outer.append(q + n * (lift + PT + dome))
                if nedge > 14 or nclip > 11: ok = False      # nothing of this plate is left inside the field
                if ok and any(min(A_.sd(o) for o in outer) < lim for A_, lim in avoid): ok = False      # no room: the sleeve / the arm is there
                if not ok: skipped += 1; run = lace_run(lb, run); continue
                vi = [bm.verts.new(c) for c in inner]; vo = [bm.verts.new(c) for c in outer]
                for r in range(3):
                    for c in range(3):
                        i0 = r * 4 + c; bm.faces.new((vo[i0], vo[i0 + 1], vo[i0 + 5], vo[i0 + 4]))
                for r in range(3): bm.faces.new((vi[r * 4], vo[r * 4], vo[r * 4 + 4], vi[r * 4 + 4])); bm.faces.new((vo[r * 4 + 3], vi[r * 4 + 3], vi[r * 4 + 7], vo[r * 4 + 7]))
                for c in range(3): bm.faces.new((vi[c + 1], vo[c + 1], vo[c], vi[c])); bm.faces.new((vi[12 + c], vo[12 + c], vo[13 + c], vi[13 + c]))
                npl += 1; row_in += inner
                if nedge > 5 or nclip > 5: run = lace_run(lb, run); continue
                qa, na, _d = S.near(p + down * (0.2 * PH)); run.append(qa + na * (PA + (PB - PA) * 0.2 + PT + 0.0006 + 0.0011))
            lace_run(lb, run, closed and len(run) == len(cs))
        if row_in:
            d = [S.sd(c) for c in row_in]; rows_dev.append((lev, min(d), max(d), sum(c.z for c in row_in) / len(row_in), len(row_in) // 16)); nrow += 1
        lev += ROW
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bmesh.ops.recalc_face_normals(lb, faces=lb.faces)
    lam = obj_from(bm, names[0], M_IRON); lace = obj_from(lb, names[1], M_LEATH)
    for p_ in lam.data.polygons: p_.use_smooth = False
    print(tag + ' lamellae: rows %d, plates %d, left out at rims / creases %d, row pitch %.0f mm, plate %.1f x %.1f mm, overlap %.0f %%' % (nrow, npl, skipped, ROW * 1000, PW * 1000, PH * 1000, (1 - ROW / PH) * 100))
    for lev, lo, hi, zz, n_ in rows_dev: print('ROW at %3.0f mm along the surface (mean height %.3f m): %3d plates, inner face to shell %+.1f .. %+.1f mm' % (lev * 1000, zz, n_, lo * 1000, hi * 1000))
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
        for i in range(n - (0 if closed else 1)):
            a, b = rings[i], rings[(i + 1) % n]
            for k in range(seg): lb.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
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
    vr = [[bm.verts.new(p) for p in ring] for ring in rings]; n = len(vr[0])
    for j in range(len(vr) - 1):
        for i in range(n if closed else n - 1):
            bm.faces.new((vr[j][i], vr[j][(i + 1) % n], vr[j + 1][(i + 1) % n], vr[j + 1][i]))
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
    z_top = z_hem - 0.005; z_kn = bone('calf_l').z - 0.02; tv = [v.co for v in trou.data.vertices]; kv = [v.co for v in kaft.data.vertices]
    zs = []; z = z_top
    while z > z_kn: zs.append(z); z -= 0.0125
    zs.append(z_kn); R = []; run = [0.0] * NT
    for z in zs:
        P2 = [(p.x, p.y) for p in tv if abs(p.z - z) < 0.014] + [(p.x, p.y) for p in kv if abs(p.z - z) < 0.014 and abs(p.x) < 0.27]      # (not the sleeves)
        h = hull2(P2); r = [ray_poly(h, 0.0, yax, ang_dir(k).x, ang_dir(k).y) + 0.0035 for k in range(NT)]
        run = [max(a, b) for a, b in zip(run, r)]; fl = 1.0 + 0.05 * (z_top - z) / (z_top - z_kn)
        R.append([a * fl for a in smooth_ring(run, 2)])
    sb = bmesh.new(); rings = [[Vector((0, yax, z)) + ang_dir(k) * R[j][k] for k in range(NT)] for j, z in enumerate(zs)]
    loft(sb, rings); bmesh.ops.recalc_face_normals(sb, faces=sb.faces)
    coat = obj_from(sb, 'SUR_Coat', M_KAFT); CO = Surf(coat)
    hb = bmesh.new(); tube_along(hb, rings[-1], lambda p: Vector((p.x, p.y - yax, 0)).normalized(), r=0.004); bmesh.ops.recalc_face_normals(hb, faces=hb.faces)
    obj_from(hb, 'SUR_Coat_Border', M_LEATH)
    def Rs(z, k):      # skirt radius at any height
        j = min(range(len(zs)), key=lambda j_: abs(zs[j_] - z)); return R[j][k]
    # ---- waist guard: a wide stiff leather band, tight over the cuirass's lower rows above and the kaftan / skirt below
    g_top = z_hem + 0.045; g_bot = z_hem - 0.085; gz = [g_top - (g_top - g_bot) * i / 10 for i in range(11)]; G = []
    for z in gz:
        r = envelope(layers, z, yax); r = [max(a, Rs(z, k) if z < z_top else 0.0) + 0.0025 for k, a in enumerate(r)]
        G.append(smooth_ring(r, 3))
    # stiff leather: no ripples from row to row
    for _ in range(2): G = [[max(G[j][k], (G[max(j - 1, 0)][k] + 2 * G[j][k] + G[min(j + 1, len(G) - 1)][k]) / 4) for k in range(NT)] for j in range(len(G))]
    wb = bmesh.new(); grings = [[Vector((0, yax, z)) + ang_dir(k) * G[j][k] for k in range(NT)] for j, z in enumerate(gz)]
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
    gb = bmesh.new()
    def plaque(k, w, h, th=0.004):
        d = ang_dir(k); t = Vector((-d.y, d.x, 0)); c = Vector((0, yax, b_c)); vs = []
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
    t_top = g_bot + 0.025; panels = [(0, 17, 0.27, True), (58, 30, 0.33, False), (-58, 30, 0.33, False), (124, 27, 0.33, False), (-124, 27, 0.33, False), (180, 23, 0.29, True)]
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

{1: stage1, 2: stage2, 3: stage3, 4: stage4}.get(STAGE, lambda: print('stage not in this file yet'))()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'armor_C.blend'))
print('SAVED armor_C.blend after stage', STAGE)
