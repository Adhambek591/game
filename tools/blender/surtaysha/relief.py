# Height fields for the hero reliefs: tooled + gilt waist guard, beast-mask buckle, motif plaques.
# Returned in metres (displacement along the high-poly normal). guard_orn also returns a gilt mask
# that bake_unique stores as a vertex colour ('orn') so the leather shader paints the lines gold.
import math
from mathutils import Vector

def _ss(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)

def _line(d, w):
    """raised rounded line profile for distance d to the centre line, half width w"""
    return max(0.0, 1.0 - (d / w) ** 2) ** 0.5 if d < w else 0.0

# --- waist guard (same outline as pieces.guard_top / guard_bot)
def guard_top(u):
    c = math.cos(u); au = abs(math.atan2(math.sin(u), c))
    return 1.192 + 0.030 * max(0.0, c) ** 8 + 0.012 * math.exp(-((au - 0.78) / 0.17) ** 2)
def guard_bot(u):
    c = math.cos(u); au = abs(math.atan2(math.sin(u), c))
    return 1.036 - 0.052 * max(0.0, c) ** 14 - 0.014 * math.exp(-((au - 0.70) / 0.15) ** 2)

BELT_LO, BELT_HI = 1.058, 1.128      # the belt band covers this

def guard_orn(p):
    """(height, gilt) at a point of the waist guard"""
    u = math.atan2(p.x, -p.y)
    s = u * 0.235                      # ~arc length along the band (m)
    z = p.z
    zt, zb = guard_top(u), guard_bot(u)
    h = 0.0; g = 0.0
    W = 0.0011                          # gilt line half width
    # border lines following the lobed edges
    for zc in (zt - 0.011, zb + 0.011):
        l = _line(abs(z - zc), W)
        h = max(h, l); g = max(g, l)
    # stamped dot rows just outside the border lines
    for zc in (zt - 0.0175, zb + 0.0175):
        ph = (s / 0.009) % 1.0
        dd = math.hypot((ph - 0.5) * 0.009, z - zc)
        h = max(h, 0.7 * _line(dd, 0.0016))
    # running scroll vine in the upper and lower fields
    for lo, hi in ((BELT_HI + 0.006, zt - 0.022), (zb + 0.022, BELT_LO - 0.006)):
        if not (lo - 0.004 < z < hi + 0.004) or hi - lo < 0.012:
            continue
        mid = (lo + hi) / 2; amp = (hi - lo) * 0.30
        x = abs(s)                      # mirror about the front centre
        per = 0.052
        ph = 2 * math.pi * x / per
        yv = mid + amp * math.sin(ph)
        slope = amp * 2 * math.pi / per * math.cos(ph)
        dv = abs(z - yv) / math.sqrt(1 + slope * slope)
        l = _line(dv, W)
        # spiral curls hanging off every half period
        k = math.floor(x / (per / 2) + 0.5)
        xc = k * per / 2; up = 1 if k % 2 == 0 else -1
        cz = mid + up * amp * 0.15
        cx = xc + per * 0.18
        r = math.hypot(x - cx, z - cz); th = math.atan2(z - cz, x - cx)
        for turn in range(2):
            rs = 0.0025 + 0.0011 * ((th % (2 * math.pi)) / (2 * math.pi) + turn) * 2.2
            if rs < amp * 0.95:
                l = max(l, _line(abs(r - rs), W * 0.9))
        # small leaf between curls
        lx = xc - per * 0.12; lz = mid - up * amp * 0.35
        e = math.hypot((x - lx) / 0.0055, (z - lz) / 0.0028)
        if e < 1.0:
            l = max(l, 0.8 * (1 - e * e) ** 0.5)
        h = max(h, l); g = max(g, l)
    # front centre: a palmette crowning the top lobe and a drop under the bottom point
    for zc, dirz in ((zt - 0.030, 1), (zb + 0.028, -1)):
        x = abs(s); dz = (z - zc) * dirz
        if -0.004 < dz < 0.020 and x < 0.020:
            for k in range(-2, 3):
                ang = k * 0.42
                # petal: segment from the palmette base along direction ang
                px, pz = math.sin(ang), math.cos(ang)
                t = max(0.0, min(0.017, x * abs(px) + dz * pz)) if k >= 0 else max(0.0, min(0.017, -x * px + dz * pz))
                qx = x - abs(px) * t; qz = dz - pz * t
                l = _line(math.hypot(qx, qz), W * (1.2 - t / 0.017 * 0.5))
                h = max(h, l); g = max(g, l)
    base = 0.00055 * h - 0.00012 * (1 - h) * _ss(0.0, 0.25, h + 0.25)
    return base, g

# --- beast mask buckle and motif plaques (x, y in -1..1 over the plate)
def beast_mask(x, y):
    h = 0.0
    re = math.hypot(x / 0.92, y / 0.86)
    # raised face disc
    h += 0.6 * _ss(0.70, 0.55, re)
    # mane: flame tufts radiating between the face and the frame
    if 0.55 < re < 0.98:
        th = math.atan2(y, x)
        tuft = max(0.0, math.cos(th * 11 + 2.4 * (re - 0.55))) ** 1.5
        env = _ss(0.55, 0.66, re) * _ss(0.98, 0.86, re)
        h += 0.9 * tuft * env + 0.25 * env
    ax = abs(x)
    # heavy brows: arcs over the eyes
    db = abs(math.hypot(ax - 0.30, y - 0.02) - 0.30)
    if y > 0.12:
        h += 1.1 * _line(db, 0.07)
    # bulging eyes with a drilled pupil
    de = math.hypot(ax - 0.30, y - 0.16)
    if de < 0.15:
        h += 1.5 * (1 - (de / 0.15) ** 2) ** 0.5 - 0.6 * _ss(0.05, 0.02, de)
    # nose ridge widening to the muzzle, flared nostrils
    if -0.32 < y < 0.30:
        wN = 0.07 + 0.10 * _ss(0.30, -0.25, y)
        h += 1.3 * _line(ax, wN) * (0.7 + 0.3 * _ss(0.3, -0.2, y))
    dn = math.hypot(ax - 0.11, y + 0.27)
    h -= 0.5 * _ss(0.05, 0.0, dn)
    # muzzle pads with whisker dots
    dm = math.hypot((ax - 0.20) / 1.2, y + 0.38)
    h += 1.1 * max(0.0, 1 - (dm / 0.17) ** 2)
    for wx, wy in ((0.15, -0.36), (0.22, -0.33), (0.27, -0.40)):
        h -= 0.25 * _ss(0.02, 0.0, math.hypot(ax - wx, y - wy))
    # snarling mouth: curved groove and two fangs
    ym = -0.58 + 0.30 * ax * ax
    if ax < 0.46:
        h -= 0.9 * _line(abs(y - ym), 0.035)
    dfg = math.hypot((ax - 0.16) / 0.45, (y + 0.64) / 1.0)
    if y < -0.56:
        h += 0.9 * max(0.0, 1 - (dfg / 0.09) ** 2)
    # forehead diamond
    h += 0.7 * _line(abs(ax) + abs(y - 0.48), 0.07)
    # beaded rectangular frame
    fr = max(abs(x) / 1.0, abs(y) / 1.0)
    h += 1.0 * _line(abs(fr - 0.93), 0.05)
    if fr > 0.84:
        bx = (x * 7.0) % 1.0 if abs(y) > abs(x) * 0.8 else (y * 5.0) % 1.0
        h += 0.35 * _line(abs(bx - 0.5), 0.3) * _line(abs(fr - 0.93), 0.05)
    return h * 0.0011

def plaque_motif(x, y, kind):
    h = 0.0
    r = math.hypot(x, y); th = math.atan2(y, x)
    h += 0.9 * _line(abs(max(abs(x), abs(y)) - 0.88), 0.07)            # raised rim
    if kind % 2 == 0:   # eight-petal rosette with a boss
        petal = max(0.0, math.cos(th * 4)) ** 2 * _ss(0.70, 0.30, r)
        h += 1.0 * petal + 1.1 * _ss(0.18, 0.08, r)
        h += 0.5 * _line(abs(r - 0.72), 0.04)
    else:               # four-fold knot of interlaced bands
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            cx, cy = math.cos(a) * 0.32, math.sin(a) * 0.32
            h += 0.9 * _line(abs(math.hypot(x - cx, y - cy) - 0.28), 0.06)
        h += 1.0 * _ss(0.14, 0.06, r)
    for k in range(4):   # corner dots
        a = k * math.pi / 2 + math.pi / 4
        h += 0.6 * _ss(0.06, 0.0, math.hypot(x - math.cos(a) * 0.78, y - math.sin(a) * 0.78))
    return h * 0.0009

def belt_gold(p, centres):
    best = min(centres, key=lambda c: (p - c[0]).length)
    c, hw, hh, kind = best
    t = Vector((-c.y, c.x, 0)).normalized()
    if t.dot(Vector((1, 0, 0))) < 0 and abs(c.x) < 1e-6: t = -t
    x = (p - c).dot(t) / hw; y = (p.z - c.z) / hh
    if kind < 0:
        return beast_mask(x, y)
    return plaque_motif(x, y, kind)
