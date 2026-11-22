# Fitting helpers against the real MetaHuman body (read only): region split by dominant skin weight,
# per-region BVH trees, slices, radial ray distances and a 'conform' push-out with clearance.
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

FINGERS = ('thumb', 'index', 'middle', 'ring', 'pinky')
TOES = ('toe',)

def category(g):
    s = g[-2:]
    side = 'L' if s == '_l' else ('R' if s == '_r' else '')
    if g.startswith(('thigh', 'calf', 'foot', 'ball', 'ankle')) or any(t in g for t in TOES):
        return 'leg' + side
    if g.startswith(('upperarm', 'lowerarm', 'hand')) or (g.startswith(FINGERS) and side):
        return 'arm' + side
    if g.startswith(('head', 'FACIAL', 'facial')) or 'eye' in g or 'jaw' in g or 'teeth' in g or 'tongue' in g:
        return 'head'
    if g.startswith('neck'):
        return 'neck'
    return 'torso'

class BodyFit:
    def __init__(self, body):
        me = body.data
        self.co = [body.matrix_world @ v.co for v in me.vertices]
        gname = {g.index: g.name for g in body.vertex_groups}
        self.vcat = []
        for v in me.vertices:
            if v.groups:
                g = max(v.groups, key=lambda g: g.weight)
                self.vcat.append(category(gname.get(g.group, '')))
            else:
                self.vcat.append('torso')
        self.cat_verts = {}
        for i, c in enumerate(self.vcat):
            self.cat_verts.setdefault(c, []).append(i)
        self.polys = [tuple(p.vertices) for p in me.polygons]
        self._bvh = {}

    def bvh(self, cats):
        key = tuple(sorted(cats))
        if key not in self._bvh:
            cs = set(cats)
            faces = [p for p in self.polys if sum(self.vcat[i] in cs for i in p) * 2 >= len(p)]
            self._bvh[key] = BVHTree.FromPolygons(self.co, faces)
        return self._bvh[key]

    def verts(self, cat):
        return [self.co[i] for i in self.cat_verts.get(cat, [])]

    def bbox(self, cat):
        V = self.verts(cat)
        return [tuple(round(min(p[i] for p in V), 3) for i in range(3)), tuple(round(max(p[i] for p in V), 3) for i in range(3))]

    def slice(self, cats, z, dz=0.006, xlim=None):
        if isinstance(cats, str): cats = (cats,)
        V = [p for c in cats for p in self.verts(c) if abs(p.z - z) < dz and (xlim is None or xlim[0] <= p.x <= xlim[1])]
        if not V: return None
        return (min(p.x for p in V), max(p.x for p in V), min(p.y for p in V), max(p.y for p in V))

    def ray_dist(self, cats, origin, direction, maxd=0.6):
        """distance from origin (inside the region) to its surface along direction, None on a miss"""
        hit = self.bvh(cats).ray_cast(origin, direction.normalized(), maxd)
        return None if hit[0] is None else hit[3]

    def conform(self, p, cats, clear, iters=2):
        """push p out of the region surface so it sits at least `clear` above it (never pulls in)"""
        t = self.bvh(cats)
        q = p.copy()
        for _ in range(iters):
            loc, nrm, idx, d = t.find_nearest(q)
            if loc is None: return q
            n = nrm.normalized()
            s = (q - loc).dot(n)
            if s < clear:
                q = q + n * (clear - s)
        return q

def smooth_grid(G, it=2, closed_u=False, fix_rows=(), fac=0.5):
    """Laplacian smoothing of a grid of Vectors (in place); rows in fix_rows untouched"""
    nj, ni = len(G), len(G[0])
    for _ in range(it):
        N = [[p.copy() for p in r] for r in G]
        for j in range(nj):
            if j in fix_rows: continue
            for i in range(ni):
                nb = []
                if closed_u: nb += [G[j][i - 1], G[j][(i + 1) % ni]]
                else:
                    if i > 0: nb.append(G[j][i - 1])
                    if i < ni - 1: nb.append(G[j][i + 1])
                if j > 0: nb.append(G[j - 1][i])
                if j < nj - 1: nb.append(G[j + 1][i])
                avg = sum(nb, Vector()) / len(nb)
                N[j][i] = G[j][i].lerp(avg, fac)
        for j in range(nj):
            G[j] = N[j]
    return G

def limb_centres(F, cat, a, b, ts, band=0.005, rmax=0.085):
    """centroids of the limb's cross-sections perpendicular to a->b at parameters ts (the bone line is not the
    mesh centre on the MetaHuman forearm); falls back to the bone line when a slice is empty"""
    d = (b - a); L = d.length; ax = d / L
    V = F.verts(cat)
    out = []
    for t in ts:
        c0 = a + d * t
        sl = [p for p in V if abs((p - c0).dot(ax)) < band and ((p - c0) - ax * (p - c0).dot(ax)).length < rmax]
        if len(sl) < 6:
            out.append(c0); continue
        # bounding-box centre in the slice plane is steadier than the vertex mean (uneven vertex density)
        x = ax.orthogonal().normalized(); y = ax.cross(x)
        xs = [(p - c0).dot(x) for p in sl]; ys = [(p - c0).dot(y) for p in sl]
        out.append(c0 + x * (min(xs) + max(xs)) / 2 + y * (min(ys) + max(ys)) / 2)
    return out

def pbd_drape(P, cons, pinned, F, cats, clear_fn, iters=160, grav=0.0016, passes=4):
    """quasi-static position-based drape of a flat fabric piece: P list of Vectors (modified copy returned),
    cons = [(i, j, rest, stiffness)], pinned = set of fixed indices, collisions = conform against the body regions
    with clear_fn(p) clearance (hair layer / armour). Inextensible-ish cloth hanging under gravity."""
    X = [p.copy() for p in P]
    free = [i for i in range(len(X)) if i not in pinned]
    g = Vector((0, 0, -grav))
    for it in range(iters):
        for i in free: X[i] += g
        for _ in range(passes):
            for i, j, rest, k in cons:
                d = X[j] - X[i]; L = d.length
                if L < 1e-9: continue
                c = (L - rest) / L * k
                wi = 0.0 if i in pinned else 1.0; wj = 0.0 if j in pinned else 1.0
                if wi + wj == 0: continue
                X[i] += d * (c * wi / (wi + wj)); X[j] -= d * (c * wj / (wi + wj))
        for i in free:
            X[i] = F.conform(X[i], cats, clear_fn(X[i]), iters=1)
    return X
