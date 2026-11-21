# Layered rebuild of a Meshy/MPFB character (P_*.glb -> L_*.glb). Meshy models are one fused shell (coat = legs, braids glued to
# the back), so cloth and hair cannot move. This pass turns the shell into layers that a game rig can drive:
#   1. SKIRT: the coat below the hips is cut free from the legs at its hem (the faces joining hem and leg are removed) and is
#      weighted to 8 chains of 3 bones around the hips (Skirt0_1 .. Skirt7_3), blending into the hips at the waist;
#      QQSpring in Unity swings them with inertia and pushes them off the thighs (follow-through, overlapping action).
#   2. TROUSERS: under the skirt there was nothing; tapered leg tubes + a pelvis band are added, coloured like the cloth seen
#      below the hem, weighted to hips / thighs / shins.
#   3. BRAIDS: dark hair strands lying on the back are removed from the shell (hole filled) and rebuilt as separate plaited
#      tubes with their own chain (BraidL1..4 / BraidR1..4) parented to the head.
# Run: blender -b --python layered.py -- <in.glb> <out.glb> <out_low.glb> [nobraid] [noskirt]
import bpy, bmesh, sys, math
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]; src, out, out_low = args[:3]; flags = set(args[3:])
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); body = max([o for o in sc.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
Bn = arm.data.bones
def hw(n): return arm.matrix_world @ Bn[n].head_local
up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()
hip = hw('Hips'); LT, RT, LK, RK, LF, RF = hw('LeftUpLeg'), hw('RightUpLeg'), hw('LeftLeg'), hw('RightLeg'), hw('LeftFoot'), hw('RightFoot')
neck, headp = hw('neck'), hw('Head')
H = max((body.matrix_world @ Vector(c)).z for c in body.bound_box) - min((body.matrix_world @ Vector(c)).z for c in body.bound_box)
S = H / 1.75   # size factor
def smooth(a, b, x): t = max(0., min(1., (x - a) / (b - a))) if b != a else (1. if x >= b else 0.); return t * t * (3 - 2 * t)
def dseg(p, a, b):
    ab = b - a; t = max(0., min(1., (p - a).dot(ab) / max(1e-9, ab.length_squared))); return (p - (a + ab * t)).length
def legdist(p): return min(dseg(p, LT, LK), dseg(p, LK, LF), dseg(p, RT, RK), dseg(p, RK, RF))
def legside(p): return 'Left' if (p - hip).dot(rgt) < 0 else 'Right'

me = body.data; mw = body.matrix_world; mwi = mw.inverted()
gidx = {g.name: g.index for g in body.vertex_groups}
def VG(name): return body.vertex_groups[name] if name in gidx else (gidx.__setitem__(name, body.vertex_groups.new(name=name).index) or body.vertex_groups[name])
def getw(v): return {body.vertex_groups[g.group].name: g.weight for g in v.groups if g.weight > 1e-5}
def setw(vi, w):
    v = me.vertices[vi]
    for g in list(v.groups): body.vertex_groups[g.group].remove([vi])
    tot = sum(w.values()) or 1
    for k, x in w.items():
        if x / tot > 1e-4: VG(k).add([vi], x / tot, 'REPLACE')
ARMISH = ('Arm', 'Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky', 'Shoulder')
def armw(w): return sum(x for k, x in w.items() if any(a in k for a in ARMISH))

# texture sampling (base colour image) for colours of the new parts
img = None
for m in me.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links:
                fn = n.inputs['Base Color'].links[0].from_node
                if fn.type == 'TEX_IMAGE': img = fn.image
pix = list(img.pixels[:]) if img else None; IW, IH = img.size if img else (0, 0)
def vcols():
    out = [None] * len(me.vertices)
    if not pix or not me.uv_layers: return out
    uv = me.uv_layers.active.data; acc = [[0., 0., 0., 0] for _ in me.vertices]
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; u_, v_ = uv[li].uv; k = (int((v_ % 1) * (IH - 1)) * IW + int((u_ % 1) * (IW - 1))) * 4
            a = acc[vi]; a[0] += pix[k]; a[1] += pix[k + 1]; a[2] += pix[k + 2]; a[3] += 1
    return [(a[0] / a[3], a[1] / a[3], a[2] / a[3]) if a[3] else None for a in acc]
COL = vcols()
def lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
def mean_col(ids, fallback=(.08, .07, .06)):
    cs = [COL[i] for i in ids if COL[i]]
    if not cs: return fallback
    cs.sort(key=lambda c: c[0] + c[1] + c[2]); cs = cs[len(cs) // 5: len(cs) * 4 // 5] or cs   # trimmed mean
    return tuple(lin(sum(c[j] for c in cs) / len(cs)) for j in range(3))
def material(name, rgb, rough=.8):
    m = bpy.data.materials.new(name); m.use_nodes = True; P = m.node_tree.nodes['Principled BSDF']
    P.inputs['Base Color'].default_value = (*rgb, 1); P.inputs['Roughness'].default_value = rough; return m
def white_colors(obj):
    for ca in me.color_attributes:
        nca = obj.data.color_attributes.new(ca.name, ca.data_type, ca.domain)
        for e in nca.data: e.color = (1, 1, 1, 1)

P = [mw @ v.co for v in me.vertices]; N = len(P)
report = {'H': round(H, 3)}

# ======================= 1. SKIRT =======================
zmid = LK.z + (LT.z - LK.z) * .5
# hanging hands / scabbards reach thigh height in the A-pose: ignore arm-weighted vertices and the closest 2 %
mid_slice = sorted(legdist(P[i]) for i in range(N) if abs(P[i].z - zmid) < .01 * S and armw(getw(me.vertices[i])) < .25)
q02 = mid_slice[len(mid_slice) // 50] if mid_slice else 0
def depth_at(z):
    sl = [(P[i] - hip).dot(fwd) for i in range(N) if abs(P[i].z - z) < .006 * S and armw(getw(me.vertices[i])) < .25]
    return (max(sl) - min(sl)) if len(sl) > 8 else 0
zshin = LK.z - (LK.z - LF.z) * .45
dratio = depth_at(zmid) / max(.01, depth_at(zshin))
fused = mid_slice and (q02 > .055 * S or dratio > 1.35 or 'skirt' in flags) and 'noskirt' not in flags   # (a slit shows trousers near the leg: use the depth too)
report['fused_q02'] = round(q02, 3); report['depth_ratio'] = round(dratio, 2)
newobjs = []
if fused:
    # hem = first height (going down) where the legs show: a vertex closer than leg radius to a leg axis
    # hem = where the front-to-back depth of the slice collapses from the coat to the legs (robust to slits and wide boots)
    def depth(z):
        sl = [(p - hip).dot(fwd) for p in P if abs(p.z - z) < .006 * S and armw(getw(me.vertices[P.index(p)])) < .3] if False else [(p - hip).dot(fwd) for p in P if abs(p.z - z) < .006 * S]
        return (max(sl) - min(sl)) if len(sl) > 8 else 0
    dmid = depth(zmid); z = zmid; hem = None; prev = dmid
    while z > LF.z + .05 * S:
        d = depth(z)
        if d and d < .72 * dmid: hem = z + .015 * S; break
        z -= .01 * S
    hem = hem or LK.z
    ztop = (LT.z + hip.z) * .5
    report['hem'] = round(hem, 3); report['ztop'] = round(ztop, 3)
    RCUT = .075 * S
    # --- cut: remove faces joining leg vertices and coat vertices around the hem
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    dl = bm.verts.layers.deform.verify()
    isleg = {}
    for v in bm.verts:
        p = mw @ v.co
        if hem - .07 * S < p.z < ztop: isleg[v.index] = legdist(p) < RCUT   # whole band: hem ring and the edges of any slit
    zcut = hem - .005 * S
    kill = [f for f in bm.faces if (all(v.index in isleg for v in f.verts) and len({isleg[v.index] for v in f.verts}) > 1 and min((mw @ v.co).z for v in f.verts) > hem + .005 * S)
            or (min((mw @ v.co).z for v in f.verts) < zcut < max((mw @ v.co).z for v in f.verts))]   # slit edges + the hem plane
    bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY'); report['hem_faces_cut'] = len(kill)
    bm.to_mesh(me); bm.free(); me.update()
    P = [mw @ v.co for v in me.vertices]; N = len(P)
    # --- skirt vertices: below the waist band, above the hem, not leg, not arm
    skirt = []
    for i, v in enumerate(me.vertices):
        p = P[i]
        if not (hem - .07 * S < p.z < ztop + .02 * S): continue
        if p.z < hem - .005 * S: continue
        if legdist(p) < RCUT and p.z < ztop - .03 * S: continue   # trousers seen through a slit stay on the legs
        w = getw(v)
        if armw(w) > .25: continue
        skirt.append(i)
    # --- 8 chains
    def ang(p):
        d = p - hip; return math.atan2(d.dot(rgt), d.dot(fwd)) % (2 * math.pi)
    zs = [ztop, ztop - (ztop - hem) / 3, ztop - 2 * (ztop - hem) / 3, hem]
    ring_c = {}
    for z in zs:
        sl = [P[i] for i in skirt if abs(P[i].z - z) < .02 * S]
        c = (sum(sl, Vector()) / len(sl)) if sl else Vector((hip.x, hip.y, z)); c.z = z; ring_c[z] = c
    chains = []
    for k in range(8):
        th = k * math.pi / 4; dk = fwd * math.cos(th) + rgt * math.sin(th); pts = []
        for z in zs:
            c = ring_c[z]; best = 0
            for i in skirt:
                p = P[i]
                if abs(p.z - z) > .025 * S: continue
                d = p - c; d.z = 0
                if d.length < 1e-4: continue
                a = d.normalized().dot(dk)
                if a > math.cos(math.radians(22)): best = max(best, d.dot(dk))
            if best <= 0: best = .14 * S
            pts.append(c + dk * best * .97)
        chains.append(pts)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; inv = arm.matrix_world.inverted()
    for k, pts in enumerate(chains):
        parent = eb['Hips']
        for j in range(3):
            b = eb.new('Skirt%d_%d' % (k, j + 1)); b.head = inv @ pts[j]; b.tail = inv @ pts[j + 1]; b.parent = parent; b.use_connect = False; parent = b
    bpy.ops.object.mode_set(mode='OBJECT')
    # --- weights
    for i in skirt:
        p = P[i]; a = ang(p) / (math.pi / 4); k0 = int(a) % 8; k1 = (k0 + 1) % 8; fa = a - int(a)
        s = max(0., min(1., (ztop - p.z) / max(1e-4, ztop - hem)))
        seg = min(2, int(s * 3)); t = s * 3 - seg
        along = {seg: 1.}
        if t > .5 and seg < 2: along = {seg: 1 - (t - .5), seg + 1: t - .5}
        elif t < .5 and seg > 0: along = {seg: 1 - (.5 - t), seg - 1: .5 - t}
        hipsw = 1 - smooth(0., .22, s)
        w = {'Hips': hipsw}
        for kk, ka in ((k0, 1 - fa), (k1, fa)):
            for j, ja in along.items():
                n = 'Skirt%d_%d' % (kk, j + 1); w[n] = w.get(n, 0) + (1 - hipsw) * ka * ja
        if p.z > ztop - .04 * S:   # keep a little of the old waist weights for a seamless join with the body above
            old = getw(me.vertices[i]); e = smooth(ztop - .04 * S, ztop + .02 * S, p.z)
            w = {kk: w.get(kk, 0) * (1 - e) + old.get(kk, 0) * e for kk in set(w) | set(old)}
        setw(i, w)
    report['skirt_verts'] = len(skirt)

    # ======================= 2. TROUSERS =======================
    below = [i for i in range(N) if hem - .07 * S < P[i].z < hem - .01 * S and legdist(P[i]) < .14 * S]
    rleg = .062 * S
    trouser_rgb = mean_col(below, (.07, .06, .055))
    def skirt_min(z):
        ds = [legdist(P[i]) for i in skirt if abs(P[i].z - z) < .015 * S]
        return min(ds) if ds else 1.
    tb = bmesh.new(); tdl = tb.verts.layers.deform.verify(); tw = {}   # vertex -> weight dict
    SEG = 14
    def ring(center, axis, r, wdict):
        ax = axis.normalized(); x = (rgt - ax * rgt.dot(ax)).normalized(); y = ax.cross(x); vs = []
        for k in range(SEG):
            a = k * 2 * math.pi / SEG; v = tb.verts.new(center + (x * math.cos(a) + y * math.sin(a)) * r); tw[v] = dict(wdict); vs.append(v)
        return vs
    def bridge(r0, r1):
        for k in range(SEG): tb.faces.new((r0[k], r0[(k + 1) % SEG], r1[(k + 1) % SEG], r1[k]))
    zbot = hem - .06 * S
    for side, T, K, F in (('Left', LT, LK, LF), ('Right', RT, RK, RF)):
        rings = []; n = 16
        # path: hip joint -> knee -> down to zbot
        path = [T + (K - T) * (j / 8) for j in range(9)]
        if zbot < K.z: path += [K + (F - K) * (j / 8) for j in range(1, 9) if (K + (F - K) * (j / 8)).z > zbot - .02 * S]
        for j, c in enumerate(path):
            ax = (path[min(j + 1, len(path) - 1)] - path[max(j - 1, 0)])
            u = (T.z - c.z) / max(1e-4, T.z - zbot)
            r = rleg * (1.32 - .32 * min(1, u))
            r = min(r, skirt_min(c.z) - .015 * S) if c.z > hem else r
            r = max(r, rleg * .9)
            if c.z > K.z: kn = smooth(K.z - .05 * S, K.z + .05 * S, c.z); w = {side + 'UpLeg': kn, side + 'Leg': 1 - kn}
            else: w = {side + 'Leg': 1.}
            if c.z > T.z - .08 * S: h = smooth(T.z - .08 * S, T.z + .01 * S, c.z) * .5; w = {kk: x * (1 - h) for kk, x in w.items()}; w['Hips'] = h
            rings.append(ring(c, ax, r, w))
        for a, b in zip(rings, rings[1:]): bridge(a, b)
        tb.faces.new(rings[-1][::-1])
    # pelvis band joining the tops
    half = abs((RT - LT).dot(rgt)) * .5 + rleg * 1.3
    prs = []
    for j, z in enumerate((ztop + .05 * S, ztop, LT.z - .02 * S)):
        vs = []
        for k in range(SEG * 2):
            a = k * 2 * math.pi / (SEG * 2); x, y = math.sin(a), math.cos(a)
            p = Vector((hip.x, hip.y, z)) + rgt * x * half + fwd * y * rleg * 1.6
            v = tb.verts.new(p); lat = x
            tw[v] = {'Hips': .7 if j < 2 else .45, 'RightUpLeg': max(0, lat) * (.3 if j < 2 else .55), 'LeftUpLeg': max(0, -lat) * (.3 if j < 2 else .55)}
            vs.append(v)
        prs.append(vs)
    for a, b in zip(prs, prs[1:]):
        for k in range(SEG * 2): tb.faces.new((a[k], a[(k + 1) % (SEG * 2)], b[(k + 1) % (SEG * 2)], b[k]))
    tb.faces.new(prs[0])
    tmesh = bpy.data.meshes.new('trousers'); tobj = bpy.data.objects.new('trousers', tmesh); sc.collection.objects.link(tobj)
    names = sorted({k for w in tw.values() for k in w});
    for nmx in names: tobj.vertex_groups.new(name=nmx)
    gi = {nmx: i for i, nmx in enumerate(names)}
    for v, w in tw.items():
        tot = sum(w.values()) or 1
        for k, x in w.items():
            if x > 1e-4: v[tdl][gi[k]] = x / tot
    for v in tb.verts: v.co = mwi @ v.co
    bmesh.ops.recalc_face_normals(tb, faces=tb.faces); tb.to_mesh(tmesh); tb.free()
    tobj.matrix_world = mw.copy()
    for p_ in tmesh.polygons: p_.use_smooth = True
    tmesh.materials.append(material('trousers', trouser_rgb, .85)); newobjs.append(tobj)
    report['trousers_rgb'] = [round(c, 3) for c in trouser_rgb]; report['rleg'] = round(rleg, 3)

# ======================= 3. BRAIDS =======================
if 'nobraid' not in flags and COL[0] is not None:
    def lum(c): return .3 * c[0] + .59 * c[1] + .11 * c[2]
    def sat(c): return (max(c) - min(c)) / max(.02, max(c))
    base = [i for i in range(N) if COL[i] and lum(COL[i]) < .05 and sat(COL[i]) < .45 and hip.z + .02 * S < P[i].z < neck.z + .02 * S and armw(getw(me.vertices[i])) < .2]
    back = [i for i in base if (P[i] - neck).dot(fwd) < -.02 * S]
    front = [i for i in base if (P[i] - neck).dot(fwd) > .02 * S and abs((P[i] - neck).dot(rgt)) > .04 * S]   # off the middle line (not a dark breastplate)
    made = []
    groups = []
    for nm_, c_ in (('', back), ('F', front)):
        groups += [(nm_ + 'L', [i for i in c_ if (P[i] - neck).dot(rgt) < 0]), (nm_ + 'R', [i for i in c_ if (P[i] - neck).dot(rgt) >= 0])]
    for side, sel in groups:
        if len(sel) < 60: continue
        zz = sorted(P[i].z for i in sel); zt, zb = zz[int(len(zz) * .97)], zz[int(len(zz) * .02)]
        if zt - zb < .12 * S: continue
        pts = []
        for k in range(6):
            z0 = zt - (zt - zb) * k / 5; sl = [P[i] for i in sel if abs(P[i].z - z0) < (zt - zb) / 10 + .005]
            if not sl: sl = [min((P[i] for i in sel), key=lambda q: abs(q.z - z0))]
            pts.append(sum(sl, Vector()) / len(sl))
        widths = []
        for k in range(6):
            sl = [P[i] for i in sel if abs(P[i].z - pts[k].z) < .015]
            if len(sl) > 3: widths.append(max((q - pts[k]).dot(rgt) for q in sl) - min((q - pts[k]).dot(rgt) for q in sl))
        r0 = max(.014 * S, min(.03 * S, (sorted(widths)[len(widths) // 2] * .5) if widths else .02 * S))
        hair_rgb = mean_col(sel, (.02, .018, .016))
        # remove the relief from the shell and patch the hole
        bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
        selset = set(i for i in sel if min(dseg(P[i], pts[k], pts[k + 1]) for k in range(5)) < r0 * 1.8)
        kill = [f for f in bm.faces if all(v.index in selset for v in f.verts)]
        if len(kill) < 20: bm.free(); continue
        bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY')
        # (loose vertices are kept on purpose: deleting them would renumber the mesh and break the second braid's selection)
        before = set(bm.faces)
        bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary and min(dseg(mw @ e.verts[0].co, pts[k], pts[k + 1]) for k in range(5)) < r0 * 3], sides=0)
        newf = [f for f in bm.faces if f not in before]
        if newf:
            bmesh.ops.triangulate(bm, faces=newf)
            uvl = bm.loops.layers.uv.active
            if uvl:
                for f in [f for f in bm.faces if f not in before]:
                    # nearest old loop UV: take the uv of the first boundary neighbour found
                    src_uv = None
                    for v in f.verts:
                        for l in v.link_loops:
                            if l.face in before: src_uv = l[uvl].uv.copy(); break
                        if src_uv: break
                    if src_uv:
                        for l in f.loops: l[uvl].uv = src_uv
        bm.to_mesh(me); bm.free(); me.update(); P = [mw @ v.co for v in me.vertices]; N = len(P)
        # new plaited tube
        tip = pts[-1] + (pts[-1] - pts[-2]).normalized() * .03 * S
        path = pts + [tip]; samples = []
        for k in range(len(path) - 1):
            for j in range(6): samples.append(path[k].lerp(path[k + 1], j / 6))
        samples.append(tip)
        bb = bmesh.new(); bdl = bb.verts.layers.deform.verify(); seg = 10; rings = []
        L = sum((samples[i + 1] - samples[i]).length for i in range(len(samples) - 1)); acc = 0
        for i, c in enumerate(samples):
            if i: acc += (samples[i] - samples[i - 1]).length
            t = acc / L; ax = (samples[min(i + 1, len(samples) - 1)] - samples[max(i - 1, 0)]).normalized()
            x = (rgt - ax * rgt.dot(ax)).normalized(); y = ax.cross(x)
            plait = abs(math.sin(t * math.pi * 14)); r = r0 * (1 - .55 * t ** 2) * (.82 + .3 * plait)
            off = x * r * .25 * math.sin(t * math.pi * 14)        # alternating plait sway
            ring_vs = []
            for k in range(seg):
                a = k * 2 * math.pi / seg; v = bb.verts.new(c + off + (x * math.cos(a) + y * math.sin(a) * .8) * r)
                ring_vs.append(v)
            rings.append((ring_vs, t))
        for (a, ta), (b, tb_) in zip(rings, rings[1:]):
            for k in range(seg): bb.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
        bb.faces.new(rings[-1][0][::-1]); bb.faces.new(rings[0][0])
        # bones (5 along the strand) and weights
        bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.data.edit_bones; inv = arm.matrix_world.inverted(); parent = eb['Head']; bnames = []
        for k in range(5):
            b = eb.new('Braid%s%d' % (side, k + 1)); b.head = inv @ pts[k]; b.tail = inv @ (pts[k + 1] if k < 4 else tip); b.parent = parent; b.use_connect = False; parent = b; bnames.append(b.name)
        bpy.ops.object.mode_set(mode='OBJECT')
        bm_obj = bpy.data.objects.new('braid' + side, bpy.data.meshes.new('braid' + side)); sc.collection.objects.link(bm_obj)
        for nmx in ['Head'] + bnames: bm_obj.vertex_groups.new(name=nmx)
        segpts = pts[:5] + [tip]
        for ring_vs, t in rings:
            for v in ring_vs:
                p = v.co; best = None
                for k in range(5):
                    a, b = segpts[k], segpts[k + 1]; ab = b - a; tt = max(0, min(1, (p - a).dot(ab) / ab.length_squared)); d = (p - (a + ab * tt)).length
                    if best is None or d < best[0]: best = (d, k, tt)
                _, k, tt = best; w = {bnames[k]: 1.}
                if tt > .6 and k < 4: w = {bnames[k]: 1 - (tt - .6), bnames[k + 1]: tt - .6}
                if k == 0 and tt < .3: w = {'Head': .3 - tt, bnames[0]: .7 + tt}
                tot = sum(w.values())
                for nmx, x in w.items(): v[bdl][(['Head'] + bnames).index(nmx)] = x / tot
        for v in bb.verts: v.co = mwi @ v.co
        bmesh.ops.recalc_face_normals(bb, faces=bb.faces); bb.to_mesh(bm_obj.data); bb.free(); bm_obj.matrix_world = mw.copy()
        for p_ in bm_obj.data.polygons: p_.use_smooth = True
        bm_obj.data.materials.append(material('hair' + side, hair_rgb, .45)); newobjs.append(bm_obj)
        made.append((side, len(sel), round(r0, 3)))
    report['braids'] = made

# ======================= join + export =======================
for o in newobjs:
    wm_ = o.matrix_world.copy(); o.parent = arm; o.matrix_world = wm_   # keep the world placement (the armature carries the glTF scale)
    mod = o.modifiers.new('arm', 'ARMATURE'); mod.object = arm
    # glTF multiplies vertex colours of the body into albedo: give the new parts white ones so they share the body's material layout
    for ca in me.color_attributes:
        nca = o.data.color_attributes.new(ca.name, ca.data_type, ca.domain)
        for e in nca.data: e.color = (1, 1, 1, 1)
bpy.ops.object.select_all(action='DESELECT')
for o in newobjs: o.select_set(True)
body.select_set(True); bpy.context.view_layer.objects.active = body
if newobjs: bpy.ops.object.join()
def export(path):
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False)
export(out)
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
bpy.context.view_layer.objects.active = body; dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = min(1.0, 20000 / max(1, tris))
while body.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
bpy.ops.object.modifier_apply(modifier='dec'); export(out_low)
print('LAYERED', report)
print('LAYERED DONE')
