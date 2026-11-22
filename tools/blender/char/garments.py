# Clothes, armour, hair and jewellery as SEPARATE layers on the standard body (build_char.py).
# Standard game-character practice:
#   - fitted garments (tunic, trousers, boots, cuirass, bracers, scarf cap) are offset shells of the body region they cover, so they
#     share the body's edge loops and copy its skin weights exactly -> they bend with the joints, no poke-through;
#   - body faces fully hidden under a garment are deleted (no clipping, fewer triangles);
#   - loose parts (dress skirt, armour tassets, scarf drape, braids) are their own meshes on bone chains (Skirt*, Tasset*, Drape*,
#     Braid*) that QQSpring swings in the game;
#   - tiling PBR textures (fabric weave, lamellar plates, leather) generated here, UVs cylindrical around each part's axis.
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix

def lin(c): return [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c]
def smooth(a, b, x):
    t = max(0., min(1., (x - a) / (b - a))) if b != a else (1. if x >= b else 0.); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ textures
TEX = {}
def img_from(name, rgb):   # rgb: HxWx3 or HxWx4 float array (linear for normals, sRGB for colour)
    h, w = rgb.shape[:2]
    if rgb.shape[2] == 3: rgb = np.concatenate([rgb, np.ones((h, w, 1))], 2)
    im = bpy.data.images.new(name, w, h, alpha=False); im.pixels.foreach_set(np.ascontiguousarray(rgb[::-1].astype(np.float32)).ravel()); im.pack(); return im
def normal_from_height(hgt, k):
    gy, gx = np.gradient(hgt); n = np.dstack([-gx * k, gy * k, np.ones_like(hgt)]); n /= np.linalg.norm(n, axis=2, keepdims=True); return n * .5 + .5
def noise(sz, scale, seed):
    rng = np.random.default_rng(seed); g = rng.random((scale + 1, scale + 1)); g[-1] = g[0]; g[:, -1] = g[:, 0]
    y = np.linspace(0, scale, sz, endpoint=False); x = y
    i = y.astype(int); f = y - i; f = f * f * (3 - 2 * f)
    a = g[i][:, i]; b = g[i][:, i + 1]; c = g[i + 1][:, i]; d = g[i + 1][:, i + 1]
    fx = f[None, :]; fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
def fbm(sz, seed, oct=4, base=4):
    s = np.zeros((sz, sz)); amp = 1; tot = 0
    for o in range(oct): s += noise(sz, base * 2 ** o, seed + o) * amp; tot += amp; amp *= .5
    return s / tot
def tex_fabric():
    if 'fabric' in TEX: return TEX['fabric']
    sz = 512; y, x = np.mgrid[0:sz, 0:sz] / sz
    weave = (np.sin(x * math.pi * 2 * 96) * .5 + .5) * (np.sin(y * math.pi * 2 * 96 + math.pi * (np.floor(x * 96) % 2)) * .5 + .5)
    h = weave * .6 + fbm(sz, 3) * .4
    col = np.dstack([.85 + .15 * fbm(sz, 11)] * 3)          # greyscale multiplier on the base colour
    TEX['fabric'] = (img_from('fabric_c', col), img_from('fabric_n', normal_from_height(h, 2.5))); return TEX['fabric']
def tex_leather():
    if 'leather' in TEX: return TEX['leather']
    sz = 512; h = fbm(sz, 21, 5, 8); g = fbm(sz, 31, 3, 3)
    col = np.dstack([.75 + .3 * g] * 3)
    TEX['leather'] = (img_from('leather_c', col), img_from('leather_n', normal_from_height(h, 6))); return TEX['leather']
def tex_lamella():
    # rows of riveted steel plates, each plate a rounded rectangle, rows overlapping (shadow under each row), leather lacing
    if 'lamella' in TEX: return TEX['lamella']
    sz = 512; y, x = np.mgrid[0:sz, 0:sz] / sz
    cols, rows = 8, 4
    px = (x * cols) % 1; py = (y * rows) % 1
    edge = np.minimum(np.minimum(px, 1 - px) * 6, np.minimum(py, 1 - py) * 4).clip(0, 1)
    plate = np.sqrt(edge)
    over = (1 - py) ** 3 * .35                                   # overlap shadow at the bottom of each row
    rivet = np.zeros_like(x)
    for cx in (.5,):
        for cy in (.22, .78):
            rivet = np.maximum(rivet, (1 - np.hypot(px - cx, (py - cy) * rows / cols * 2) * 30).clip(0, 1))
    h = plate * .7 + rivet * .5 - over * .4 + fbm(sz, 41) * .08
    grime = fbm(sz, 51, 4, 6)
    v = (.55 + .35 * plate - over + rivet * .25) * (.8 + .25 * grime)
    col = np.dstack([v, v, v * 1.02])
    lace = ((py > .92) | (py < .04)).astype(float) * (np.abs(px - .5) < .12)
    col = col * (1 - lace[..., None]) + np.dstack([.35 * lace, .2 * lace, .13 * lace])
    rough = (.38 + .3 * grime - .1 * plate).clip(.2, .9); metal = (1 - lace) * .9
    orm = np.dstack([np.ones_like(x), rough, metal])
    TEX['lamella'] = (img_from('lamella_c', col.clip(0, 1)), img_from('lamella_n', normal_from_height(h, 7)), img_from('lamella_orm', orm)); return TEX['lamella']

def material(name, rgb, rough=.8, metal=0., kind=None, uvscale=(1, 1)):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*lin(rgb), 1); bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if kind:
        t = {'fabric': tex_fabric, 'leather': tex_leather, 'lamella': tex_lamella}[kind]()
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = t[0]
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
        mul.inputs[6].default_value = (*lin(rgb), 1); nt.links.new(tc.outputs['Color'], mul.inputs[7]); nt.links.new(mul.outputs[2], bs.inputs['Base Color'])
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = t[1]; tn.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
        if len(t) > 2:
            to = nt.nodes.new('ShaderNodeTexImage'); to.image = t[2]; to.image.colorspace_settings.name = 'Non-Color'
            sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(to.outputs['Color'], sp.inputs['Color'])
            nt.links.new(sp.outputs['Green'], bs.inputs['Roughness']); nt.links.new(sp.outputs['Blue'], bs.inputs['Metallic'])
    return m

# ------------------------------------------------------------------ main
def build(spec, body, arm):
    sc = bpy.context.scene; me = body.data; mw = body.matrix_world
    B = arm.data.bones; AW = arm.matrix_world
    def hw(n): return AW @ B[n].head_local
    def tw(n): return AW @ B[n].tail_local
    names = [g.name for g in body.vertex_groups]
    me.calc_loop_triangles()
    P = [mw @ v.co for v in me.vertices]; NRM = [(mw.to_3x3() @ v.normal).normalized() for v in me.vertices]
    W = [{names[g.group]: g.weight for g in v.groups if g.weight > 1e-4} for v in me.vertices]
    def ws(i, *keys): return sum(x for k, x in W[i].items() if any(k.startswith(kk) or kk in k for kk in keys))
    # landmarks
    up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()
    if fwd.dot(Vector((0, -1, 0))) < 0: fwd = -fwd   # MPFB faces -Y
    hip = hw('Hips'); waist = hw(spec.get('waist_bone', 'Spine01')).z - .02; knee = (hw('LeftLeg').z + hw('RightLeg').z) / 2; ankle = (hw('LeftFoot').z + hw('RightFoot').z) / 2
    shz = (hw('LeftArm').z + hw('RightArm').z) / 2; neckz = hw('neck').z; headp = hw('Head'); top = max(p.z for p in P)
    H = top - min(p.z for p in P); S = H / 1.7
    eye = [P[i] for i in range(len(P)) if ws(i, 'Head') > .5]
    hc = Vector((headp.x, sum(p.y for p in eye) / len(eye), headp.z + .06 * S))   # head centre
    face_front = min(p.y for p in eye)
    print('CHAR landmarks H %.2f waist %.2f knee %.2f ankle %.2f shoulder %.2f neck %.2f head %.2f top %.2f' % (H, waist, knee, ankle, shz, neckz, headp.z, top))
    new = []; covered = set()

    def make_obj(name, bmx, groups, mat_list):
        mesh = bpy.data.meshes.new(name); bmx.to_mesh(mesh); bmx.free()
        o = bpy.data.objects.new(name, mesh); sc.collection.objects.link(o)
        for g in groups: o.vertex_groups.new(name=g)
        for mt in mat_list: mesh.materials.append(mt)
        for p_ in mesh.polygons: p_.use_smooth = True
        o.parent = arm; o.matrix_parent_inverse = AW.inverted()
        md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm; new.append(o); return o

    def cyl_uv(bmx, center, axis, su, sv, ref=None):
        ax = axis.normalized(); r0 = (ref or fwd); x0 = (r0 - ax * r0.dot(ax)).normalized(); y0 = ax.cross(x0)
        uvl = bmx.loops.layers.uv.verify()
        for f in bmx.faces:
            us = []
            for l in f.loops:
                d = l.vert.co - center; u = math.atan2(d.dot(y0), d.dot(x0)) / (2 * math.pi); us.append(u)
            # unwrap seam: keep the face's u values on one side
            if max(us) - min(us) > .5: us = [u + 1 if u < 0 else u for u in us]
            for l, u in zip(f.loops, us): l[uvl].uv = (u * su, (l.vert.co - center).dot(ax) * sv)

    def shell(name, sel, offset, mat, axis_c=None, axis=None, su=4, sv=4, solid=.004, cover=True, ref=None, relax=12, smooth_it=0, smooth_sel=None):
        """offset copy of the body faces whose vertices are all selected; weights copied; optional thickness."""
        faces = [p for p in me.polygons if all(sel[v] for v in p.vertices)]
        bmx = bmesh.new(); dl = bmx.verts.layers.deform.verify(); vm = {}
        gi = {}
        for p in faces:
            vs = []
            for vi in p.vertices:
                if vi not in vm:
                    off = offset(vi) if callable(offset) else offset
                    v = bmx.verts.new(P[vi] + NRM[vi] * off); vm[vi] = v
                    for k, x in W[vi].items():
                        if k not in gi: gi[k] = len(gi)
                        v[dl][gi[k]] = x
                vs.append(vm[vi])
            try: bmx.faces.new(vs)
            except ValueError: pass
        # straighten the stair-stepped cut edges (selection follows whole faces): relax the open border along itself
        bmx.verts.ensure_lookup_table(); bnd = [v for v in bmx.verts if v.is_boundary]
        for it in range(relax):
            newp = {}
            for v in bnd:
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2: newp[v] = v.co * .4 + (nb[0].co + nb[1].co) * .3
            for v, c in newp.items(): v.co = c
        if smooth_it:
            sv_ = [v for v in bmx.verts if smooth_sel is None or smooth_sel(v.co)]
            for _ in range(smooth_it): bmesh.ops.smooth_vert(bmx, verts=sv_, factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        if solid > 0:   # thickness inward, closes the rims at sleeve ends etc.
            r = bmesh.ops.solidify(bmx, geom=list(bmx.faces), thickness=solid)
        bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
        if axis is not None: cyl_uv(bmx, axis_c, axis, su, sv, ref)
        o = make_obj(name, bmx, sorted(gi, key=gi.get), [mat])
        if cover:
            for p in faces: covered.add(p.index)
        return o

    N = len(P)
    hand = [ws(i, 'Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky') for i in range(N)]
    headw = [ws(i, 'Head') for i in range(N)]
    armw = [ws(i, 'Arm', 'ForeArm', 'Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky') for i in range(N)]
    legw = [ws(i, 'UpLeg', 'Leg', 'Foot', 'ToeBase') for i in range(N)]
    footw = [ws(i, 'Foot', 'ToeBase') for i in range(N)]
    is_eye = [False] * N
    # eyes are the separate helper islands near the eye joints: verts not connected to the main body; mark by name of material later

    # ---- TUNIC (long-sleeved under-coat) : upper body + arms to the wrist, up to the collar
    if 'tunic' in spec:
        sel = [P[i].z > waist - .10 * S and hand[i] < .25 and headw[i] < .2 and P[i].z < neckz + .02 * S for i in range(N)]
        shell('tunic', sel, lambda i: .006 * S + .006 * S * smooth(.2, .9, armw[i]), material('tunic', spec['tunic'], .85, 0, 'fabric'),
              hip, up, 6, 6)
    # ---- TROUSERS : legs from the waist down into the boots
    if 'trousers' in spec:
        bt = knee - .10 * S
        sel = [P[i].z < waist and P[i].z > bt - .04 * S and armw[i] < .2 for i in range(N)]
        shell('trousers', sel, lambda i: .010 * S + .012 * S * smooth(bt, knee + .15 * S, P[i].z), material('trousers', spec['trousers'], .9, 0, 'fabric'), hip, up, 6, 6)
    # ---- BOOTS : tall riding boots to just below the knee, wider at the top
    if 'boots' in spec:
        bt = knee - .07 * S
        bootmat = material('boots', spec['boots'], .55, 0, 'leather'); zc = ankle + .035 * S
        sel = [zc - .045 * S < P[i].z < bt and legw[i] > .5 for i in range(N)]
        shell('boots', sel, lambda i: .009 * S + .012 * S * smooth(bt - .22 * S, bt, P[i].z), bootmat, hip, up, 3, 3)
        for p in me.polygons:
            if all(P[v].z < bt and legw[v] > .5 for v in p.vertices): covered.add(p.index)
        for sd in ('Left', 'Right'):
            fa, ba = hw(sd + 'Foot'), hw(sd + 'ToeBase'); fdir = (ba - fa); fdir.z = 0; fdir.normalize()
            pts = [P[i] + NRM[i] * (.008 * S if P[i].z > zc - .02 * S else .007 * S) for i in range(N) if P[i].z < zc + .02 * S and ws(i, sd + 'Foot', sd + 'ToeBase', sd + 'Leg') > .5]
            if len(pts) < 10: continue
            # heel block: a few points behind and under the heel so the boot has a riding-boot heel
            hb = fa - fdir * .045 * S; hb.z = 0
            for dx in (-.025, .025):
                for dz in (0, .035):
                    pts.append(hb + rgt * dx * S + Vector((0, 0, dz * S)))
            bmx = bmesh.new()
            for q in pts: bmx.verts.new(q)
            bmesh.ops.convex_hull(bmx, input=list(bmx.verts))
            bmesh.ops.delete(bmx, geom=[v for v in bmx.verts if not v.link_faces], context='VERTS')
            bmesh.ops.subdivide_edges(bmx, edges=list(bmx.edges), cuts=1, use_grid_fill=True)
            for _ in range(3): bmesh.ops.smooth_vert(bmx, verts=[v for v in bmx.verts if v.co.z > .012 * S], factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            for v in bmx.verts: v.co.z = max(0., v.co.z)
            bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
            dl = bmx.verts.layers.deform.verify(); groups = [sd + 'Leg', sd + 'Foot', sd + 'ToeBase']
            for v in bmx.verts:
                along = (v.co - ba).dot(fdir); tw_ = smooth(-.02 * S, .025 * S, along); lw = smooth(zc - .03 * S, zc + .01 * S, v.co.z) * (1 - tw_)
                w = {sd + 'ToeBase': tw_, sd + 'Leg': lw, sd + 'Foot': max(0., 1 - tw_ - lw)}
                for k, x in w.items():
                    if x > 1e-4: v[dl][groups.index(k)] = x
            cyl_uv(bmx, fa, up, 3, 3)
            make_obj('bootfoot' + sd, bmx, groups, [bootmat])
    # ---- CUIRASS : lamellar body armour, waist to the shoulders, armholes left open
    cu = spec.get('cuirass')
    if cu:
        def vneck(i): p = P[i]; return p.y < hip.y and p.z > shz - .11 * S and abs(p.x - hip.x) < (p.z - (shz - .11 * S)) * .75
        sel = [waist - .05 * S < P[i].z < shz + .03 * S and armw[i] < .12 and headw[i] < .05 and ws(i, 'neck') < .35 and not vneck(i) for i in range(N)]
        shell('cuirass', sel, .028 * S, material('cuirass', cu['color'], .4, .9, 'lamella'), hip, up, 7, 9)
        if cu.get('bracers'):
            for s in ('Left', 'Right'):
                wr, el = hw(s + 'Hand'), hw(s + 'ForeArm'); ax = (el - wr)
                def tf(i, wr=wr, ax=ax): t = (P[i] - wr).dot(ax) / ax.length_squared; return t
                sel = [.06 < tf(i) < .62 and ws(i, s + 'ForeArm', s + 'Hand') > .5 for i in range(N)]
                shell('bracer' + s, sel, lambda i, tf=tf: .012 * S + .010 * S * smooth(.3, .62, tf(i)), material('bracer', [.55, .55, .57], .3, .95), wr, ax, 2, 6, .003, cover=False)
        if cu.get('pauldrons'):
            for s in ('Left', 'Right'):
                sh, el = hw(s + 'Arm'), hw(s + 'ForeArm'); ax = (el - sh)
                def tp(i, sh=sh, ax=ax): return (P[i] - sh).dot(ax) / ax.length_squared
                sel = [(-.25 < tp(i) < .55 and ws(i, s + 'Arm', s + 'Shoulder') > .45 and P[i].z > shz - .22 * S) for i in range(N)]
                shell('pauldron' + s, sel, lambda i, tp=tp: .03 * S + .011 * S * min(2, int(max(0, tp(i) + .25) / .8 * 3)) + .014 * S * ((max(0, tp(i) + .25) / .8 * 3) % 1), material('pauldron', cu['color'], .4, .9, 'lamella'), sh, ax, 4, 9, .004, cover=False, ref=up)
    # ---- BELT
    if 'belt' in spec:
        sel = [waist - .055 * S < P[i].z < waist + .02 * S and armw[i] < .1 for i in range(N)]
        shell('belt', sel, .038 * S, material('belt', spec['belt'], .5, 0, 'leather'), hip, up, 6, 3, .006, cover=False)

    # ---- DRESS SKIRT on 8 bone chains (front slit), + armour TASSETS over it
    def skirt_ring_radius(z, ang_dirs, margin):
        rr = []
        band = [P[i] for i in range(N) if abs(P[i].z - z) < .03 * S and armw[i] < .3]
        for d in ang_dirs:
            best = 0
            for p in band:
                q = p - Vector((hip.x, hip.y, p.z)); dl = q.length
                if dl < 1e-4: continue
                if q.normalized().dot(d) > math.cos(math.radians(14)): best = max(best, dl)
            rr.append((best or .16 * S) + margin)
        return rr
    def skirt(name, ztop, zbot, margin, flare, mat_main, mat_trim, chain, gap_deg, nseg=32, panels=None, gaps=()):
        angs = []
        for k in range(nseg + 1):
            a = math.radians(gap_deg) + k * (2 * math.pi - 2 * math.radians(gap_deg)) / nseg
            angs.append(a)
        dirs = [fwd * math.cos(a) + rgt * math.sin(a) for a in angs]
        rows = 13; zs = [ztop + (zbot - ztop) * j / (rows - 1) for j in range(rows)]
        rad_top = skirt_ring_radius(ztop, dirs, margin); rad_hip = skirt_ring_radius(min(ztop, hip.z - .05 * S), dirs, margin)
        bmx = bmesh.new(); dl = bmx.verts.layers.deform.verify(); grid = []
        for j, z in enumerate(zs):
            t = j / (rows - 1); row = []
            for k, d in enumerate(dirs):
                r = max(rad_top[k] * (1 - smooth(0, .3, t)) + rad_hip[k] * smooth(0, .3, t), rad_top[k]) + flare * t * t * S
                row.append(bmx.verts.new(Vector((hip.x, hip.y, z)) + d * r))
            grid.append(row)
        for j in range(rows - 1):
            for k in range(nseg):
                ac = math.degrees((angs[k] + angs[k + 1]) / 2)
                if any(abs(((ac - g + 180) % 360) - 180) < gw for g, gw in gaps): continue
                f = bmx.faces.new((grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k]))
                edge = (k == 0 or k == nseg - 1) or any(abs(((ac - g + 180) % 360) - 180) < gw + 360 / nseg for g, gw in gaps)
                f.material_index = 1 if (j == rows - 2 or (edge and name != 'dress') or (name == 'dress' and (k == 0 or k == nseg - 1))) and mat_trim else 0
        bmesh.ops.solidify(bmx, geom=list(bmx.faces), thickness=.004 * S)
        bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
        cyl_uv(bmx, Vector((hip.x, hip.y, ztop)), -up, 8, 4)
        # chain bones
        bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; inv = AW.inverted()
        bnames = []
        ncha = 8
        for c in range(ncha):
            a = math.radians(gap_deg) + (c + .5) * (2 * math.pi - 2 * math.radians(gap_deg)) / ncha; d = fwd * math.cos(a) + rgt * math.sin(a)
            k = min(nseg, int(round((a - math.radians(gap_deg)) / ((2 * math.pi - 2 * math.radians(gap_deg)) / nseg))))
            parent = eb['Hips']; pts = []
            for j in (0, 4, 8, 12):
                pts.append(grid[j][k].co.copy())
            for j in range(3):
                b = eb.new('%s%d_%d' % (chain, c, j + 1)); b.head = inv @ pts[j]; b.tail = inv @ pts[j + 1]; b.parent = parent; b.use_connect = False; parent = b; bnames.append(b.name)
        bpy.ops.object.mode_set(mode='OBJECT')
        groups = ['Hips'] + bnames; gi = {g: i for i, g in enumerate(groups)}
        span = 2 * math.pi - 2 * math.radians(gap_deg)
        for v in bmx.verts:
            q = v.co - Vector((hip.x, hip.y, v.co.z)); a = math.atan2(q.dot(rgt), q.dot(fwd)) % (2 * math.pi)
            u = (a - math.radians(gap_deg)) / span * ncha - .5; u = max(0., min(ncha - 1., u)); c0 = int(u); c1 = min(ncha - 1, c0 + 1); fa = u - c0
            s = max(0., min(1., (ztop - v.co.z) / (ztop - zbot))) * 3; seg = min(2, int(s)); ts = s - seg
            hips_w = 1 - smooth(0, .5, s)
            w = {'Hips': hips_w}
            for cc, ca in ((c0, 1 - fa), (c1, fa)):
                for jj, ja in ((seg, 1 - max(0, ts - .5)), (min(2, seg + 1), max(0, ts - .5))):
                    n = '%s%d_%d' % (chain, cc, jj + 1); w[n] = w.get(n, 0) + (1 - hips_w) * ca * ja
            tot = sum(w.values())
            for n, x in w.items():
                if x > 1e-4: v[dl][gi[n]] = x / tot
        return make_obj(name, bmx, groups, [mat_main] + ([mat_trim] if mat_trim else []))
    dr = spec.get('dress')
    if dr:
        hem = knee - .02 * S if dr.get('hem') == 'knee' else ankle + .1 * S
        skirt('dress', waist - .02 * S, hem, .03 * S, .07, material('dress', dr['color'], .85, 0, 'fabric'), material('dress_trim', dr['trim'], .7, 0, 'leather'), 'Skirt', 9 if dr.get('slit') else 0, 64)
    if cu and cu.get('tassets'):
        skirt('tassets', waist - .035 * S, waist - .24 * S, .032 * S, .03, material('tasset', cu['color'], .4, .9, 'lamella'), material('tasset_edge', cu['edge'], .6, 0, 'leather'), 'Tasset', 17, 60, gaps=((80, 3), (180, 34), (280, 3)))

    # ---- SCARF cap over the hair (face left open), its triangle DRAPE down the back, hair at the temples
    scf = spec.get('scarf')
    def scarf_hood(scf):
        # UV sphere around the head, face opening and the part below the jaw removed, shrink-wrapped onto the head + offset,
        # weights transferred from the body (Head -> neck at the lower edge)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=.16 * S, location=hc)
        o = bpy.context.active_object; o.name = 'scarf'; m = o.data
        bmx = bmesh.new(); bmx.from_mesh(m); dead = []
        for v in bmx.verts:
            p = v.co + hc
            d = (p - hc); front = -d.y
            FB = spec.get('_face')
            fz = (FB['chin'] - .01) if FB else hc.z - .07 * S
            low = fz if front > .03 * S else neckz - .06 * S + (fz - neckz + .06 * S) * smooth(-.03 * S, .03 * S, front)
            if p.z < low: dead.append(v); continue
            # face opening: an oval from just above the brows to below the chin, ears covered
            if FB:   # measured on the MetaHuman head
                ox = (p.x - FB['cx']) / (FB['halfw'] + .01); oz = (p.z - (FB['brow'] + FB['chin']) / 2) / ((FB['brow'] - FB['chin']) / 2 + .02)
                if front > 0 and ox * ox + oz * oz < 1 and p.z < FB['brow'] + .025: dead.append(v)
            else:
                ox = d.x / (.075 * S); oz = (p.z - (hc.z - .055 * S)) / (.085 * S)
                if front > 0 and ox * ox + oz * oz < 1 and p.z < hairline + .005 * S: dead.append(v)
        bmesh.ops.delete(bmx, geom=dead, context='VERTS'); bmx.to_mesh(m); bmx.free()
        o.location = (0, 0, 0)
        for v in m.vertices: v.co = v.co + hc
        sw = o.modifiers.new('sw', 'SHRINKWRAP'); sw.target = body; sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.offset = .02 * S
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='sw')
        sm = o.modifiers.new('sm', 'SMOOTH'); sm.factor = .8; sm.iterations = 6; bpy.ops.object.modifier_apply(modifier='sm')
        if spec.get('_face'):   # the hood must not lie on the face: drop what the wrap pulled onto the cheeks / forehead
            FB = spec['_face']; bmx = bmesh.new(); bmx.from_mesh(m)
            bmesh.ops.delete(bmx, geom=[v for v in bmx.verts if v.co.y < FB['front'] + .075 and v.co.z < FB['brow'] + .012 and abs(v.co.x - FB['cx']) < FB['halfw'] + .035], context='VERTS')
            bmx.to_mesh(m); bmx.free()
        # loosen at the back (cloth over the braids' roots) and let the lower edge hang down a little
        for v in m.vertices:
            d = v.co - hc
            if d.y > 0: v.co.y += .012 * S * smooth(0, .1 * S, d.y)
        so = o.modifiers.new('so', 'SOLIDIFY'); so.thickness = .004 * S; so.offset = -1; bpy.ops.object.modifier_apply(modifier='so')
        for p_ in m.polygons: p_.use_smooth = True
        # weights from the body
        for g in ('Head', 'neck', 'Spine'): o.vertex_groups.new(name=g)
        for v in m.vertices:
            hz = smooth(neckz + .0 * S, neckz + .07 * S, v.co.z); sz = 1 - smooth(neckz - .07 * S, neckz - .01 * S, v.co.z)
            w = {'Head': hz, 'neck': (1 - hz) * (1 - sz), 'Spine': (1 - hz) * sz}
            for k, x in w.items():
                if x > 1e-4: o.vertex_groups[k].add([v.index], x, 'REPLACE')
        bmx = bmesh.new(); bmx.from_mesh(m); cyl_uv(bmx, hc, up, 4, 4); bmx.to_mesh(m); bmx.free()
        m.materials.append(material('scarf', scf['color'], .85, 0, 'fabric'))
        o.parent = arm; o.matrix_parent_inverse = AW.inverted(); md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm; new.append(o)
        for p in me.polygons:
            if spec.get('_face'):   # MetaHuman head: only the skull under the hood goes (above the brows or behind the ears)
                FB = spec['_face']
                if all(headw[v] > .4 and (P[v].z > FB['brow'] + .045 or P[v].y > FB['front'] + .11) for v in p.vertices): covered.add(p.index)
            elif all(headw[v] > .4 and P[v].z > neckz + .05 * S and not in_face(v) for v in p.vertices): covered.add(p.index)
    hairline = hc.z + .02 * S
    def in_face(i):
        p = P[i]; return p.y < hc.y - .025 * S and p.z < hairline and abs(p.x - hc.x) < .075 * S
    if scf:
        scarf_hood(scf)
        if scf.get('drape'):
            # triangle of cloth from the back of the head to between the shoulder blades, following the back + 3 bone chain
            back = [P[i] for i in range(N) if P[i].y > hc.y and abs(P[i].x - hc.x) < .2 * S]
            def back_y(x, z):
                cand = [p.y for p in back if abs(p.x - x) < .03 * S and abs(p.z - z) < .03 * S]
                return max(cand) if cand else hc.y + .1 * S
            z0, z1 = hc.z - .02 * S, shz - .22 * S; rows, colsn = 8, 9; bmx = bmesh.new(); dl = bmx.verts.layers.deform.verify(); grid = []
            for j in range(rows):
                t = j / (rows - 1); z = z0 + (z1 - z0) * t; half = (.085 * S + .02 * S * math.sin(min(1, t * 2) * math.pi)) * (1 - t ** 1.6) + .006 * S; row = []
                for k in range(colsn):
                    x = hc.x + (k / (colsn - 1) * 2 - 1) * half
                    y = back_y(x, z) + (.04 * S if z > neckz else .022 * S)
                    row.append(bmx.verts.new(Vector((x, y, z))))
                grid.append(row)
            for j in range(rows - 1):
                for k in range(colsn - 1): bmx.faces.new((grid[j][k], grid[j + 1][k], grid[j + 1][k + 1], grid[j][k + 1]))
            bmesh.ops.solidify(bmx, geom=list(bmx.faces), thickness=.003 * S); bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
            cyl_uv(bmx, hc, -up, 3, 3)
            bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; inv = AW.inverted()
            parent = eb['Head']; dn = []
            for j in range(3):
                za, zb = z0 + (z1 - z0) * j / 3, z0 + (z1 - z0) * (j + 1) / 3
                b = eb.new('Drape%d' % (j + 1)); b.head = inv @ Vector((hc.x, back_y(hc.x, za) + .03 * S, za)); b.tail = inv @ Vector((hc.x, back_y(hc.x, zb) + .03 * S, zb)); b.parent = parent; b.use_connect = False; parent = b; dn.append(b.name)
            bpy.ops.object.mode_set(mode='OBJECT')
            groups = ['Head'] + dn; gi = {g: i for i, g in enumerate(groups)}
            for v in bmx.verts:
                s = (z0 - v.co.z) / (z0 - z1) * 3; seg = min(2, max(0, int(s))); ts = s - seg; hw_ = 1 - smooth(0, .6, s)
                w = {'Head': hw_, dn[seg]: (1 - hw_) * (1 - max(0, ts - .5))}
                if seg < 2: w[dn[seg + 1]] = (1 - hw_) * max(0, ts - .5)
                tot = sum(w.values())
                for n, x in w.items():
                    if x > 1e-4: v[dl][gi[n]] = x / tot
            make_obj('drape', bmx, groups, [bpy.data.materials['scarf']])
    if 'hair' in spec:
        sel = [headw[i] > .5 and in_face(i) and P[i].z > hc.z - .02 * S and abs(P[i].x - hc.x) > .045 * S for i in range(N)]
        shell('hair', sel, .004 * S, material('hair', spec['hair'], .45), hc, up, 4, 4, 0, cover=False)

    # ---- BRAIDS : from behind the ears, over the front of the shoulders, down the chest; 5-bone chains
    br = spec.get('braids')
    if br:
        chest_front = min(P[i].y for i in range(N) if abs(P[i].z - (shz - .12 * S)) < .02 * S and armw[i] < .1)
        for s, sg in (('Left', -1), ('Right', 1)):
            side = rgt * sg
            p0 = Vector((hc.x, hc.y + (.06 if spec.get('_face') else .03) * S, hc.z - .05 * S)) + side * .072 * S
            p1 = Vector((hip.x, hc.y - .01 * S, neckz - .02 * S)) + side * .10 * S
            p2 = Vector((hip.x, chest_front - .055 * S, shz - .10 * S)) + side * .095 * S
            p3 = Vector((hip.x, chest_front - .06 * S, shz - .30 * S)) + side * .085 * S
            p4 = Vector((hip.x, chest_front - .05 * S, waist + .02 * S)) + side * .08 * S
            p5 = Vector((hip.x, chest_front - .04 * S, waist - .10 * S)) + side * .08 * S
            pts = [p0, p1, p2, p3, p4, p5]
            samples = []
            for k in range(5):
                for j in range(24): samples.append(pts[k].lerp(pts[k + 1], j / 24))
            samples.append(p5)
            bmx = bmesh.new(); dl = bmx.verts.layers.deform.verify(); seg = 10; rings = []
            L = sum((samples[i + 1] - samples[i]).length for i in range(len(samples) - 1)); acc = 0
            for i, c in enumerate(samples):
                if i: acc += (samples[i] - samples[i - 1]).length
                t = acc / L; ax = (samples[min(i + 1, len(samples) - 1)] - samples[max(i - 1, 0)]).normalized()
                x = (rgt - ax * rgt.dot(ax)).normalized(); y = ax.cross(x)
                ph = t * math.pi * 30; plait = abs(math.sin(ph))
                r = .024 * S * (1 - .3 * t) * (.95 + .06 * plait)
                if t > .9: r *= 1 - (t - .9) * 4   # tip
                off = x * r * .06 * math.sin(ph)
                rv = [bmx.verts.new(c + off + (x * math.cos(a) + y * math.sin(a) * .85) * r) for a in [k * 2 * math.pi / seg for k in range(seg)]]
                rings.append((rv, t))
            for (a, ta), (b2, tb2) in zip(rings, rings[1:]):
                for k in range(seg):
                    f = bmx.faces.new((a[k], a[(k + 1) % seg], b2[(k + 1) % seg], b2[k])); f.material_index = 1 if .80 < ta < .86 else 0
            bmx.faces.new(rings[-1][0][::-1]); bmx.faces.new(rings[0][0])
            bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
            uvl = bmx.loops.layers.uv.verify()
            for f in bmx.faces:
                for l in f.loops: l[uvl].uv = (0, 0)
            bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; inv = AW.inverted()
            parent = eb['Head']; bn = []
            for k in range(5):
                b = eb.new('Braid%s%d' % (s[0], k + 1)); b.head = inv @ pts[k]; b.tail = inv @ pts[k + 1]; b.parent = parent; b.use_connect = False; parent = b; bn.append(b.name)
            bpy.ops.object.mode_set(mode='OBJECT')
            groups = ['Head'] + bn; gi = {g: i for i, g in enumerate(groups)}
            for rv, t in rings:
                for v in rv:
                    best = None
                    for k in range(5):
                        a, b2 = pts[k], pts[k + 1]; ab = b2 - a; tt = max(0, min(1, (v.co - a).dot(ab) / ab.length_squared)); d = (v.co - (a + ab * tt)).length
                        if best is None or d < best[0]: best = (d, k, tt)
                    _, k, tt = best; w = {bn[k]: 1.}
                    if tt > .6 and k < 4: w = {bn[k]: 1 - (tt - .6), bn[k + 1]: tt - .6}
                    if k == 0 and tt < .4: w = {'Head': .4 - tt, bn[0]: .6 + tt}
                    tot = sum(w.values())
                    for n, x in w.items(): v[dl][gi[n]] = x / tot
            make_obj('braid' + s, bmx, groups, [material('braid', spec.get('hair', [.02, .02, .02]), .4), material('braid_tie', br.get('tie', [.5, .1, .07]), .6)])

    # ---- AMULET : small gold triangle pointing DOWN on the chest, on a cord (author: identical everywhere)
    if spec.get('amulet'):
        cz = shz - .13 * S
        cf = min(P[i].y for i in range(N) if abs(P[i].z - cz) < .02 * S and armw[i] < .1 and abs(P[i].x - hip.x) < .05 * S) - .03 * S - .005 * S
        bmx = bmesh.new(); dl = bmx.verts.layers.deform.verify(); a = .032 * S; c = Vector((hip.x, cf, cz))
        tri = [c + up * a * .6 + rgt * a * .62, c + up * a * .6 - rgt * a * .62, c - up * a * .7]
        front = [bmx.verts.new(p) for p in tri]; backv = [bmx.verts.new(p + Vector((0, .006 * S, 0))) for p in tri]
        bmx.faces.new(front); bmx.faces.new(backv[::-1])
        for k in range(3): bmx.faces.new((front[k], backv[k], backv[(k + 1) % 3], front[(k + 1) % 3]))
        # cord: two thin strands up to the neck
        for sg in (-1, 1):
            q0 = c + up * a * .6 + rgt * sg * a * .3; q1 = Vector((hip.x, hc.y + .02 * S, neckz - .01 * S)) + rgt * sg * .055 * S
            ax = (q1 - q0).normalized(); x = (fwd - ax * fwd.dot(ax)).normalized(); y = ax.cross(x); rr = .0025 * S; ringv = []
            for e in (q0, q1): ringv.append([bmx.verts.new(e + (x * math.cos(t) + y * math.sin(t)) * rr) for t in [k * 2 * math.pi / 5 for k in range(5)]])
            for k in range(5): bmx.faces.new((ringv[0][k], ringv[0][(k + 1) % 5], ringv[1][(k + 1) % 5], ringv[1][k]))
        bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
        for v in bmx.verts: v[dl][0] = 1.
        make_obj('amulet', bmx, ['Spine'], [material('gold', [1.0, .76, .30], .25, 1.)])

    # ---- JEWELLERY: coin band across the forehead at the scarf edge + bead pendants at the temples (reference portrait)
    if spec.get('jewels'):
        bmx = bmesh.new(); dl = bmx.verts.layers.deform.verify()
        front = [P[i] for i in range(N) if headw[i] > .5 and P[i].y < hc.y]
        def fy(x, z):
            c = [p.y for p in front if abs(p.x - x) < .012 * S and abs(p.z - z) < .012 * S]; return min(c) if c else (spec['_face']['front'] + .065 if spec.get('_face') else face_front)
        def disc(c, nrm, r, mi):
            g = bmesh.ops.create_cone(bmx, cap_ends=True, segments=10, radius1=r, radius2=r, depth=r * .35, matrix=Matrix.Translation(c) @ nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4())
            for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index = mi
        def bead(c, r, mi):
            g = bmesh.ops.create_icosphere(bmx, subdivisions=1, radius=r, matrix=Matrix.Translation(c))
            for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index = mi
        zb = hairline - .006 * S; n = 9
        for k in range(n):
            u = k / (n - 1) * 2 - 1; x = hc.x + u * ((spec['_face']['halfw'] + .01) if spec.get('_face') else .07 * S); z = (zb if not spec.get('_face') else spec['_face']['brow'] + .022) + .012 * S * (1 - u * u)
            c = Vector((x, fy(x, z) - .012 * S, z)); nrm = (c - hc); nrm.z *= .3; nrm.normalize()
            disc(c, nrm, .0062 * S, 0)
            if k < n - 1: bead(Vector((x + .00875 * S, c.y, z - .004 * S)), .0035 * S, 1)
            for j in range(2): bead(c - Vector((0, 0, .012 * S + j * .007 * S)), .003 * S, 0 if j else 1)
        mz = spec['_lm']['mouth'].z if spec.get('_lm') and spec['_lm'].get('mouth') else hc.z - .09 * S
        for sg in (-1, 1):
            x = (spec['_face']['cx'] + sg * (spec['_face']['halfw'] + .018)) if spec.get('_face') else hc.x + sg * .078 * S; zz = (spec['_face']['brow'] + .01) if spec.get('_face') else hairline - .01 * S; k = 0
            while zz > mz - .01 * S:
                c = Vector((x, fy(x, zz) - .002 * S, zz)); bead(c, .0045 * S if k % 2 else .0035 * S, k % 2); zz -= .011 * S; k += 1
            disc(Vector((x, fy(x, zz) - .002 * S, zz - .006 * S)), -fwd, .007 * S, 0)
        for v in bmx.verts: v[dl][0] = 1.
        bmesh.ops.recalc_face_normals(bmx, faces=bmx.faces)
        make_obj('jewels', bmx, ['Head'], [material('silver', [.82, .82, .85], .28, 1.), material('coral', [.72, .22, .12], .4)])

    # ---- SKIN with the reference portrait projected onto the face (author: faces as in the approved pictures)
    fs = spec.get('face'); skin_rgb = spec.get('skin', [.6, .42, .3])
    eye_vs = {i for i in range(N) if any(k in W[i] for k in ('helper-l-eye', 'helper-r-eye'))}
    mats = []
    if fs and spec.get('_lm'):
        im = bpy.data.images.load(os.path.join(spec['_dir'], fs['img'])); IW, IH = im.size
        src = np.array(im.pixels[:], dtype=np.float32).reshape(IH, IW, 4)[::-1, :, :3]   # row 0 = top, sRGB values
        lm = dict(spec['_lm'])
        ez = (lm['eyeL'].z + lm['eyeR'].z) / 2; mid = [P[i] for i in range(N) if abs(P[i].x - hc.x) < .005 * S and headw[i] > .5 and P[i].y < hc.y and i not in eye_vs]
        prof = sorted(mid, key=lambda p: p.z)
        nose = min((p for p in prof if ez - .07 * S < p.z < ez - .015 * S), key=lambda p: p.y)
        cand = [p for p in prof if nose.z - .045 * S < p.z < nose.z - .012 * S]
        lips = [p for p in cand if p.y < nose.y + .03 * S]
        slit = max(lips, key=lambda p: p.y) if lips else Vector((0, 0, nose.z - .025 * S))
        lm['mouth'] = Vector((hc.x, slit.y, slit.z))
        print('CHAR face eyes z %.3f nose z %.3f mouth z %.3f eye verts %d' % (ez, nose.z, slit.z, len(eye_vs)))
        def ab(p): return (p.dot(rgt), p.z)
        A = np.array([[*ab(lm['eyeR']), 1], [*ab(lm['eyeL']), 1], [*ab(lm['mouth']), 1]]); Bm = np.array([fs['eyeR'], fs['eyeL'], fs['mouth']], dtype=float)
        M = np.linalg.solve(A, Bm)                                # [a b 1] @ M = [px py]
        def sample(px, py):
            x = np.clip(px, 0, IW - 1.001); y = np.clip(py, 0, IH - 1.001); x0 = x.astype(int); y0 = y.astype(int); fx = (x - x0)[..., None]; fy_ = (y - y0)[..., None]
            return (src[y0, x0] * (1 - fx) + src[y0, x0 + 1] * fx) * (1 - fy_) + (src[y0 + 1, x0] * (1 - fx) + src[y0 + 1, x0 + 1] * fx) * fy_
        sk = sample(np.array([float(fs['skin_px'][0])]), np.array([float(fs['skin_px'][1])]))[0]
        TS = 1024; tex = np.ones((TS, TS, 3), np.float32) * sk
        ea, eb_ = ab(lm['eyeR']), ab(lm['eyeL']); ma = ab(lm['mouth']); ed = abs(eb_[0] - ea[0]); em = (ea[1] + eb_[1]) / 2 - ma[1]
        ca = (ea[0] + eb_[0]) / 2; cb = (ea[1] + eb_[1]) / 2 - em * .3
        uvd = me.uv_layers.active.data
        for t in me.loop_triangles:
            vs = t.vertices
            if any(v in eye_vs for v in vs) or not all(headw[v] > .4 for v in vs): continue
            if sum(NRM[v].dot(fwd) for v in vs) < 0: continue
            uv = np.array([uvd[l].uv[:] for l in t.loops]) * (TS - 1); q = np.array([ab(P[v]) for v in vs]); fc = np.array([NRM[v].dot(fwd) for v in vs])
            x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
            if x1 - x0 > 200 or y1 - y0 > 200: continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
            d = (uv[1, 1] - uv[2, 1]) * (uv[0, 0] - uv[2, 0]) + (uv[2, 0] - uv[1, 0]) * (uv[0, 1] - uv[2, 1])
            if abs(d) < 1e-9: continue
            l0 = ((uv[1, 1] - uv[2, 1]) * (gx - uv[2, 0]) + (uv[2, 0] - uv[1, 0]) * (gy - uv[2, 1])) / d
            l1 = ((uv[2, 1] - uv[0, 1]) * (gx - uv[2, 0]) + (uv[0, 0] - uv[2, 0]) * (gy - uv[2, 1])) / d; l2 = 1 - l0 - l1
            ins = (l0 >= -.02) & (l1 >= -.02) & (l2 >= -.02)
            if not ins.any(): continue
            a_ = l0 * q[0, 0] + l1 * q[1, 0] + l2 * q[2, 0]; b_ = l0 * q[0, 1] + l1 * q[1, 1] + l2 * q[2, 1]; f_ = l0 * fc[0] + l1 * fc[1] + l2 * fc[2]
            ux = (a_ - ca) / (ed * .95); uy = (b_ - cb) / (em * 1.25)
            top = np.where(uy > 0, uy / max(.2, (.30 * em + .3 * em) / (em * 1.25) / .75), -uy / 1.15)   # stop above the brows (the portrait has jewels there)
            r = np.sqrt(ux ** 2 + top ** 2)
            wgt = (1 - np.clip((r - .75) / .3, 0, 1)) * np.clip((f_ - .15) / .35, 0, 1)
            wgt[~ins] = 0
            if wgt.max() <= 0: continue
            # the portrait has a hair strand over her right cheek: that side's outer cheek takes the mirrored clean side
            side_r = np.sign(a_ - ca) == np.sign(ea[0] - ca); mir = np.clip((np.abs(ux) - .32) / .15, 0, 1) * side_r
            pxy = np.stack([a_, b_, np.ones_like(a_)], -1) @ M; pxm = np.stack([2 * ca - a_, b_, np.ones_like(a_)], -1) @ M
            col = sample(pxy[..., 0], pxy[..., 1]) * (1 - mir[..., None]) + sample(pxm[..., 0], pxm[..., 1]) * mir[..., None]
            ys, xs = gy.clip(0, TS - 1), gx.clip(0, TS - 1)
            cur = tex[ys, xs]; tex[ys, xs] = cur * (1 - wgt[..., None]) + col * wgt[..., None]
        tex = tex[::-1]
        sim = img_from('skin_face', tex.clip(0, 1)); sim.filepath_raw = os.path.join(spec['_dir'], 'out', 'skin_face_dbg.png'); sim.file_format = 'PNG'; sim.save()
        for nm_, pp in (('eyeR', lm['eyeR']), ('eyeL', lm['eyeL']), ('mouth', lm['mouth']), ('nose', nose)): print('CHAR map', nm_, np.array([*ab(pp), 1]) @ M)
        m = bpy.data.materials.new('skin'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = .55
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = sim; nt.links.new(tn.outputs['Color'], bs.inputs['Base Color']); mats.append(m)
        me_e = bpy.data.materials.new('eyes'); me_e.use_nodes = True; nt = me_e.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = .15
        ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = im; im.pack(); nt.links.new(ti.outputs['Color'], bs.inputs['Base Color']); mats.append(me_e)
        body.data.materials.clear()
        for m_ in mats: body.data.materials.append(m_)
        mats = []
        for poly in me.polygons:
            if all(v in eye_vs for v in poly.vertices):
                poly.material_index = 1
                for li in poly.loop_indices:
                    pxy = np.array([*ab(P[me.loops[li].vertex_index]), 1]) @ M; uvd[li].uv = (pxy[0] / IW, 1 - pxy[1] / IH)
    elif not spec.get('keep_skin'):
        mats.append(material('skin', skin_rgb, .55))
    if mats:
        body.data.materials.clear()
        for m in mats: body.data.materials.append(m)
    for g in ('helper-l-eye', 'helper-r-eye'):
        if g in body.vertex_groups: body.vertex_groups.remove(body.vertex_groups[g])
    # ---- body faces hidden under garments go away (no clipping); keep a one-face margin at every garment edge
    if covered:
        edge_v = set()
        cov = covered
        for p in me.polygons:
            if p.index not in cov:
                for v in p.vertices: edge_v.add(v)
        dead = [p.index for p in me.polygons if p.index in cov and not any(v in edge_v for v in p.vertices)]
        bmx = bmesh.new(); bmx.from_mesh(me); bmx.faces.ensure_lookup_table()
        bmesh.ops.delete(bmx, geom=[bmx.faces[i] for i in dead], context='FACES'); bmx.to_mesh(me); bmx.free()
    print('CHAR garments', [o.name for o in new])
