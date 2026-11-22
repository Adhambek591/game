# Generates the 4K leather/gold/braid trim sheet (horizontally tiling) -> T_Trim_BaseColor/Normal/ORM
# blender -b --factory-startup --python trim_gen.py -- [size]
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import npt
from bake_common import save_np, TEX

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
N = int(args[0]) if args else 4096
TRIM = {'edge': (0.0, 0.159), 'strap': (0.159, 0.330), 'belt': (0.330, 0.553), 'goldband': (0.553, 0.593),
        'border': (0.593, 0.726), 'cord': (0.726, 0.748), 'metal': (0.748, 1.0)}
rng = np.random.default_rng(5)
PX = 0.60 / N                       # metres per pixel (horizontal == vertical density)
v = (np.arange(N, dtype=np.float32) + 0.5) / N
u = (np.arange(N, dtype=np.float32) + 0.5) / N
U, V = np.meshgrid(u, v)
xm = U * 0.60                        # metres along the strap

col = np.zeros((N, N, 3), np.float32)
rough = np.zeros((N, N), np.float32)
metal = np.zeros((N, N), np.float32)
hm = np.zeros((N, N), np.float32)

blot = npt.fbm(N, N, 6, 6, 5, rng)
grain = npt.fbm(N, N, 400, 400, 2, rng)
crease = npt.fbm(N, N, 40, 25, 4, rng)
fine = npt.fbm(N, N, 120, 120, 3, rng)
wearn = npt.fbm(N, N, 18, 18, 4, rng)

LEATHER = np.array([0.085, 0.045, 0.024], np.float32)
LEATHER_W = np.array([0.19, 0.11, 0.06], np.float32)
THREAD = np.array([0.36, 0.27, 0.16], np.float32)

def rowmask(key):
    a, b = TRIM[key]
    return (V >= a) & (V < b), (V - a) / (b - a)

def stitch(y, yc, ylen_m, period=0.0065, width_m=0.0011):
    """returns (thread mask, hole/groove mask) for a running stitch along u at local y = yc"""
    dy = np.abs(y - yc) * ylen_m
    ph = (xm / period) % 1.0
    dash = npt.smoothstep(0.08, 0.16, ph) * (1 - npt.smoothstep(0.62, 0.70, ph))
    thread = (1 - npt.smoothstep(width_m * 0.35, width_m * 0.6, dy)) * dash
    groove = (1 - npt.smoothstep(width_m * 0.6, width_m * 1.4, dy))
    hole = (1 - npt.smoothstep(0.0, width_m * 0.7, np.hypot(dy, np.minimum(np.abs(ph - 0.05), np.abs(ph - 0.75)) * period))) * (1 - dash)
    return thread, groove, hole

def leather_row(key, stitches, ylen_m, fold=None, tool=False, tint=1.0, edge_round=0.10):
    m, y = rowmask(key)
    base = LEATHER * tint * (0.72 + 0.6 * blot[..., None])
    worn = np.clip((wearn - 0.45) * 2.0, 0, 1)
    h = (grain - 0.5) * 0.00012 + (npt.smoothstep(0.45, 0.6, crease) * -0.00010)
    # rolled edges at both row ends (profile corners)
    edge = npt.smoothstep(0.0, edge_round, y) * npt.smoothstep(1.0, 1.0 - edge_round, y)
    h += edge * 0.0004
    wear_edge = 1 - edge
    if fold is not None:
        f = np.exp(-((y - fold) / 0.07) ** 2)
        wear_edge = np.maximum(wear_edge, f)
    w = np.clip(wear_edge * 0.8 + worn * 0.25, 0, 1)
    c = base * (1 - w[..., None] * 0.7) + LEATHER_W * (w[..., None] * 0.7)
    r = 0.64 + (blot - 0.5) * 0.2 - w * 0.18
    if tool:
        # tooled scroll band between stitches
        band = npt.smoothstep(0.14, 0.18, y) * (1 - npt.smoothstep(0.40, 0.44, y))
        yy = (y - 0.29) * ylen_m
        sc = np.sin(xm / 0.022 * 2 * np.pi + np.sin(yy / 0.006) * 1.8) * np.cos(yy / 0.0085 * np.pi)
        sc = npt.smoothstep(0.35, 0.6, np.abs(sc))
        h += band * sc * 0.0005 - band * 0.0002
        c = c * (1 - band[..., None] * (1 - sc[..., None]) * 0.45)
    for yc in stitches:
        th, gr, ho = stitch(y, yc, ylen_m)
        h += -gr * 0.00025 + th * 0.0004 - ho * 0.0003
        c = c * (1 - gr[..., None] * 0.35) * (1 - ho[..., None] * 0.6)
        c = c * (1 - th[..., None]) + THREAD * (0.75 + 0.5 * fine[..., None]) * th[..., None]
        r = r * (1 - th) + 0.78 * th
    col[m] = c[m]; rough[m] = r[m]; metal[m] = 0; hm[m] = h[m]

GOLD = np.array([0.95, 0.70, 0.32], np.float32)
def gold_fill(m, h, cav_extra=None):
    g = GOLD * (0.82 + 0.3 * blot[..., None])
    scr = np.clip(1 - np.abs(npt.fbm(N, N, 3, 260, 2, rng) - 0.5) * 60, 0, 1) * (wearn > 0.5)
    tarn = np.clip((0.5 - fine) * 3, 0, 1) * 0.35
    if cav_extra is not None: tarn = np.clip(tarn + cav_extra, 0, 1)
    c = g * (1 - tarn[..., None]) + np.array([0.16, 0.10, 0.045]) * tarn[..., None]
    c = c * (1 - scr[..., None] * 0.3) + np.array([1.0, 0.85, 0.55]) * scr[..., None] * 0.3
    r = 0.24 + (blot - 0.5) * 0.18 + tarn * 0.4 - scr * 0.05
    col[m] = c[m]; rough[m] = r[m]; metal[m] = (1 - tarn * 0.6)[m]; hm[m] = (h - scr * 0.00005)[m]

# --- rows
leather_row('edge', stitches=(0.13, 0.86), ylen_m=0.095, fold=0.52, edge_round=0.06)
leather_row('strap', stitches=(0.11, 0.45), ylen_m=0.102, edge_round=0.05)
leather_row('belt', stitches=(0.09, 0.46), ylen_m=0.134, tool=True, tint=1.15, edge_round=0.04)
# gold beaded band
m, y = rowmask('goldband')
bead_ph = (xm / 0.0058) % 1.0
bd = np.hypot((bead_ph - 0.5) * 0.0058, (y - 0.33) * 0.032)
bead = np.clip(1 - (bd / 0.0019) ** 2, 0, 1) ** 0.5
rim = np.exp(-((y - 0.10) / 0.04) ** 2) + np.exp(-((y - 0.58) / 0.04) ** 2)
h = bead * 0.0009 + rim * 0.0003
gold_fill(m, h, cav_extra=np.clip((bd > 0.0019) * (bd < 0.0026) * 0.6, 0, 1))
# braid border (coat): olive-khaki diagonal weave with dark guard lines
m, y = rowmask('border')
ym = y * 0.091
d1 = np.sin((xm + ym) / 0.0032 * np.pi); d2 = np.sin((xm - ym) / 0.0032 * np.pi)
weave = np.where(((np.floor((xm + ym) / 0.0032) + np.floor((xm - ym) / 0.0032)) % 2) == 0, np.abs(d1), np.abs(d2))
lines = np.exp(-((y - 0.06) / 0.015) ** 2) + np.exp(-((y - 0.40) / 0.015) ** 2)
c = np.array([0.095, 0.080, 0.052]) * (0.75 + 0.45 * weave[..., None]) * (0.8 + 0.4 * blot[..., None])
c = c * (1 - np.clip(lines, 0, 1)[..., None] * 0.75)
dust = np.clip((wearn - 0.4) * 1.5, 0, 1)[..., None] * 0.25
c = c * (1 - dust) + np.array([0.30, 0.27, 0.22]) * dust
col[m] = c[m]; rough[m] = (0.85 + weave * 0.08)[m]; metal[m] = 0; hm[m] = (weave * 0.00035 - lines * 0.0002)[m]
# twisted rawhide cord
m, y = rowmask('cord')
tw = np.abs(np.sin((xm / 0.004 + y * 1.0) * np.pi))
col[m] = (np.array([0.22, 0.14, 0.08]) * (0.6 + 0.6 * tw[..., None]))[m]; rough[m] = 0.7; metal[m] = 0; hm[m] = (tw * 0.0005)[m]
# solid gold/brass block for rivets and buckles
m, y = rowmask('metal')
gold_fill(m, (fine - 0.5) * 0.0001)

nrm = npt.normal_from_height(hm, PX, 1.0)
ao = npt.cavity_ao(hm, PX, radius_px=5, depth=0.0006)
nrm[..., 1] = 1.0 - nrm[..., 1]            # DirectX (UE)
save_np(col, os.path.join(TEX, 'T_Trim_BaseColor.png'), srgb=True)
save_np(nrm, os.path.join(TEX, 'T_Trim_Normal.png'))
save_np(np.stack([ao, np.clip(rough, 0, 1), np.clip(metal, 0, 1)], 2), os.path.join(TEX, 'T_Trim_ORM.png'))
print('TRIM DONE')
