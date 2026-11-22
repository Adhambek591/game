# THE amulet: small gold triangle pointing DOWN on a bail. One source of truth for geometry + engraved relief,
# so it looks identical on every character / shot. Local space: bail centre at origin, +Z up, -Y = front face.
import math
from mathutils import Vector

SIDE = 0.046                       # triangle side (m)
T = 0.0034                         # plate thickness
Z0 = -0.0068                       # top edge height below the bail centre
A2 = SIDE / 2
H = SIDE * math.sqrt(3) / 2
CA, CB, CC = (-A2, Z0), (A2, Z0), (0.0, Z0 - H)      # (x, z): top-left, top-right, apex (down)
CEN = (0.0, Z0 - H / 3)

def bary(x, z):
    (x1, z1), (x2, z2), (x3, z3) = CA, CB, CC
    den = (z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3)
    a = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / den
    b = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / den
    return a, b, 1 - a - b

def edge_dist(x, z):
    """distance to the nearest triangle edge (positive inside)"""
    a, b, c = bary(x, z)
    return min(a, b, c) * H

def _line(d, w):
    return max(0.0, 1.0 - (d / w) ** 2) ** 0.5 if d < w else 0.0

def relief(x, z):
    """engraved/raised ornament height (m) on the front face: double border, ram-horn scrolls (qos múyiz), stem, dots"""
    e = edge_dist(x, z)
    h = 0.00045 * _line(abs(e - 0.0021), 0.0007) + 0.00030 * _line(abs(e - 0.0050), 0.00045)
    # ram-horn double scroll above the centre
    zc = CEN[1] + 0.0030
    for sx in (1, -1):
        cx = sx * 0.0058
        dx, dz = (x - cx) * sx, z - zc
        r = math.hypot(dx, dz); th = math.atan2(dz, -dx) % (2 * math.pi)
        pitch = 0.0013
        best = 9.0
        for k in range(3):
            rr = 0.00035 + pitch * (th + 2 * math.pi * k) / (2 * math.pi)
            if rr < 0.0045: best = min(best, abs(r - rr))
        h = max(h, 0.00040 * _line(best, 0.00042))
    # stem from the scrolls down toward the apex with a drop
    if CC[1] + 0.0085 < z < zc:
        h = max(h, 0.00040 * _line(abs(x), 0.00045))
    h = max(h, 0.00055 * _line(math.hypot(x, z - (CC[1] + 0.0078)), 0.0016))
    # three corner dots inside the inner border
    for (px, pz) in (CA, CB, CC):
        qx, qz = px + (CEN[0] - px) * 0.42, pz + (CEN[1] - pz) * 0.42
        h = max(h, 0.00045 * _line(math.hypot(x - qx, z - qz), 0.0011))
    # gentle dome
    return h + 0.0005 * min(1.0, e / 0.008)

def amulet_mb(MB, bead_fn=None, lathe_fn=None, n=4):
    """quad-only low mesh: front/back grids (3 quads around the centroid, n x n each), walls, bail ring + neck"""
    mb = MB()
    mAB = ((CA[0] + CB[0]) / 2, (CA[1] + CB[1]) / 2); mBC = ((CB[0] + CC[0]) / 2, (CB[1] + CC[1]) / 2); mCA = ((CC[0] + CA[0]) / 2, (CC[1] + CA[1]) / 2)
    quads = [(CA, mAB, CEN, mCA), (mAB, CB, mBC, CEN), (CEN, mBC, CC, mCA)]
    def chamfer(p):
        for c in (CA, CB, CC):
            if abs(p[0] - c[0]) < 1e-9 and abs(p[1] - c[1]) < 1e-9:
                return (c[0] + (CEN[0] - c[0]) * 0.07, c[1] + (CEN[1] - c[1]) * 0.07)
        return p
    def bil(q, s, t):
        a, b, c, d = q
        x = (1 - s) * (1 - t) * a[0] + s * (1 - t) * b[0] + s * t * c[0] + (1 - s) * t * d[0]
        z = (1 - s) * (1 - t) * a[1] + s * (1 - t) * b[1] + s * t * c[1] + (1 - s) * t * d[1]
        return (x, z)
    keyF, keyB = {}, {}
    def vid(x, z, back):
        k = (round(x, 7), round(z, 7))
        D = keyB if back else keyF
        if k not in D:
            px, pz = chamfer((x, z))
            dome = 0.0006 * min(1.0, edge_dist(px, pz) / 0.008)
            y = (T / 2 + dome * 0.5) if back else -(T / 2 + dome)
            D[k] = mb.add_v((px, y, pz))
        return D[k]
    uvF = lambda x, z: (0.25 + x / SIDE * 0.45, 0.55 + (z - CEN[1]) / SIDE * 0.45)
    uvB = lambda x, z: (0.75 - x / SIDE * 0.22, 0.20 + (z - CEN[1]) / SIDE * 0.22)
    for q in quads:
        for i in range(n):
            for j in range(n):
                cs = [bil(q, i / n, j / n), bil(q, (i + 1) / n, j / n), bil(q, (i + 1) / n, (j + 1) / n), bil(q, i / n, (j + 1) / n)]
                mb.add_f([vid(x, z, False) for x, z in cs], [uvF(x, z) for x, z in cs])
                cb = cs[::-1]
                mb.add_f([vid(x, z, True) for x, z in cb], [uvB(x, z) for x, z in cb])
    # walls along the outer boundary
    bnd = []
    for a, b in ((CA, CB), (CB, CC), (CC, CA)):
        for k in range(2 * n):
            bnd.append((a[0] + (b[0] - a[0]) * k / (2 * n), a[1] + (b[1] - a[1]) * k / (2 * n)))
    acc = 0.0
    for k in range(len(bnd)):
        p0, p1 = bnd[k], bnd[(k + 1) % len(bnd)]
        L = math.dist(p0, p1)
        mb.add_f((vid(*p0, False), vid(*p1, False), vid(*p1, True), vid(*p0, True)),
                 ((0.02 + acc * 4, 0.02), (0.02 + (acc + L) * 4, 0.02), (0.02 + (acc + L) * 4, 0.05), (0.02 + acc * 4, 0.05)))
        acc += L
    # bail ring (torus, axis X) + short neck down to the plate
    R0, r0, nm, nn = 0.0034, 0.0011, 12, 6
    ring = [[mb.add_v((r0 * math.sin(2 * math.pi * b / nn),
                       -(R0 + r0 * math.cos(2 * math.pi * b / nn)) * math.sin(2 * math.pi * a / nm),
                       (R0 + r0 * math.cos(2 * math.pi * b / nn)) * math.cos(2 * math.pi * a / nm))) for b in range(nn)] for a in range(nm)]
    for a in range(nm):
        for b in range(nn):
            a1, b1 = (a + 1) % nm, (b + 1) % nn
            mb.add_f((ring[a][b], ring[a1][b], ring[a1][b1], ring[a][b1]),
                     ((0.55 + 0.4 * a / nm, 0.82 + 0.15 * b / nn), (0.55 + 0.4 * (a + 1) / nm, 0.82 + 0.15 * b / nn),
                      (0.55 + 0.4 * (a + 1) / nm, 0.82 + 0.15 * (b + 1) / nn), (0.55 + 0.4 * a / nm, 0.82 + 0.15 * (b + 1) / nn)))
    if lathe_fn:
        lathe_fn(mb, [(0.0, 0.0), (0.0016, -0.0004), (0.0018, -0.0016), (0.0024, -(Z0 * -1 - R0 - r0) - 0.0004), (0.0, -(Z0 * -1 - R0 - r0) - 0.0006)], 8,
                 Vector((0, 0, -R0 - r0 + 0.0004)), uv_rect=(0.05, 0.85, 0.45, 0.97))
    return mb
