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
        if knee + .02 < p.z < waist + .08 and side * math.copysign(1, left_x) > .13 and not is_blue(c) and bvh0.find_nearest(p)[3] > .045:
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
    bmesh.ops.delete(bmx, geom=dead, context='FACES')
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
    crumbs = [v for comp in comps if len(comp) < 60 or (len(comp) < 400 and min(bvh0.find_nearest(mw @ x.co)[3] for x in comp[::5]) > .05) for v in comp]   # crumbs + loose sword bits
    bmesh.ops.delete(bmx, geom=crumbs, context='VERTS')
    bb0.free(); beval0.to_mesh_clear()
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
    # skirt = what hangs away from the legs (geometry, not colour: the dress texture has dark trims/shadows); trousers hug the legs
    def cls(i):
        if is_blue(vc[i]): return 1.
        if legwear(vc[i]): return 0. if dist[i] < .05 else .5
        return 1. if dist[i] > .03 else .5
    sk = [smooth(ztop, ztop - .08, P[i].z) * (1 if P[i].z > hem - .12 else 0) * cls(i) for i in range(N)]
    for _ in range(4):   # region vote: thin trims / stitching / shadows join the surface they sit on
        sk = [(sk[i] + sum(sk[j] for j in nb[i])) / (1 + len(nb[i])) for i in range(N)]
    for _ in range(6):
        sk = [(sk[i] + sum(sk[j] for j in nb[i])) / (1 + len(nb[i])) for i in range(N)]
    sk = [(1. if sk[i] > .35 else 0.) if P[i].z < ztop - .07 else sk[i] for i in range(N)]
    # legs: how much of each costume point belongs to the left / right leg (the web between the legs belongs to both)
    def legsum(w, side): return sum(x for n, x in w.items() if n.startswith(side) and any(k in n for k in ('UpLeg', 'Leg', 'Foot', 'ToeBase')))
    crotch = hip.z - .06
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
        pass   # the skirt is split off later with pure chain weights; the costume (trousers, boots, belt band) keeps the body's weights
    # limit 4 + normalise, write groups
    for n in set(n for w in W for n in w): o.vertex_groups.new(name=n)
    for i, w in enumerate(W):
        top4 = sorted(w.items(), key=lambda kv: -kv[1])[:4]; tot = sum(x for _, x in top4) or 1.
        for n, x in top4:
            if x / tot > .01: o.vertex_groups[n].add([i], x / tot, 'REPLACE')
    # ---------------- skirt by VISIBILITY (the reference is one fused shell: colour and distance both failed):
    # in the skirt zone every face that is seen from outside (a ray from it, away from the body axis, hits nothing) is the
    # skirt, except the trouser strip seen through the front slit; faces hidden inside are deleted; the web between the legs too
    def cw_at(p):
        a = ang(p) / (math.pi / 4); k0 = int(a) % 8; k1 = (k0 + 1) % 8; fa = a - int(a)
        s_ = max(0., min(1., (ztop - p.z) / max(1e-4, ztop - hem))) * 3; seg = min(2, int(s_)); t = s_ - seg
        cw = {}
        for kk, ka in ((k0, 1 - fa), (k1, fa)):
            for j_, ja in ((seg, 1 - max(0, t - .5)), (min(2, seg + 1), max(0, t - .5))):
                cw[chain[kk][j_]] = cw.get(chain[kk][j_], 0.) + ka * ja
        hipw = 1 - smooth(0, .6, s_)
        cw = {n: x * (1 - hipw) for n, x in cw.items()}; cw['Hips'] = cw.get('Hips', 0.) + hipw
        return cw
    for n in ['Hips'] + [b for c_ in chain for b in c_]:
        if n not in o.vertex_groups: o.vertex_groups.new(name=n)
    gidx = {g.name: g.index for g in o.vertex_groups}
    LS = [legsum(W[i], 'Left') for i in range(N)]; RS = [legsum(W[i], 'Right') for i in range(N)]
    bmx = bmesh.new(); bmx.from_mesh(me); bmx.transform(mw); bmx.verts.ensure_lookup_table(); bmx.faces.ensure_lookup_table()
    cbvh = BVHTree.FromBMesh(bmx)
    buv = bmx.loops.layers.uv.active
    z_top, z_bot = ztop - .05, hem - .14
    inner, skirt_faces, web = [], [], []
    for f in bmx.faces:
        c = f.calc_center_median()
        if not (z_bot < c.z < z_top): continue
        ids = [v.index for v in f.verts]
        if all(P[i].z < crotch for i in ids) and min(min(LS[i], RS[i]) for i in ids) > .3 and all(abs((P[i] - hip).dot(rgt)) < .055 for i in ids) and max(dist[i] for i in ids) < .035: web.append(f); continue   # only the trouser crotch web, never the skirt
        d = c - Vector((hip.x, hip.y, c.z))
        if d.length < 1e-4: continue
        d.normalize(); hit = cbvh.ray_cast(c + d * .004, d, .25)
        if hit[0] is not None:
            if c.z > hem - .02: inner.append(f)   # hidden under the skirt -> gone; below the hem nothing is deleted
            continue
        u_ = sum((l[buv].uv for l in f.loops), Vector((0, 0))) / len(f.loops); col = px[int((u_.y % 1) * (IH - 1)), int((u_.x % 1) * (IW - 1)), :3]; front = d.dot(fwd) > math.cos(math.radians(32))
        loc, nrm, fi, dd = bvh.find_nearest(c)
        if legwear(col) and front and dd is not None and dd < .055: continue   # trousers seen through the slit stay on the legs
        if c.z < hem - .005 or (legwear(col) and c.z < hem + .04):   # below the dress hem: trousers / boot tops stay on the legs
            loc2, nrm2, fi2, dd2 = bvh.find_nearest(c)
            if c.z > knee - .16 and dd2 is not None and dd2 > .045 and not legwear(col): inner.append(f)   # loose dress shards below the hem would snap with the knee
            continue
        skirt_faces.append(f)
    # the skirt: own object, pure chain weights (no thigh weights), pushed off the body, normals facing out
    dl = bmx.verts.layers.deform.verify()
    sb = bmesh.new(); sdl = sb.verts.layers.deform.verify(); suv = sb.loops.layers.uv.verify(); ouv = bmx.loops.layers.uv.active; vm = {}
    for f in skirt_faces:
        vs = []
        for v in f.verts:
            if v not in vm:
                pw = v.co.copy(); loc, nrm, fi, dd = bvh.find_nearest(pw)
                if loc is not None and (pw - loc).dot(nrm) < .012: pw = loc + nrm * .012
                nv = sb.verts.new(pw); cw = cw_at(pw)
                # a share of the nearest thigh lower down: the panel travels with the leg instead of letting the knee punch through
                dep = max(0., min(1., (ztop - pw.z) / max(1e-4, ztop - hem))); lr = max(-1., min(1., (pw - hip).dot(rgt) / .12)); kw = .32 * dep
                lname = 'LeftUpLeg' if left_x < 0 else 'RightUpLeg'; rname = 'RightUpLeg' if left_x < 0 else 'LeftUpLeg'
                cw = {n: x * (1 - kw) for n, x in cw.items()}; cw[rname] = cw.get(rname, 0.) + kw * (1 + lr) / 2; cw[lname] = cw.get(lname, 0.) + kw * (1 - lr) / 2
                if pw.z > ztop - .1:   # top band blends into the costume weights (no seam at the belt)
                    e = smooth(ztop - .1, ztop - .05, pw.z); old = {o.vertex_groups[g].name: x for g, x in v[dl].items()}
                    cw = {n: cw.get(n, 0.) * (1 - e) + old.get(n, 0.) * e for n in set(cw) | set(old)}
                top4 = sorted(cw.items(), key=lambda kv: -kv[1])[:4]; tot = sum(x for _, x in top4) or 1.
                for n, x in top4:
                    if x / tot > .01: nv[sdl][gidx[n]] = x / tot
                vm[v] = nv
            vs.append(vm[v])
        try:
            nf = sb.faces.new(vs); nf.material_index = f.material_index
            for la, lb in zip(f.loops, nf.loops): lb[suv].uv = la[ouv].uv
        except ValueError: pass
    for f in sb.faces:
        c_ = f.calc_center_median(); out_ = c_ - Vector((hip.x, hip.y, c_.z))
        if f.normal.dot(out_) < 0: f.normal_flip()
    bmesh.ops.delete(bmx, geom=list(set(inner + web + skirt_faces)), context='FACES')
    bmesh.ops.delete(bmx, geom=[v for v in bmx.verts if not v.link_faces], context='VERTS')
    def drop_small(bmz, limit, zone):
        bmz.verts.ensure_lookup_table(); seen_ = set(); gone_ = []
        for v in bmz.verts:
            if v in seen_: continue
            st = [v]; seen_.add(v); comp = []
            while st:
                x = st.pop(); comp.append(x)
                for e in x.link_edges:
                    y = e.other_vert(x)
                    if y not in seen_: seen_.add(y); st.append(y)
            if len(comp) < limit and all(zone(x.co) for x in comp): gone_.extend(comp)
        bmesh.ops.delete(bmz, geom=gone_, context='VERTS'); return len(gone_)
    zone_ = lambda q: z_bot - .02 < q.z < z_top + .02
    nd1 = drop_small(bmx, 150, zone_); nd2 = drop_small(sb, 60, zone_)
    bmx.transform(mw.inverted()); sb.transform(mw.inverted())
    bmx.to_mesh(me); bmx.free()
    print('CHAR costume: skirt %d faces, hidden inner %d, web %d deleted, fragments %d + %d' % (len(skirt_faces), len(inner), len(web), nd1, nd2))
    sm = bpy.data.meshes.new('skirt'); sb.to_mesh(sm); sb.free()
    so = bpy.data.objects.new('skirt', sm); sc.collection.objects.link(so); so.matrix_world = mw
    for mt in me.materials: sm.materials.append(mt)
    for g in o.vertex_groups: so.vertex_groups.new(name=g.name)
    dress_rgb = [c * .35 for c in spec.get('dress', {}).get('color', [.09, .11, .45])]
    inner = bpy.data.materials.new('skirt_inner'); inner.use_nodes = True; inner.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*dress_rgb, 1); inner.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
    sm.materials.append(inner)
    bpy.context.view_layer.objects.active = so; so.select_set(True)
    sol = so.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .004; sol.offset = -1; sol.use_rim = True; sol.material_offset = len(sm.materials) - 1; sol.material_offset_rim = len(sm.materials) - 1
    bpy.ops.object.modifier_apply(modifier='sol')
    for p_ in sm.polygons: p_.use_smooth = True
    so.parent = arm; so.matrix_world = mw; md2 = so.modifiers.new('arm', 'ARMATURE'); md2.object = arm
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
    keepv = []; sink = []
    for v, w in zip(body.data.vertices, BW):
        p = bmw @ v.co
        hn = sum(x for n, x in w.items() if n in ('Head', 'neck', 'neck_02'))
        hd = sum(x for n, x in w.items() if 'Hand' in n or any(f in n for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')))
        loc, nrm, fi, d = cost_bvh.find_nearest(p)
        lg = sum(x for n, x in w.items() if any(k in n for k in ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Hips')))
        keepv.append(hn > .5 or hd > .5 or d is None or d > .06 or (lg > .5 and p.z < waist - .02))
        if sum(x for n, x in w.items() if 'Foot' in n or 'ToeBase' in n) > .5: keepv[-1] = False   # feet are inside the boots
        sink.append(not (hn > .5 or hd > .5 or d is None or d > .06) and lg > .5 and p.z < waist - .02)
    bb = bmesh.new(); bb.from_mesh(body.data); bb.verts.ensure_lookup_table()
    for v in bb.verts:   # legs / pelvis kept under the clothes sit 1.5 cm inside them: they fill the void, never show through
        if sink[v.index]: v.co -= v.normal * .015
    gone = [f for f in bb.faces if not any(keepv[v.index] for v in f.verts)]
    bmesh.ops.delete(bb, geom=gone, context='FACES'); bb.to_mesh(body.data); bb.free()
    lw_rgb = spec.get('trousers', [.17, .1, .07]); lw_rgb = [x ** 2.2 for x in lw_rgb]
    tm = bpy.data.materials.new('under_trousers'); tm.use_nodes = True; tm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lw_rgb, 1); tm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .9
    body.data.materials.append(tm); ti = len(body.data.materials) - 1
    bt_rgb = [x ** 2.2 for x in spec.get('boots', [.2, .12, .09])]; bmat = bpy.data.materials.new('under_boots'); bmat.use_nodes = True; bmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*bt_rgb, 1); bmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .7
    body.data.materials.append(bmat); bi = len(body.data.materials) - 1
    bnm = [g.name for g in body.vertex_groups]
    for poly in body.data.polygons:
        c_ = bmw @ poly.center
        if c_.z < waist - .02:
            ws_ = {}
            for vi in poly.vertices:
                for g in body.data.vertices[vi].groups: ws_[bnm[g.group]] = ws_.get(bnm[g.group], 0) + g.weight
            if sum(x for n, x in ws_.items() if any(k in n for k in ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Hips'))) > .5 * len(poly.vertices): poly.material_index = ti if c_.z > knee - .04 else bi
    print('CHAR costume: removed %d hidden body faces' % len(gone))
    bm_b.free(); beval.to_mesh_clear()
    return o
