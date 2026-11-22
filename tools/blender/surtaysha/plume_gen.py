# Black horsehair plume card texture (2K): BaseColor+Alpha, Normal, ORM
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from bake_common import save_np, TEX
N = 2048
rng = np.random.default_rng(3)
alpha = np.zeros((N, N), np.float32); nx = np.zeros((N, N), np.float32); shade = np.zeros((N, N), np.float32)
v = np.arange(N) / N
for s in range(2600):
    x0 = rng.uniform(0, N)
    w = rng.uniform(1.2, 3.0)
    L = rng.uniform(0.55, 1.0)            # strand length (fraction of card)
    wav = rng.uniform(0, 6); amp = rng.uniform(0, 6)
    xs = x0 + np.sin(v * rng.uniform(4, 12) + wav) * amp
    rows = np.arange(int(L * N))
    for r in rows:
        c = xs[r]; lo = int(c - w - 1); hi = int(c + w + 2)
        xx = np.arange(lo, hi)
        d = (xx - c) / w
        a = np.clip(1 - d * d, 0, 1)
        taper = 1.0 - max(0.0, (r / N - L * 0.75) / (L * 0.25 + 1e-6))
        ix = xx % N
        alpha[r, ix] = np.maximum(alpha[r, ix], a * taper)
        nx[r, ix] = np.where(a > 0, d, nx[r, ix])
        shade[r, ix] = np.where(a > 0, rng.uniform(0.6, 1.2), shade[r, ix])
base = np.stack([0.014 * shade, 0.012 * shade, 0.011 * shade], 2)
base = np.concatenate([base, alpha[..., None]], 2)
nrm = np.stack([nx * 0.5 + 0.5, np.full_like(nx, 0.5), np.sqrt(np.clip(1 - nx ** 2, 0, 1)) * 0.5 + 0.5], 2)
nrm[..., 1] = 1 - nrm[..., 1]
ao = np.clip(0.55 + 0.45 * (v[:, None] * 1.6), 0, 1) * np.ones((1, N))
orm = np.stack([ao, np.full((N, N), 0.42), np.zeros((N, N))], 2).astype(np.float32)
save_np(base.astype(np.float32), os.path.join(TEX, 'T_Plume_BaseColor.png'), srgb=True)
save_np(nrm.astype(np.float32), os.path.join(TEX, 'T_Plume_Normal.png'))
save_np(orm, os.path.join(TEX, 'T_Plume_ORM.png'))
print('PLUME DONE')
