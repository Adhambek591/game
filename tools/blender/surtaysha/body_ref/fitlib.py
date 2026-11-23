# Mesh-based body landmarks by slicing (no skeleton needed): crotch / armpit / chin levels, limb centre
# lines, wrist / elbow / knee / ankle centres, hand and foot frames. Works on a vertex cloud (N,3), metres,
# +Z up, facing -Y, body roughly symmetric about x=0. Used on the MetaHuman mesh (to calibrate against its
# true joints), on the HF3D mesh (to fit the joints) and on the re-posed mesh (to verify the pose).
import numpy as np

BIN = 0.004

def unit(v):
    v = np.asarray(v, float); n = np.linalg.norm(v)
    return v / n if n > 0 else v

_cache = {}
def slab(C, z, tol):
    """indices of points with |z'-z| < tol (C sorted by z once and cached)."""
    k = id(C)
    if k not in _cache:
        o = np.argsort(C[:, 2]); _cache.clear(); _cache[k] = (o, C[o, 2])
    o, zs = _cache[k]
    return o[np.searchsorted(zs, z - tol):np.searchsorted(zs, z + tol)]

def side_segments(C, z, side, tol=BIN, gap=0.010):
    """x-sorted clusters of the slab |z'-z|<tol on one side (side=+1/-1). Returns list of index arrays,
    the first one being the one nearest to the body centre line."""
    m = slab(C, z, tol)
    m = m[C[m, 0] * side > -0.002]
    if len(m) < 3: return []
    xs = C[m, 0] * side
    o = np.argsort(xs); m = m[o]; xs = xs[o]
    cuts = np.where(np.diff(xs) > gap)[0]
    return np.split(m, cuts + 1)

def levels(C):
    """crotch, armpit and chin heights + top."""
    top = C[:, 2].max()
    # crotch: highest level where nothing lies on the centre line between the legs
    crotch = None
    for z in np.arange(0.30 * top, 0.60 * top, 0.002):
        m = slab(C, z, BIN)
        if (np.abs(C[m, 0]) < 0.004).any(): break
        crotch = z
    # chin: going down the centre-line front profile from the nose, the first big step back
    prof = {}
    for z in np.arange(top - 0.30, top - 0.05, 0.002):
        m = slab(C, z, BIN); m = m[np.abs(C[m, 0]) < 0.02]
        if len(m): prof[round(z, 3)] = C[m, 1].min()
    zs = sorted(prof, reverse=True)
    face = min(prof[z] for z in zs if z > top - 0.20)
    chin = None
    for z in zs:
        if z < top - 0.12 and prof[z] > face + 0.035:
            chin = z; break
    # armpit: highest level below the chin where the arm is a separate cluster on both sides
    armpit = None
    for z in np.arange(chin - 0.10, 0.5 * top, -0.002):
        if all(len(side_segments(C, z, s)) >= 2 for s in (1, -1)):
            armpit = z; break
    return dict(crotch=float(crotch), armpit=float(armpit), chin=float(chin), top=float(top))

def zmap(z, La, Lb):
    """Map a height from body a to body b, piecewise linear through floor/crotch/armpit/chin/top."""
    ka = [0.0, La['crotch'], La['armpit'], La['chin'], La['top']]
    kb = [0.0, Lb['crotch'], Lb['armpit'], Lb['chin'], Lb['top']]
    return float(np.interp(z, ka, kb))

_full = {}
def set_full(C, Cfull):
    """register the complete cloud behind a hair-free cloud (see torso_box)"""
    _full[id(C)] = Cfull

def torso_box(C, z, tol=0.006):
    """bbox (xhalf, ymin, ymax) of the central cluster at height z (arms / hands excluded when separate)."""
    idx = []
    F = _full.get(id(C))
    for s in (1, -1):
        if F is None:
            seg = side_segments(C, z, s, tol)
            if seg: idx.append(seg[0])
        else:
            # hair-free cloud: its sections have holes, so the extent of the central cluster comes from
            # the full cloud and the points from the hair-free one
            seg = side_segments(F, z, s, tol)
            if seg:
                xmax = (F[seg[0], 0] * s).max()
                m = slab(C, z, tol); idx.append(m[(C[m, 0] * s > -0.002) & (C[m, 0] * s <= xmax + 0.002)])
    idx = np.concatenate(idx)
    P = C[idx]
    return float(np.abs(P[:, 0]).max()), float(P[:, 1].min()), float(P[:, 1].max())

def frac_of(C, p):
    xh, y0, y1 = torso_box(C, p[2])
    return p[0] / xh, (p[1] - y0) / (y1 - y0)

def from_frac(C, fx, fy, z):
    xh, y0, y1 = torso_box(C, z)
    return np.array([fx * xh, y0 + fy * (y1 - y0), z])

def arm_points(C, L, side):
    """All vertices of the free arm + hand (below the armpit, outside the torso / leg cluster)."""
    idx = []
    for z in np.arange(L['armpit'], 0.25 * L['top'], -2 * BIN):
        seg = side_segments(C, z, side)
        if len(seg) >= 2:
            idx.append(np.concatenate(seg[1:]))
    idx = np.unique(np.concatenate(idx))
    # one connected blob in space: drop anything far from the main arm (e.g. nothing normally)
    return idx

def centreline(P, axis, step=0.008):
    """Slice P perpendicular to axis; per slice: t, centre (bbox centre in the cross plane), girth (bbox
    diagonal). Returns arrays t, centres(n,3), girth."""
    axis = unit(axis)
    ref = np.array([0, 1, 0]) if abs(axis[1]) < 0.9 else np.array([1, 0, 0])
    u = unit(np.cross(axis, ref)); v = np.cross(axis, u)
    t = P @ axis; a = P @ u; b = P @ v
    ts, cs, gs = [], [], []
    for t0 in np.arange(t.min(), t.max(), step):
        m = (t >= t0) & (t < t0 + step)
        if m.sum() < 6: continue
        ca = 0.5 * (a[m].min() + a[m].max()); cb = 0.5 * (b[m].min() + b[m].max())
        ts.append(t0 + step / 2); cs.append((t0 + step / 2) * axis + ca * u + cb * v)
        gs.append(np.hypot(a[m].max() - a[m].min(), b[m].max() - b[m].min()))
    return np.array(ts), np.array(cs), np.array(gs)

def fit_line(pts):
    c = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - c)
    return c, vt[0]

def leg_centre(C, L, side, z, tol=0.006):
    """bbox centre (x,y) and box of the leg cluster at height z (below the crotch)."""
    seg = side_segments(C, z, side, tol)
    P = C[seg[0]]
    return np.array([0.5 * (P[:, 0].min() + P[:, 0].max()), 0.5 * (P[:, 1].min() + P[:, 1].max()), z]), \
        (P[:, 0].min(), P[:, 0].max(), P[:, 1].min(), P[:, 1].max())

def leg_frac(C, L, side, p):
    _, (xa, xb, ya, yb) = leg_centre(C, L, side, p[2])
    return (p[0] - xa) / (xb - xa), (p[1] - ya) / (yb - ya)

def leg_from_frac(C, L, side, fx, fy, z):
    _, (xa, xb, ya, yb) = leg_centre(C, L, side, z)
    return np.array([xa + fx * (xb - xa), ya + fy * (yb - ya), z])

def foot_dir(C, side, zmax=0.05):
    """Toe direction in the ground plane: PCA of the foot sole points on one side."""
    m = (C[:, 2] < zmax) & (C[:, 0] * side > 0.02) & (np.abs(C[:, 0]) < 0.35)
    P = C[m][:, :2]
    c = P.mean(0)
    _, _, vt = np.linalg.svd(P - c)
    d = vt[0] if vt[0][1] < 0 else -vt[0]       # toes point to -Y
    return np.array([d[0], d[1], 0.0]), np.array([c[0], c[1], 0.0])

def inner_gap(C, L, z):
    """Gap between the two legs at height z (None if they touch)."""
    a = side_segments(C, z, 1); b = side_segments(C, z, -1)
    if not a or not b: return None
    return float(C[a[0], 0].min() - C[b[0], 0].max())

def ang(v):
    """(abduction, forward) angles of a downward limb direction, degrees: abduction = away from the body
    in the frontal plane (uses |x|), forward = toward -Y in the sagittal plane."""
    v = unit(v)
    return float(np.degrees(np.arctan2(abs(v[0]), -v[2]))), float(np.degrees(np.arctan2(-v[1], -v[2])))

def between(a, b):
    return float(np.degrees(np.arccos(np.clip(unit(a) @ unit(b), -1, 1))))
