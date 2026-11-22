# Tiling woven-cloth detail normal (1K, DirectX) for the coat / robe / cape: 2/1 twill, 32 threads per tile
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import npt
from bake_common import save_np, TEX
N = 1024; T = 32                      # threads per tile; tile = 64 mm -> 2 mm threads
rng = np.random.default_rng(9)
y, x = np.mgrid[0:N, 0:N].astype(np.float32) / N * T
ix, iy = np.floor(x), np.floor(y)
fx, fy = x - ix, y - iy
warp_up = ((ix + iy) % 3) < 2         # twill: warp floats over 2, under 1
warp = np.sin(np.pi * fx) ** 0.6 * (0.75 + 0.25 * np.cos(2 * np.pi * (fy - 0.5)))
weft = np.sin(np.pi * fy) ** 0.6 * (0.75 + 0.25 * np.cos(2 * np.pi * (fx - 0.5)))
h = np.where(warp_up, 0.6 + 0.4 * warp, 0.6 + 0.4 * weft) * np.where(warp_up, warp, weft)
h += (npt.fbm(N, N, 64, 64, 3, rng) - 0.5) * 0.25          # slubs / fibre noise
h = h * 0.00035                                              # metres
n = npt.normal_from_height(h, 0.064 / N, 1.0)
n[..., 1] = 1 - n[..., 1]
save_np(n, os.path.join(TEX, 'T_ClothWeave_Normal.png'))
print('WEAVE DONE')
