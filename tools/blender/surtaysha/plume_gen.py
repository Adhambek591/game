# Black horsehair card texture (2K): long thin wavy strands, BaseColor+Alpha, Normal (DX), ORM
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from bake_common import save_np, TEX
N = 2048
rng = np.random.default_rng(3)
alpha = np.zeros((N, N), np.float32); nx = np.zeros((N, N), np.float32); shade = np.ones((N, N), np.float32)
v = np.arange(N, dtype=np.float32) / N
for s in range(9000):
    x0 = rng.uniform(0, N)
    w = rng.uniform(1.1, 2.3)                     # strand half-width in px
    L = rng.uniform(0.45, 1.0)
    rows = np.arange(int(L * N))
    xs = x0 + np.sin(v[rows] * rng.uniform(3, 9) + rng.uniform(0, 6)) * rng.uniform(1, 9) + v[rows] * rng.uniform(-12, 12)
    taper = np.clip(1.0 - np.maximum(0, (v[rows] - L * 0.7) / (L * 0.3 + 1e-6)), 0, 1)
    sh = rng.uniform(0.55, 1.25)
    for off in range(-3, 4):
        cols = np.floor(xs).astype(int) + off
        d = (cols + 0.5 - xs) / w
        a = np.clip(1 - d * d, 0, 1) * taper
        cc = cols % N
        cur = alpha[rows, cc]
        m = a > cur
        alpha[rows[m], cc[m]] = a[m]
        nx[rows[m], cc[m]] = np.clip(d[m], -1, 1)
        shade[rows[m], cc[m]] = sh
alpha = np.clip(alpha * 1.6, 0, 1)
base = np.stack([0.016 * shade, 0.014 * shade, 0.013 * shade, alpha], 2)
nrm = np.stack([nx * 0.5 + 0.5, np.full_like(nx, 0.5), np.sqrt(np.clip(1 - nx ** 2, 0, 1)) * 0.5 + 0.5], 2)
nrm[..., 1] = 1 - nrm[..., 1]
ao = np.clip(0.45 + 0.55 * np.minimum(v[:, None] * 2.0, 1.0), 0, 1) * np.ones((1, N), np.float32)
orm = np.stack([ao, np.full((N, N), 0.38, np.float32), np.zeros((N, N), np.float32)], 2)
save_np(base.astype(np.float32), os.path.join(TEX, 'T_Plume_BaseColor.png'), srgb=True)
save_np(nrm.astype(np.float32), os.path.join(TEX, 'T_Plume_Normal.png'))
save_np(orm, os.path.join(TEX, 'T_Plume_ORM.png'))
print('PLUME DONE')
