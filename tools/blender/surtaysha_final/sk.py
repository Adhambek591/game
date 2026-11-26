# Surtaysha armour kit: shared geometry helpers (Blender 5.1, headless).
import bpy, bmesh, math, json, random
import numpy as np
from mathutils import Vector, Matrix

OUT = r"F:\qirq-qiz\tools\blender\surtaysha_final\out"
LM = json.load(open(OUT + r"\landmarks.json"))
BONES = LM['bones']

def bone(n, end='head'):
    return Vector(BONES[n][end])

# ---------------------------------------------------------------- mesh basics
def coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    return c

def make_obj(name, verts, faces, uvs=None, col='SUR', mat=None, smooth=True):
    """verts list of xyz, faces list of index tuples, uvs: list per face-corner (same structure as faces) or None"""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    if uvs is not None:
        uvl = me.uv_layers.new(name='UVMap')
        flat = [uv for f in uvs for uv in f]
        uvl.data.foreach_set('uv', np.array(flat, dtype=np.float32).ravel())
    me.validate(clean_customdata=False)
    if smooth:
        me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    coll(col).objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob

def _fnorm(mb, f):
    P = [Vector(mb.v[i]) for i in f]
    n = Vector()
    for k in range(len(P)):
        n += P[k].cross(P[(k + 1) % len(P)])
    return n, sum(P, Vector()) / len(P)

def orient_faces(mb, f0, center_fn):
    """reverse faces mb.f[f0:] if on balance they point toward center_fn(face_index, face_centre)"""
    sc = 0.0
    for fi in range(f0, len(mb.f)):
        n, c = _fnorm(mb, mb.f[fi])
        sc += n.dot(c - center_fn(fi, c))
    if sc < 0:
        for fi in range(f0, len(mb.f)):
            mb.f[fi] = tuple(reversed(mb.f[fi])); mb.uv[fi] = list(reversed(mb.uv[fi]))
        return True
    return False

class MB:
    """Mesh builder accumulating verts / faces / per-corner uvs / per-face material slot."""
    def __init__(self):
        self.v = []; self.f = []; self.uv = []; self.m = []
    def add_v(self, p):
        self.v.append(tuple(p)); return len(self.v) - 1
    def add_f(self, idx, uvs, mat=0):
        self.f.append(tuple(idx)); self.uv.append([tuple(u) for u in uvs]); self.m.append(mat)
    def extend(self, other, M=None, uv_off=(0, 0), uv_scale=(1, 1), mat_map=None):
        base = len(self.v)
        if M is None:
            self.v += other.v
        else:
            V = np.array(other.v, dtype=np.float64)
            R = np.array(M.to_3x3()); T = np.array(M.translation)
            V = V @ R.T + T
            self.v += [tuple(p) for p in V]
        for f, u, m in zip(other.f, other.uv, other.m):
            self.f.append(tuple(i + base for i in f))
            self.uv.append([(a * uv_scale[0] + uv_off[0], b * uv_scale[1] + uv_off[1]) for a, b in u])
            self.m.append(mat_map[m] if mat_map else m)
    def build(self, name, mats=(), col='SUR', smooth=True):
        ob = make_obj(name, self.v, self.f, self.uv, col=col, smooth=smooth)
        for mt in mats:
            ob.data.materials.append(mt)
        if len(mats) > 1:
            ob.data.polygons.foreach_set('material_index', self.m)
        return ob

# ---------------------------------------------------------------- curves / frames
def superellipse(a, b, n, t):
    c, s = math.cos(t), math.sin(t)
    x = a * math.copysign(abs(c) ** (2.0 / n), c)
    y = b * math.copysign(abs(s) ** (2.0 / n), s)
    return x, y

def resample(pts, step=None, count=None, closed=False):
    """resample a polyline (list of Vector) by arc length"""
    P = list(pts) + ([pts[0]] if closed else [])
    L = [0.0]
    for i in range(1, len(P)):
        L.append(L[-1] + (P[i] - P[i - 1]).length)
    tot = L[-1]
    if count is None:
        count = max(2, int(round(tot / step)) + (0 if closed else 1))
    out = []
    n = count if closed else count - 1
    j = 0
    for k in range(count):
        d = tot * k / n
        while j < len(L) - 2 and L[j + 1] < d:
            j += 1
        seg = L[j + 1] - L[j]
        t = 0 if seg < 1e-9 else (d - L[j]) / seg
        out.append(P[j].lerp(P[j + 1], t))
    return out, tot

def polyline_len(P):
    return sum((P[i] - P[i - 1]).length for i in range(1, len(P)))

def smooth_pts(P, it=3, closed=False):
    P = [p.copy() for p in P]
    for _ in range(it):
        Q = [p.copy() for p in P]
        for i in range(len(P)):
            if not closed and (i == 0 or i == len(P) - 1):
                continue
            Q[i] = (P[i - 1] + P[i] * 2 + P[(i + 1) % len(P)]) / 4
        P = Q
    return P

# ---------------------------------------------------------------- sweep (straps, edging, rims)
def sweep(mb, pts, ups, profile, closed=False, uv_v=(0, 1), u_scale=1.0, mat=0, cap=False, u0=0.0):
    """Sweep a 2D profile [(across, up)] along pts. ups = per-point 'up' (surface normal) vectors.
    U = arc length * u_scale (trim-sheet tiling), V = profile parameter mapped into uv_v range.
    Returns list of rings (vertex indices)."""
    n = len(pts)
    rings = []
    f_start = len(mb.f)
    # profile param for V
    plen = [0.0]
    for i in range(1, len(profile)):
        plen.append(plen[-1] + math.dist(profile[i], profile[i - 1]))
    pv = [uv_v[0] + (uv_v[1] - uv_v[0]) * (l / plen[-1]) for l in plen]
    arc = [u0]
    for i in range(1, n):
        arc.append(arc[-1] + (pts[i] - pts[i - 1]).length)
    for i in range(n):
        if closed:
            t = (pts[(i + 1) % n] - pts[i - 1])
        else:
            t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t.normalize()
        up = ups[i] - t * ups[i].dot(t); up.normalize()
        side = t.cross(up)
        ring = [mb.add_v(pts[i] + side * a + up * b) for a, b in profile]
        rings.append(ring)
    segs = n if closed else n - 1
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % n]
        u0_, u1_ = arc[i] * u_scale, (arc[i] + (pts[(i + 1) % n] - pts[i]).length) * u_scale
        for k in range(len(profile) - 1):
            mb.add_f((r0[k], r1[k], r1[k + 1], r0[k + 1]),
                     ((u0_, pv[k]), (u1_, pv[k]), (u1_, pv[k + 1]), (u0_, pv[k + 1])), mat)
    cents = [sum((Vector(mb.v[i]) for i in r), Vector()) / len(r) for r in rings]
    nprof = len(profile) - 1
    orient_faces(mb, f_start, lambda fi, c: (cents[((fi - f_start) // nprof) % n] + cents[(((fi - f_start) // nprof) + 1) % n]) / 2)
    if cap and not closed:
        for r, rev in ((rings[0], True), (rings[-1], False)):
            idx = r[::-1] if rev else r
            mb.add_f(idx, [(uv_v[0] * 0 + 0.001, pv[0])] * len(idx), mat)
    return rings

def rect_profile(w, t, bevel=0.0):
    """closed-ish strap profile (across, up) running around the cross-section; first==last point for UV continuity"""
    hw = w / 2
    if bevel <= 0:
        return [(-hw, 0), (-hw, t), (hw, t), (hw, 0), (-hw, 0)]
    b = bevel
    return [(-hw, 0), (-hw, t - b), (-hw + b, t), (hw - b, t), (hw, t - b), (hw, 0), (-hw, 0)]

# ---------------------------------------------------------------- lathe
def lathe(mb, prof, segs, sx=1.0, sy=1.0, center=Vector((0, 0, 0)), uv_rect=(0, 0, 1, 1), mat=0, closed_top=False, start=0.0, end=2 * math.pi, closed=True):
    """prof list of (r, z). ellipse scaled sx/sy. UV: u around, v along profile. returns rings"""
    rings = []
    f_start = len(mb.f)
    plen = [0.0]
    for i in range(1, len(prof)):
        plen.append(plen[-1] + math.dist(prof[i], prof[i - 1]))
    tot = plen[-1] if plen[-1] > 0 else 1
    ns = segs if closed else segs + 1
    for i, (r, z) in enumerate(prof):
        ring = []
        for k in range(ns):
            a = start + (end - start) * k / segs
            ring.append(mb.add_v(center + Vector((math.sin(a) * r * sx, -math.cos(a) * r * sy, z))))
        rings.append(ring)
    u0, v0, u1, v1 = uv_rect
    for i in range(len(prof) - 1):
        for k in range(segs):
            k1 = (k + 1) % ns
            ua, ub = u0 + (u1 - u0) * k / segs, u0 + (u1 - u0) * (k + 1) / segs
            va, vb = v0 + (v1 - v0) * plen[i] / tot, v0 + (v1 - v0) * plen[i + 1] / tot
            mb.add_f((rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k]),
                     ((ua, va), (ub, va), (ub, vb), (ua, vb)), mat)
    orient_faces(mb, f_start, lambda fi, c: Vector((center.x, center.y, c.z)))
    return rings

# ---------------------------------------------------------------- the ONE lamellar plate
PLATE_W, PLATE_H, PLATE_T = 0.030, 0.066, 0.0018
ATLAS_COLS, ATLAS_ROWS = 8, 6
TILE_W, TILE_H = 1.0 / ATLAS_COLS, (3900 / 4096) / ATLAS_ROWS

def _rrect_outline(w, h, rt, rb):
    """12 boundary points (ccw from bottom-left going right) matching a 4x4 grid boundary:
    bottom: BL, b1, b2, BR, right: r1, r2, TR, top: t2, t1, TL, left: l2, l1"""
    hw = w / 2
    c45 = 1 - math.cos(math.pi / 4)
    pts = [
        (-hw + rb * c45, rb * c45), (-hw + rb, 0), (hw - rb, 0),
        (hw - rb * c45, rb * c45), (hw, rb), (hw, h - rt),
        (hw - rt * c45, h - rt * c45), (hw - rt, h), (-hw + rt, h),
        (-hw + rt * c45, h - rt * c45), (-hw, h - rt), (-hw, rb)]
    return pts

def plate_mesh(w=PLATE_W, h=PLATE_H, t=PLATE_T, bow=0.0022, bulge=0.0012, tile=(0, 0), lace=None):
    """The base plate: 4x4 vertex front grid (Coons-patched into a rounded rectangle), back grid, side walls.
    Origin at bottom-centre of the plate back surface; +Y = up the plate, +Z = outward normal, X = across.
    UV: front island in left half of the atlas tile, back island in right half."""
    mb = MB()
    B = _rrect_outline(w, h, rt=w * 0.42, rb=w * 0.16)
    # grid boundary indices on 4x4 grid (i=col 0..3, j=row 0..3)
    gb = {(0, 0): 0, (1, 0): 1, (2, 0): 2, (3, 0): 3, (3, 1): 4, (3, 2): 5, (3, 3): 6, (2, 3): 7, (1, 3): 8, (0, 3): 9, (0, 2): 10, (0, 1): 11}
    G = {}
    for (i, j), k in gb.items():
        G[(i, j)] = B[k]
    for i in (1, 2):
        for j in (1, 2):
            s, tt = i / 3, j / 3
            # Coons patch from boundary
            L = lambda a, b: (a[0] + (b[0] - a[0]) * 0, 0)
            x = (1 - s) * G[(0, j)][0] + s * G[(3, j)][0]
            y = (1 - tt) * G[(i, 0)][1] + tt * G[(i, 3)][1]
            G[(i, j)] = (x, y)
    def zf(x, y):
        return bow * (1 - (2 * x / w) ** 2) + bulge * math.sin(math.pi * min(max(y / h, 0), 1))
    tu, tv = tile
    u0, v0 = tu * TILE_W, tv * TILE_H
    def uvf(x, y, back=False):
        # front island: x in [0.04,0.46] of tile width, y in [0.03,0.97]
        sx = (x / w + 0.5)
        sy = y / h
        if back:
            return (u0 + TILE_W * (0.96 - sx * 0.40), v0 + TILE_H * (0.04 + sy * 0.92))
        return (u0 + TILE_W * (0.06 + sx * 0.40), v0 + TILE_H * (0.04 + sy * 0.92))
    F, Bk = {}, {}
    for (i, j), (x, y) in G.items():
        F[(i, j)] = mb.add_v((x, y, t + zf(x, y)))
        Bk[(i, j)] = mb.add_v((x, y, zf(x, y)))
    for i in range(3):
        for j in range(3):
            q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            mb.add_f([F[c] for c in q], [uvf(*G[c]) for c in q])
            qb = q[::-1]
            mb.add_f([Bk[c] for c in qb], [uvf(*G[c], back=True) for c in qb])
    # walls: boundary loop order
    loop = sorted(gb.items(), key=lambda kv: kv[1])
    n = len(loop)
    for k in range(n):
        c0, c1 = loop[k][0], loop[(k + 1) % n][0]
        # wall UV: thin strip just outside the front island
        p0, p1 = G[c0], G[c1]
        def outward(p, d=0.6):
            return (p[0] * (1 + d * t / (w / 2)), p[1] + (p[1] - h / 2) * d * t / (h / 2))
        a, b = uvf(*p0), uvf(*p1)
        ao, bo = uvf(*outward(p0)), uvf(*outward(p1))
        mb.add_f((Bk[c0], Bk[c1], F[c1], F[c0]), (ao, bo, b, a))
    return mb

def lace_mesh(w=0.0042, l=0.0145, t=0.0014, tile=(0, 0)):
    """leather lace segment sitting on the plate (stadium outline, domed). Origin at centre-bottom."""
    mb = MB()
    seg = 2
    out = []
    for k in range(seg + 1):
        a = math.pi * k / seg
        out.append((math.cos(a) * w / 2, l / 2 - w / 2 + math.sin(a) * w / 2))
    for k in range(seg + 1):
        a = math.pi + math.pi * k / seg
        out.append((math.cos(a) * w / 2, -(l / 2 - w / 2) + math.sin(a) * w / 2))
    tu, tv = tile
    u0, v0 = tu * TILE_W, tv * TILE_H
    uvf = lambda x, y, s=1.0: (u0 + TILE_W * (0.5 + s * x / (w * 1.4) * 0.8), v0 + TILE_H * (0.5 + s * y / (l * 1.3) * 0.9))
    top = [mb.add_v((x * 0.82, y * 0.95, t)) for x, y in out]
    bot = [mb.add_v((x * 1.05, y * 1.02, -0.0005)) for x, y in out]
    n = len(out)
    # top: quad strip across the stadium (pairs k <-> n-1-k)
    h = n // 2
    for k in range(h - 1):
        a, b, c2, d = top[k], top[k + 1], top[n - 2 - k], top[n - 1 - k]
        mb.add_f((d, c2, b, a)[::-1], [uvf(*out[i], 0.8) for i in (k, k + 1, n - 2 - k, n - 1 - k)])
    for k in range(n):
        k1 = (k + 1) % n
        mb.add_f((bot[k], bot[k1], top[k1], top[k]), (uvf(*out[k], 1.1), uvf(*out[k1], 1.1), uvf(*out[k1], 0.8), uvf(*out[k], 0.8)))
    return mb

def frame(p, n, up):
    """matrix with X across, Y up-plate, Z normal"""
    z = n.normalized()
    y = (up - z * up.dot(z)).normalized()
    x = y.cross(z)
    M = Matrix((x, y, z)).transposed().to_4x4()
    M.translation = p
    return M

def rot_local(M, ax, ang):
    return M @ Matrix.Rotation(ang, 4, ax)

def scale_local(M, s):
    return M @ Matrix.Diagonal((s[0], s[1], s[2], 1))

# ---------------------------------------------------------------- lamellar placement on a parametric surface
def place_rows(mb, S, rows, pitch, center_fn, rng, plate_lib, lace_lib, closed=False, u_range=(0, 1),
               scale=(1, 1, 1), tilt=math.radians(-7), yaw=math.radians(5), mask=None, jitter=1.0, dense=400):
    """S(u,v)->Vector surface. rows: list of v values (row = plate BOTTOM line). Plates hang downward along -v? No:
    plate +Y points toward increasing v (S(u,v+e)-S(u,v)). center_fn(p)-> inner reference point for outward test.
    Returns count."""
    cnt = 0
    for ri, v in enumerate(rows):
        us = [u_range[0] + (u_range[1] - u_range[0]) * k / dense for k in range(dense + (0 if closed else 1))]
        pts = [S(u, v) for u in us]
        # arc length table
        L = [0.0]
        P = pts + ([pts[0]] if closed else [])
        for i in range(1, len(P)):
            L.append(L[-1] + (P[i] - P[i - 1]).length)
        tot = L[-1]
        n = max(1, int(round(tot / pitch)))
        step = tot / n
        offs = (0.5 if ri % 2 else 0.0) * step if closed else 0.0
        count = n if closed else n + 1
        start = 0.0
        if not closed:
            step = tot / n
        uu = us + ([us[0] + (u_range[1] - u_range[0])] if closed else [])
        j = 0
        for k in range(count):
            d = start + offs + k * step
            if closed:
                d = d % tot
                j = 0
            while j < len(L) - 2 and L[j + 1] < d:
                j += 1
            t = (d - L[j]) / max(L[j + 1] - L[j], 1e-9)
            u = uu[j] + (uu[j + 1] - uu[j]) * t
            if mask and not mask(u, v):
                continue
            e = 1e-3
            p = S(u, v)
            tu = (S(u + e, v) - S(u - e, v)).normalized()
            up = (S(u, v + e) - S(u, v - e)).normalized()
            nrm = tu.cross(up).normalized()
            if nrm.dot(p - center_fn(p)) < 0:
                nrm = -nrm
            M = frame(p, nrm, up)
            # hang: bottom out, top in; yaw for side overlap
            jt = jitter
            M = M @ Matrix.Translation((rng.uniform(-3e-4, 3e-4) * jt, 0, PLATE_H * scale[1] * 0.5 * math.sin(-tilt)))
            M = M @ Matrix.Rotation(tilt + rng.uniform(-0.02, 0.02) * jt, 4, 'X')
            M = M @ Matrix.Rotation(yaw + rng.uniform(-0.015, 0.015) * jt, 4, 'Y')
            M = M @ Matrix.Rotation(rng.uniform(-0.012, 0.012) * jt, 4, 'Z')
            M = scale_local(M, scale)
            var = rng.randrange(len(plate_lib))
            mb.extend(plate_lib[var], M, mat_map=[0])
            if lace_lib:
                ML = M @ Matrix.Translation((0, PLATE_H * 0.25, PLATE_T + 0.0022 * 0.9 + 0.0006))
                ML = scale_local(ML, (1 / scale[0], 1 / scale[1], 1))
                mb.extend(lace_lib[rng.randrange(len(lace_lib))], ML, mat_map=[0])
            cnt += 1
    return cnt

def plate_library():
    plates = [plate_mesh(tile=(i % ATLAS_COLS, i // ATLAS_COLS)) for i in range(40)]
    laces = [lace_mesh(tile=(i, 5)) for i in range(4)]
    return plates, laces

def interp_table(tab, z):
    """tab: sorted list of (z, *vals) -> interpolated vals (smoothstep between keys)"""
    if z <= tab[0][0]: return tab[0][1:]
    if z >= tab[-1][0]: return tab[-1][1:]
    for i in range(len(tab) - 1):
        z0, z1 = tab[i][0], tab[i + 1][0]
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            t = t * t * (3 - 2 * t)
            return tuple(a + (b - a) * t for a, b in zip(tab[i][1:], tab[i + 1][1:]))

# ---------------------------------------------------------------- grids / shells / lofts
def grid_normals(G, out_fn=None, closed_u=False):
    nj, ni = len(G), len(G[0])
    N = [[None] * ni for _ in range(nj)]
    for j in range(nj):
        for i in range(ni):
            if closed_u:
                du = G[j][(i + 1) % ni] - G[j][i - 1]
            else:
                du = G[j][min(i + 1, ni - 1)] - G[j][max(i - 1, 0)]
            dv = G[min(j + 1, nj - 1)][i] - G[max(j - 1, 0)][i]
            n = du.cross(dv)
            if n.length < 1e-12: n = Vector((0, 0, 1))
            n.normalize()
            if out_fn is not None and n.dot(out_fn(G[j][i])) < 0: n = -n
            N[j][i] = n
    return N

def _grid_uv(G, closed_u=False):
    nj, ni = len(G), len(G[0])
    mid = nj // 2
    U = [0.0]
    for i in range(1, ni + (1 if closed_u else 0)):
        U.append(U[-1] + sum((G[j][i % ni] - G[j][i - 1]).length for j in range(nj)) / nj)
    V = [0.0]
    for j in range(1, nj):
        V.append(V[-1] + sum((G[j][i] - G[j - 1][i]).length for i in range(ni)) / ni)
    return U, V

def shell(mb, G, thick, out_fn=None, closed_u=False, mat=0, walls=True, back=True, uv_off=(0, 0), flip=False):
    """Quad grid surface G[j][i] -> solid shell (front = G, back = G - n*thick). UVs in metres (unique unwrap, packed later).
    Front island at uv_off, back island offset +U span, walls as thin strips."""
    nj, ni = len(G), len(G[0])
    N = grid_normals(G, out_fn, closed_u)
    U, V = _grid_uv(G, closed_u)
    # make the front faces' winding agree with the outward normals
    jm, im_ = nj // 2, min(ni // 2, ni - 2)
    gn = (G[jm][im_ + 1] - G[jm][im_]).cross(G[min(jm + 1, nj - 1)][im_] - G[jm][im_])
    if gn.dot(N[jm][im_]) < 0:
        flip = not flip
    F = [[mb.add_v(G[j][i]) for i in range(ni)] for j in range(nj)]
    Bk = [[mb.add_v(G[j][i] - N[j][i] * thick) for i in range(ni)] for j in range(nj)] if back or walls else None
    iu = ni if closed_u else ni - 1
    ox, oy = uv_off
    span = U[-1] + 0.02
    for j in range(nj - 1):
        for i in range(iu):
            i1 = (i + 1) % ni
            q = (F[j][i], F[j][i1], F[j + 1][i1], F[j + 1][i])
            uv = ((ox + U[i], oy + V[j]), (ox + U[i + 1], oy + V[j]), (ox + U[i + 1], oy + V[j + 1]), (ox + U[i], oy + V[j + 1]))
            if flip: q = q[::-1]; uv = uv[::-1]
            mb.add_f(q, uv, mat)
            if back:
                qb = (Bk[j][i], Bk[j + 1][i], Bk[j + 1][i1], Bk[j][i1])
                uvb = ((ox + span + U[i], oy + V[j]), (ox + span + U[i], oy + V[j + 1]), (ox + span + U[i + 1], oy + V[j + 1]), (ox + span + U[i + 1], oy + V[j]))
                if flip: qb = qb[::-1]; uvb = uvb[::-1]
                mb.add_f(qb, uvb, mat)
    if walls and thick > 0:
        edges = []
        # bottom (j=0) and top (j=nj-1) rows
        for i in range(iu):
            i1 = (i + 1) % ni
            edges.append(((0, i1), (0, i)))
            edges.append(((nj - 1, i), (nj - 1, i1)))
        if not closed_u:
            for j in range(nj - 1):
                edges.append(((j, 0), (j + 1, 0)))
                edges.append(((j + 1, ni - 1), (j, ni - 1)))
        wy = oy + V[-1] + 0.02
        acc = 0.0
        for (a, b) in edges:
            L = (G[a[0]][a[1]] - G[b[0]][b[1]]).length
            q = (F[a[0]][a[1]], F[b[0]][b[1]], Bk[b[0]][b[1]], Bk[a[0]][a[1]])
            uv = ((ox + acc, wy), (ox + acc + L, wy), (ox + acc + L, wy + thick), (ox + acc, wy + thick))
            if flip: q = q[::-1]; uv = uv[::-1]
            mb.add_f(q, uv, mat)
            acc += L + 0.004
    return F, N

def ring_frames(path):
    """parallel-transport frames along a path: returns list of (t, n, b)"""
    T = []
    for i in range(len(path)):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        T.append(t.normalized())
    n0 = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((0, -1, 0))
    n = (n0 - T[0] * n0.dot(T[0])).normalized()
    out = []
    for i, t in enumerate(T):
        if i > 0:
            n = n - t * n.dot(t); n.normalize()
        out.append((t, n, t.cross(n)))
    return out

def loft_grid(path, shape_fn, k, frames=None):
    """rings around a path; shape_fn(i, ang) -> (radius_x along n, radius_y along b) or point offset (dx,dy).
    returns grid G[j=path index][i=ring index]"""
    frames = frames or ring_frames(path)
    G = []
    for j, p in enumerate(path):
        t, n, b = frames[j]
        row = []
        for i in range(k):
            a = 2 * math.pi * i / k
            dx, dy = shape_fn(j, a)
            row.append(p + n * dx + b * dy)
        G.append(row)
    return G

def rivet(mb, p, nrm, r=0.0045, h=0.0022, uvc=(0.5, 0.93), uvr=0.01, mat=0, seg=6):
    """domed rivet head, flat base slightly sunk"""
    z = nrm.normalized()
    x = z.orthogonal().normalized(); y = z.cross(x)
    base = [mb.add_v(p + (x * math.cos(2 * math.pi * k / seg) + y * math.sin(2 * math.pi * k / seg)) * r - z * 0.0005) for k in range(seg)]
    mid = [mb.add_v(p + (x * math.cos(2 * math.pi * k / seg) + y * math.sin(2 * math.pi * k / seg)) * r * 0.7 + z * h * 0.75) for k in range(seg)]
    top = mb.add_v(p + z * h)
    for k in range(seg):
        k1 = (k + 1) % seg
        ca, sa = math.cos(2 * math.pi * k / seg), math.sin(2 * math.pi * k / seg)
        cb, sb = math.cos(2 * math.pi * k1 / seg), math.sin(2 * math.pi * k1 / seg)
        mb.add_f((base[k], base[k1], mid[k1], mid[k]),
                 ((uvc[0] + ca * uvr, uvc[1] + sa * uvr), (uvc[0] + cb * uvr, uvc[1] + sb * uvr),
                  (uvc[0] + cb * uvr * .6, uvc[1] + sb * uvr * .6), (uvc[0] + ca * uvr * .6, uvc[1] + sa * uvr * .6)), mat)
    for k in range(0, seg, 2):
        idx = (mid[k], mid[(k + 1) % seg], mid[(k + 2) % seg], top)
        mb.add_f(idx, [(uvc[0] + math.cos(2 * math.pi * kk / seg) * uvr * .6, uvc[1] + math.sin(2 * math.pi * kk / seg) * uvr * .6) for kk in (k, k + 1, k + 2)] + [uvc], mat)

def smoothstep(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)

# trim sheet rows (V ranges) - 4096 px = 0.60 m horizontally (68 px/cm)
TRIM_U = 1.0 / 0.60
TRIM = {'edge': (0.0, 0.159), 'strap': (0.159, 0.330), 'belt': (0.330, 0.553), 'goldband': (0.553, 0.593),
        'border': (0.593, 0.726), 'cord': (0.726, 0.748), 'metal': (0.748, 1.0)}

def edging_profile(w_front=0.024, w_back=0.012, t=0.0085, lift=0.0):
    """U-shaped leather edging folded over a plate edge, as a closed loop in (across, up):
    across>0 = beyond the edge (outward from the panel), up = surface normal"""
    b = 0.0025
    return [(-w_front, lift + t * 0.55), (-w_front + b, lift + t), (b * 0.5, lift + t + 0.0005), (w_back * 0.25, lift + t * 0.75),
            (w_back * 0.35, lift + t * 0.2), (w_back * 0.25, lift - 0.002), (-w_back, lift - 0.003), (-w_back - b, lift - 0.0015),
            (-w_front, lift + t * 0.55)]
