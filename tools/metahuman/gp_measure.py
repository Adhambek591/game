# Tape measures of an exported MetaHuman body (out/gp_mesh.json: vertices + triangle indices, written by the gparam step),
# taken the same way as on the reference wrap mesh: a tape = convex hull of a planar cut. The cut is made through the
# TRIANGLES (the MetaHuman mesh is too sparse for point slices: that broke the first in-session correction).
#   <python with numpy> gp_measure.py [mesh.json] [want.json]
import json, sys, math
import numpy as np
OUT = 'F:/qirq-qiz/tools/metahuman/out'
D = json.load(open(sys.argv[1] if len(sys.argv) > 1 else OUT + '/gp_mesh.json'))
V = np.array(D['v'], float); I = np.array(D['i'], int).reshape(-1, 3)
ex = V.max(0) - V.min(0); up = int(ex.argmax()); rest = [i for i in range(3) if i != up]; lat = max(rest, key=lambda i: ex[i]); dep = [i for i in rest if i != lat][0]
C = np.c_[V[:, lat] - (V[:, lat].max() + V[:, lat].min()) / 2, V[:, dep], V[:, up] - V[:, up].min()]
toes = C[C[:, 2] < 3][:, 1].mean(); pel = C[(C[:, 2] > 85) & (C[:, 2] < 95) & (abs(C[:, 0]) < 12)][:, 1].mean()
if toes < pel: C[:, 1] *= -1
H = C[:, 2].max()
def cut(o, n):
    """points (every ~1.5 mm) along the intersection of the mesh with the plane through o, normal n"""
    d = (C - o) @ n; T = d[I]; s = (T > 0).sum(1); tri = I[(s == 1) | (s == 2)]; out = []
    for a, b, c in tri:
        ps = []
        for u, v in ((a, b), (b, c), (c, a)):
            if (d[u] > 0) != (d[v] > 0): t = d[u] / (d[u] - d[v]); ps.append(C[u] + (C[v] - C[u]) * t)
        if len(ps) == 2:
            k = max(2, int(np.linalg.norm(ps[1] - ps[0]) / 0.15) + 1)
            out.append(ps[0] + np.outer(np.linspace(0, 1, k), ps[1] - ps[0]))
    return np.vstack(out) if out else np.zeros((0, 3))
def hull(P2):
    pts = sorted(set(map(tuple, np.round(P2, 3))))
    if len(pts) < 3: return 0.0
    def cr(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in pts:
        while len(lo) >= 2 and cr(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    upp = []
    for p in reversed(pts):
        while len(upp) >= 2 and cr(upp[-2], upp[-1], p) <= 0: upp.pop()
        upp.append(p)
    h = lo[:-1] + upp[:-1]
    return sum(math.hypot(h[i][0] - h[i - 1][0], h[i][1] - h[i - 1][1]) for i in range(len(h)))
Z = np.array([0, 0, 1.0])
_c = {}
def zc(z):
    z = round(z, 2)
    if z not in _c: _c[z] = cut(np.array([0, 0, z]), Z)
    return _c[z]
def torso(z):
    b = zc(z); lim = []
    for sg in (1, -1):
        x = 0.0
        for v in np.sort(b[b[:, 0] * sg >= 0][:, 0] * sg):
            if v - x > 0.6: break
            x = v
        lim.append(x)
    return b[(b[:, 0] <= lim[0] + 1e-6) & (b[:, 0] >= -lim[1] - 1e-6)]
def tper(z): return hull(torso(z)[:, :2])
def leg(z): b = zc(z); return b[b[:, 0] > 0.05]
def lper(z):
    b = leg(z); xs = np.sort(b[:, 0]); x = xs[0]          # the leg only (not the hand hanging beside it)
    for v in xs:
        if v - x > 0.6: break
        x = v
    return hull(b[b[:, 0] <= x + 1e-6][:, :2])
# crotch: highest level at which the two legs are still separate at the centre line
crotch = next(z for z in np.arange(60, 100, 0.25) if len(zc(z)) and (abs(zc(z)[:, 0]) < 0.3).any())
sh = C[(abs(C[:, 0]) > 15) & (abs(C[:, 0]) < 19)][:, 2].max()
zs = np.arange(crotch + 1, sh - 2, 0.5); per = {round(z, 2): tper(z) for z in zs}; zs = list(per)
hipz = max((z for z in zs if z < crotch + 14), key=lambda z: per[z]); waistz = min((z for z in zs if crotch + 14 < z < sh - 18), key=lambda z: per[z])
bustz = max((z for z in zs if sh - 28 < z < sh - 10), key=lambda z: torso(z)[:, 1].max())
chest = max(per[z] for z in zs if bustz - 1 <= z <= bustz + 3.6); ub = tper(bustz - 7.0)
kz = min(np.arange(0.24 * H, 0.33 * H, 0.5), key=lper); cz = max(np.arange(0.14 * H, kz - 3, 0.5), key=lper)
def nper(z): b = zc(z); return hull(b[abs(b[:, 0]) < 9][:, :2])
nz = min(np.arange(sh + 2, sh + 11, 0.5), key=nper)
prof = {}
for x, y, z in C:
    if abs(x) < 2.5: k = int(round(z)); prof[k] = max(prof.get(k, -99), y)
chin = next((z for z in range(int(H) - 14, int(H) - 40, -1) if z in prof and z - 2 in prof and prof[z] - prof[z - 2] > 2.0), 0)
# arm: principal axis of the vertices beyond the trunk
A = C[(C[:, 0] > 22.5) & (C[:, 2] > 70)]; cen = A.mean(0); ax = np.linalg.svd(A - cen)[2][0]; ax = ax if ax[0] > 0 else -ax
e1 = np.cross(ax, [0, 1, 0]); e1 /= np.linalg.norm(e1); e2 = np.cross(ax, e1); tA = (A - cen) @ ax
def aper(t):
    b = cut(cen + ax * t, ax); b = b[(b[:, 0] > 12) & (np.linalg.norm(b - (cen + ax * t), axis=1) < 14)]
    return hull(np.c_[(b - cen) @ e1, (b - cen) @ e2])
acro = np.array([C[(abs(C[:, 0] - 17) < 2) & (C[:, 2] > sh - 1.5)][:, 0].mean(), 0, sh]); t0 = (acro - cen) @ ax; L = tA.max() - t0
ts = np.arange(t0 + 0.2 * L, tA.max() - 1, 0.5); ap = {round(x, 2): aper(x) for x in ts}; ts = list(ap)
wt = min((x for x in ts if t0 + 0.55 * L < x < t0 + 0.85 * L), key=lambda x: ap[x])
bic = max(ap[x] for x in ts if t0 + 0.25 * (wt - t0) < x < t0 + 0.5 * (wt - t0)); fo = max(ap[x] for x in ts if t0 + 0.55 * (wt - t0) < x < t0 + 0.8 * (wt - t0))
back = {}
for x, y, z in C:
    if abs(x) < 6 and crotch < z < sh + 3: k = int(round(z)); back[k] = min(back.get(k, 99), y)
M = {'height': H, 'shoulder_height': sh, 'chest': chest, 'underbust': ub, 'waist': per[waistz], 'high_hip': tper((hipz + waistz) / 2), 'hip': per[hipz], 'neck': nper(nz), 'bicep': bic, 'forearm': fo, 'wrist': ap[wt],
     'inseam': crotch, 'thigh': lper(crotch - 2.5), 'knee': lper(kz), 'calf': lper(cz)}
X = {'chin_z': chin, 'chin_above_shoulder': chin - sh, 'neck_min_z': nz, 'bust_z': bustz, 'waist_z': waistz, 'hip_z': hipz, 'knee_z': kz, 'calf_z': cz,
     'shoulder_full_width': 2 * abs(C[(C[:, 2] > sh - 8) & (C[:, 2] < sh + 1)][:, 0]).max(), 'acromion_to_wrist': wt - t0, 'neck_to_waist_straight': sh + 1.5 - waistz}
WANT = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {'height': 171.2, 'shoulder_height': 140.7, 'chest': 86.0, 'underbust': 70.0, 'waist': 63.4, 'high_hip': 79.4, 'hip': 93.8, 'neck': 29.4, 'bicep': 28.2,
        'forearm': 25.7, 'wrist': 16.2, 'inseam': 80.8, 'thigh': 56.1, 'knee': 33.2, 'calf': 35.9}
for k, v in M.items(): print('%-16s measured %6.1f   target %6.1f   diff %+5.1f %s' % (k, v, WANT[k], v - WANT[k], '' if abs(v - WANT[k]) <= 1.0 else '  <-- out'))
for k, v in X.items(): print('  %-24s %6.1f' % (k, v))
print('  back depth by height', {z: round(back[z], 1) for z in sorted(back) if z % 4 == 0})
json.dump({'measured': {k: float(v) for k, v in M.items()}, 'extra': {k: float(v) for k, v in X.items()}}, open(OUT + '/gp_measured.json', 'w'), indent=1)
