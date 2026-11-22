# Clothes taken DIRECTLY from the author's Higgsfield model (its own geometry + texture), worn by the MetaHuman body:
#   1. the reference shell (already standing where the MetaHuman body was posed to it by fit_ref.match) is copied, its
#      skin (face, neck, hands) and the sword + scabbard are cut away -> what is left is the costume, looking exactly as approved;
#   2. every costume vertex gets the skin weights of the nearest point of the MetaHuman body (barycentric), smoothed,
#      max 4 influences; the dress / armour skirt below the belt that hangs free of the legs is blended onto 8 chains of
#      3 spring bones (Skirt<k>_<j>) so it swings instead of stretching with the thighs;
#   3. costume points that dip inside the body or the MetaHuman head are pushed out; body faces hidden under the costume
#      are deleted (no poke-through at any pose); head, neck and hands of the MetaHuman stay.
import bpy, bmesh, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

def smooth(a, b, x):
    t = max(0., min(1., (x - a) / (b - a))) if b != a else (1. if x >= b else 0.); return t * t * (3 - 2 * t)

def build(spec, body, arm, REF):
    sc = bpy.context.scene; dg = bpy.context.evaluated_depsgraph_get()
    ref = REF['meshes'][0]; AW = arm.matrix_world; B = arm.data.bones
    def hw(n): return AW @ B[n].head_local
    up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()
    if fwd.y > 0: fwd = -fwd
    hip = hw('Hips'); waist = hw(spec.get('waist_bone', 'Spine01')).z; neckz = hw('neck').z; headp = hw('Head')
    knee = (hw('LeftLeg').z + hw('RightLeg').z) / 2
    left_x = (hw('LeftUpLeg') - hip).dot(rgt)   # <0: the character's left is -rgt

    # ---------------- 1. costume = reference minus skin and sword
    o = ref.copy(); o.data = ref.data.copy(); o.name = 'costume'; sc.collection.objects.link(o)
    for g in list(o.vertex_groups): o.vertex_groups.remove(g)
    me = o.data; mw = o.matrix_world.copy()
    bmx = bmesh.new(); bmx.from_mesh(me)
    bmesh.ops.remove_doubles(bmx, verts=bmx.verts, dist=.0005)   # glTF split the shell at UV seams
    img = None   # the BASE COLOUR image (the first image node may be the normal / ORM map)
    for mt in me.materials:
        if not mt or not mt.use_nodes: continue
        bsdf = next((n for n in mt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf and bsdf.inputs['Base Color'].links:
            fn = bsdf.inputs['Base Color'].links[0].from_node
            while fn.type != 'TEX_IMAGE' and fn.inputs and any(i.links for i in fn.inputs):
                fn = next(i.links[0].from_node for i in fn.inputs if i.links)
            if fn.type == 'TEX_IMAGE': img = fn.image; break
    print('CHAR costume: base colour image', img.name if img else None, img.size[:] if img else '')
    IW, IH = img.size; px = np.array(img.pixels[:], dtype=np.float32).reshape(IH, IW, 4)
    uvl = bmx.loops.layers.uv.active
    def fcol(f):
        u = sum((l[uvl].uv for l in f.loops), Vector((0, 0))) / len(f.loops)
        return px[int((u.y % 1) * (IH - 1)), int((u.x % 1) * (IW - 1)), :3]
    hands = [(hw(s + 'Hand'), s) for s in ('Left', 'Right')]
    def is_skin(c):
        r, g, b = c; return r > g > b and r - b > .1 and r > .3 and (r - b) / max(r, 1e-3) < .62
    def is_blue(c): return c[2] > c[0] * 1.25 and c[2] > c[1] * 1.1
    beval0 = body.evaluated_get(dg); bme0 = beval0.to_mesh(); bb0 = bmesh.new(); bb0.from_mesh(bme0); bb0.transform(body.matrix_world); bvh0 = BVHTree.FromBMesh(bb0)
    dead = []; sword_cand = set()
    fb = spec.get('_face')
    arms = [(hw(s_ + 'ForeArm'), hw(s_ + 'Hand')) for s_ in ('Left', 'Right')]
    for f in bmx.faces:
        p = mw @ f.calc_center_median(); c = fcol(f)
        side = (p - hip).dot(rgt)
        # the reference's face: everything inside the MetaHuman face oval goes (the MetaHuman face shows through)
        if fb and fb['chin'] - .015 < p.z < fb['brow'] - .004 and abs(p.x - fb['cx']) < fb['halfw'] + .004 and p.y < fb['front'] + .075:
            dead.append(f); continue
        if fb and fb['chin'] - .06 < p.z <= fb['chin'] - .015 and abs(p.x - fb['cx']) < fb['halfw'] * .85 and p.y < fb['front'] + .09 and not is_blue(c):
            dead.append(f); continue   # under the chin / front of the neck
        # the reference's hands: everything past the wrist along the forearm
        if any((p - h).dot((h - fa).normalized()) > -.018 and (p - h).length < .22 for fa, h in arms):
            dead.append(f); continue
        # skin: the face / neck under the scarf opening, and the hands below the sleeves
        if is_skin(c):
            # neck skin between the collar and the chin only (coins / silver pendants of the scarf look skin-coloured: keep them)
            if fb and neckz - .07 < p.z < fb['chin'] and abs(p.x - fb['cx']) < fb['halfw'] * .9 and (p - headp).dot(fwd) > -.03: dead.append(f); continue
            if any((p - h).length < .14 and p.z < h.z + .03 for h, _ in hands): dead.append(f); continue
        # sword + scabbard candidates: the character's left beside the hip, not blue cloth
        # only the HILT goes (the sword is drawn in her hand); the empty scabbard stays on the belt, no holes in the dress
        if waist - .16 < p.z < waist + .08 and side * math.copysign(1, left_x) > .15 and not is_blue(c) and bvh0.find_nearest(p)[3] > .045:
            sword_cand.add(f)
    # the scabbard is the one big connected patch of candidates; small ones are dress trim and stay
    seenf = set(); n_sword = 0
    for f in list(sword_cand):
        if f in seenf: continue
        comp = []; st = [f]; seenf.add(f)
        while st:
            x = st.pop(); comp.append(x)
            for e in x.edges:
                for y in e.link_faces:
                    if y in sword_cand and y not in seenf: seenf.add(y); st.append(y)
        if len(comp) > 25: dead.extend(comp); n_sword += len(comp)
    print('CHAR costume: sword faces', n_sword, 'candidates', len(sword_cand))
    dead = list(set(dead))
    bmesh.ops.delete(bmx, geom=dead, context='FACES'); bb0.free(); beval0.to_mesh_clear()
    # drop little floating crumbs left by the cut
    bmx.verts.ensure_lookup_table(); seen = set(); comps = []
    for v in bmx.verts:
        if v in seen: continue
        st = [v]; seen.add(v); comp = []
        while st:
            x = st.pop(); comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y not in seen: seen.add(y); st.append(y)
        comps.append(comp)
    crumbs = [v for comp in comps if len(comp) < 60 for v in comp]
    bmesh.ops.delete(bmx, geom=crumbs, context='VERTS')
    bmx.to_mesh(me); bmx.free()
    print('CHAR costume: cut %d faces (skin + sword), %d crumbs, %d verts left' % (len(dead), len(crumbs), len(me.vertices)))

    # ---------------- 2. weights from the MetaHuman body
    beval = body.evaluated_get(dg); bme = beval.to_mesh(); bmw = body.matrix_world
    bm_b = bmesh.new(); bm_b.from_mesh(bme); bm_b.transform(bmw); bm_b.faces.ensure_lookup_table(); bm_b.verts.ensure_lookup_table()
    bvh = BVHTree.FromBMesh(bm_b)
    bnames = [g.name for g in body.vertex_groups]
    BW = [{bnames[g.group]: g.weight for g in v.groups if g.weight > 1e-4} for v in body.data.vertices]
    P = [mw @ v.co for v in me.vertices]; N = len(P)
    W = []; dist = []; inside = []
    for p in P:
        loc, nrm, fi, d = bvh.find_nearest(p)
        f = bm_b.faces[fi]; vs = [v.co for v in f.verts]
        # barycentric on the triangle fan of the face
        w = {}
        tot = 0.
        for v in f.verts:
            k = 1. / max(1e-5, (v.co - loc).length); tot += k
            for n, x in BW[v.index].items(): w[n] = w.get(n, 0.) + x * k
        w = {n: x / tot for n, x in w.items()}
        W.append(w); dist.append(d); inside.append((p - loc).dot(nrm) < 0)
    # smooth over the costume's own edges (no seams between neighbouring faces)
    nb = [[] for _ in range(N)]
    for e in me.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
    for _ in range(3):
        W2 = []
        for i in range(N):
            acc = dict(W[i]); c = 1.
            for j in nb[i]:
                for n, x in W[j].items(): acc[n] = acc.get(n, 0.) + x * .5
                c += .5
            W2.append({n: x / c for n, x in acc.items()})
        W = W2
    # ---------------- skirt chains: dress / tassets below the belt that hang away from the legs
    hem = knee - .04
    ztop = waist - .06
    # vertex colours of the costume: the dress (blue) and the armour skirt (grey plates) hang on the chains, the dark brown
    # trousers and the boots stay on the legs
    uvd = me.uv_layers.active.data; vc = [np.zeros(3) for _ in range(N)]; vn = [0] * N
    for poly in me.polygons:
        for li in poly.loop_indices:
            u = uvd[li].uv; vi = me.loops[li].vertex_index; vc[vi] = vc[vi] + px[int((u.y % 1) * (IH - 1)), int((u.x % 1) * (IW - 1)), :3]; vn[vi] += 1
    vc = [c / max(1, n) for c, n in zip(vc, vn)]
    def legwear(c):
        r, g, b = c; lum = .3 * r + .59 * g + .11 * b; return r >= g >= b and lum < .32 and not is_blue(c) and (r - b) < .25
    sk = [smooth(ztop, ztop - .08, P[i].z) * (1 if P[i].z > hem - .1 else 0) * (smooth(.03, .06, dist[i]) if legwear(vc[i]) else 1.) for i in range(N)]
    for _ in range(6):
        sk = [(sk[i] + sum(sk[j] for j in nb[i])) / (1 + len(nb[i])) for i in range(N)]
    _lw = [legwear(c) for c in vc]; print('CHAR costume skirt: legwear %d / %d, sk>.5 %d, ztop %.3f hem %.3f, sample colours' % (sum(_lw), N, sum(1 for x in sk if x > .5), ztop, hem), [tuple(round(float(x), 2) for x in vc[i]) for i in range(0, N, N // 8)])
    def ang(p):
        d = p - Vector((hip.x, hip.y, p.z)); return math.atan2(d.dot(rgt), d.dot(fwd)) % (2 * math.pi)
    zs = [ztop, ztop - (ztop - hem) / 3, ztop - 2 * (ztop - hem) / 3, hem]
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; inv = AW.inverted(); chain = []
    for k in range(8):
        th = k * math.pi / 4; dk = fwd * math.cos(th) + rgt * math.sin(th); pts = []
        for z in zs:
            best = 0.
            for i in range(0, N, 3):
                p = P[i]
                if abs(p.z - z) > .03: continue
                d = p - Vector((hip.x, hip.y, p.z))
                if d.length > 1e-4 and d.normalized().dot(dk) > math.cos(math.radians(20)): best = max(best, d.dot(dk))
            pts.append(Vector((hip.x, hip.y, z)) + dk * (best * .9 if best > 0 else .14))
        parent = eb['Hips']; names = []
        for j in range(3):
            b = eb.new('Skirt%d_%d' % (k, j + 1)); b.head = inv @ pts[j]; b.tail = inv @ pts[j + 1]; b.parent = parent; b.use_connect = False; parent = b; names.append(b.name)
        chain.append(names)
    bpy.ops.object.mode_set(mode='OBJECT')
    for i in range(N):
        if sk[i] <= 0: continue
        p = P[i]; a = ang(p) / (math.pi / 4); k0 = int(a) % 8; k1 = (k0 + 1) % 8; fa = a - int(a)
        s = max(0., min(1., (ztop - p.z) / max(1e-4, ztop - hem))) * 3; seg = min(2, int(s)); t = s - seg
        cw = {}
        for kk, ka in ((k0, 1 - fa), (k1, fa)):
            for j, ja in ((seg, 1 - max(0, t - .5)), (min(2, seg + 1), max(0, t - .5))):
                cw[chain[kk][j]] = cw.get(chain[kk][j], 0.) + ka * ja
        hipw = 1 - smooth(0, .8, s)
        cw = {n: x * (1 - hipw) for n, x in cw.items()}; cw['Hips'] = cw.get('Hips', 0.) + hipw
        W[i] = {n: W[i].get(n, 0.) * (1 - sk[i]) + cw.get(n, 0.) * sk[i] for n in set(W[i]) | set(cw)}
    # limit 4 + normalise, write groups
    for n in set(n for w in W for n in w): o.vertex_groups.new(name=n)
    for i, w in enumerate(W):
        top4 = sorted(w.items(), key=lambda kv: -kv[1])[:4]; tot = sum(x for _, x in top4) or 1.
        for n, x in top4:
            if x / tot > .01: o.vertex_groups[n].add([i], x / tot, 'REPLACE')
    # ---------------- 3. push costume points out of the body / head
    pushed = 0
    for i, v in enumerate(me.vertices):
        p = mw @ v.co; loc, nrm, fi, d = bvh.find_nearest(p)
        s = (p - loc).dot(nrm)
        if s < .003:
            v.co = mw.inverted() @ (loc + nrm * .004); pushed += 1
    print('CHAR costume: pushed %d points out of the body' % pushed)
    o.parent = arm; o.matrix_world = mw
    md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm
    # body faces hidden under the costume go away; head, neck and hands stay
    cb_ = bmesh.new(); cb_.from_mesh(me); cb_.transform(mw); cost_bvh = BVHTree.FromBMesh(cb_); cb_.free()
    keepv = []
    for v, w in zip(body.data.vertices, BW):
        p = bmw @ v.co
        hn = sum(x for n, x in w.items() if n in ('Head', 'neck', 'neck_02'))
        hd = sum(x for n, x in w.items() if 'Hand' in n or any(f in n for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')))
        loc, nrm, fi, d = cost_bvh.find_nearest(p)
        keepv.append(hn > .5 or hd > .5 or d is None or d > .06)
    bb = bmesh.new(); bb.from_mesh(body.data); bb.verts.ensure_lookup_table()
    gone = [f for f in bb.faces if not any(keepv[v.index] for v in f.verts)]
    bmesh.ops.delete(bb, geom=gone, context='FACES'); bb.to_mesh(body.data); bb.free()
    print('CHAR costume: removed %d hidden body faces' % len(gone))
    bm_b.free(); beval.to_mesh_clear()
    return o
