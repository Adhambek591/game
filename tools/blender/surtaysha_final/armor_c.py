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
KAFT, SHELL = 0.0045, 0.006

def mat(name, col, metal=0.0, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*col, 1); m.metallic = metal; m.roughness = rough; m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if b: b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m
M_BODY = mat('C_Skin', (0.55, 0.36, 0.26)); M_KAFT = mat('C_Kaftan', (0.20, 0.12, 0.07), rough=0.9); M_LEATH = mat('C_Leather', (0.16, 0.08, 0.04), rough=0.5)
M_IRON = mat('C_Lamellar', (0.30, 0.31, 0.34), 1.0, 0.38); M_GOLD = mat('C_Gold', (0.85, 0.62, 0.22), 1.0, 0.3); M_TROU = mat('C_Trousers', (0.10, 0.09, 0.08), rough=0.9)
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
def tube_along(bm, pts, nrm_fn, r=0.004, seg=6, lift=0.0):
    """closed binding: a small round section swept along a closed polyline, sitting on the surface"""
    n = len(pts); rings = []
    for i in range(n):
        p = pts[i]; t = (pts[(i + 1) % n] - pts[i - 1]).normalized(); nn = nrm_fn(p); b = t.cross(nn).normalized(); nn = b.cross(t).normalized()
        c = p + nn * (lift + r * 0.6)
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
    cut(bm, Vector((0, 0, Z_COL)), Vector((0, 0, 1)), lambda c: abs(c.x) < 0.16)
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
    # the kaftan lies OVER the trousers' waistband
    tr = bpy.data.objects.get('SUR_Trousers'); over = 0
    if tr:
        tt = bvh_of(tr)
        for v in bm.verts:
            if v.co.z > Z_WAIST + 0.12: continue
            q, n, i, d = tt.find_nearest(v.co)
            if q is not None and d < 0.02 and (v.co - q).dot(n) < 0.0015: v.co = q + n * 0.002; over += 1
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
    def keep(i, p):
        return ARMW[i] < 0.25 and LEGW[i] < 0.5 and HEADW[i] < 0.5 and z_lo - 0.05 < p.z < z_hi + 0.05
    bm = body_sheet(keep)
    for v in bm.verts: v.co += v.normal * (KAFT + SHELL)
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(3): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in inner: v.co += v.normal * 0.0012
    return bm, z_lo, z_hi

def stage2():
    kaft = bpy.data.objects['SUR_Robe_Torso']; kt = bvh_of(kaft)
    bm, z_lo, z_hi = torso_shell_bm()
    neck = Vector((0, bone('neck_01').y, 0)); z_nl = bone('clavicle_l').z + 0.02
    cut(bm, Vector((0, 0, z_lo)), Vector((0, 0, -1)))
    # neck-line: a round opening at the base of the neck
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > z_nl and (Vector((f.calc_center_median().x, f.calc_center_median().y, 0)) - neck).length < 0.10], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # contact: every shell vertex 5..7 mm off the kaftan (never inside it)
    fixed = 0
    for v in bm.verts:
        q, n, i, d = kt.find_nearest(v.co)
        if q is None: continue
        s = (v.co - q).dot(n)
        if s < 0.005 or s > 0.007: v.co = q + n * 0.006; fixed += 1
    lps = loops_of(bm)
    sh = obj_from(bm, 'SUR_Cuirass_Backing', M_LEATH); st = bvh_of(sh)
    tb = bmesh.new(); ne = 0
    for lp in lps:
        if sum(p.z for p in lp) / len(lp) < z_lo + 0.03: continue
        pts = smooth_closed(resample(lp, 0.010), 3)
        pts = [st.find_nearest(p)[0] for p in pts]
        tube_along(tb, pts, lambda p: st.find_nearest(p)[1], r=0.006); ne += 1
    # shoulder straps laid on the shell / kaftan over the middle of each shoulder
    for sx in (1, -1):
        x = sx * (abs(bone('upperarm_l').x) - 0.05); path = []
        y = -0.30
        while y < 0.36:
            h = st.ray_cast(Vector((x, y, 2.2)), Vector((0, 0, -1)), 1.5)
            hk = kt.ray_cast(Vector((x, y, 2.2)), Vector((0, 0, -1)), 1.5)
            best = max([q for q in (h, hk) if q[0] is not None], key=lambda q: q[0].z, default=None)
            if best is not None and best[0].z > z_nl - 0.09: path.append((best[0], best[1]))
            y += 0.008
        if len(path) > 6:
            W, T = 0.022, 0.004; rows = []
            for i, (p, n) in enumerate(path):
                t = (path[min(i + 1, len(path) - 1)][0] - path[max(i - 1, 0)][0]).normalized(); b = t.cross(n).normalized()
                rows.append([tb.verts.new(p + b * W + n * 0.001), tb.verts.new(p + b * W + n * (0.001 + T)), tb.verts.new(p - b * W + n * (0.001 + T)), tb.verts.new(p - b * W + n * 0.001)])
            for i in range(len(rows) - 1):
                for k in range(4): tb.faces.new((rows[i][k], rows[i][(k + 1) % 4], rows[i + 1][(k + 1) % 4], rows[i + 1][k]))
    bmesh.ops.recalc_face_normals(tb, faces=tb.faces)
    tr = obj_from(tb, 'SUR_Cuirass_Trim', M_LEATH)
    print('STAGE 2 cuirass base: verts %d, set to 6 mm %d, edged loops %d' % (len(sh.data.vertices), fixed, ne))
    zones = [('shoulder top (z > clavicle)', lambda p: p.z > bone('clavicle_l').z), ('armhole ring (|x| > 0.17, z > 1.20)', lambda p: abs(p.x) > 0.17 and p.z > 1.20),
             ('upper back (y > 0.05, z > 1.25)', lambda p: p.y > 0.05 and p.z > 1.25), ('sides (|x| > 0.18, z < 1.20)', lambda p: abs(p.x) > 0.18 and p.z < 1.20)]
    report('cuirass base -> kaftan', [v.co for v in sh.data.vertices], kaft, zones)
    report('cuirass base -> body', [v.co for v in sh.data.vertices], body)
    report('edging + straps -> kaftan', [v.co for v in tr.data.vertices], kaft, zones)

{1: stage1, 2: stage2}.get(STAGE, lambda: print('stage not in this file yet'))()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'armor_C.blend'))
print('SAVED armor_C.blend after stage', STAGE)
