# The lamellar plate atlas, generated: 40 variants of one steel plate (8 x 5 tiles of 512 x 650 px, the layout the plate
# UVs use) -> T_Lamellar_BaseColor / Normal / ORM. Each tile is ONE whole plate (4 % margin): bevelled edge, slightly
# domed, two lace holes, hammered grain, scratches, worn bright edges, a little rust; per-plate tint and roughness.
# (The old atlas was a blurred bake with stretched streaks - the reason the plates looked blocky in close-ups.)
# blender -b --factory-startup --python plates_gen.py
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import npt
from bake_common import save_np, TEX
N = 4096; TW = 512; TH = 650; ROWS = 5; rng = np.random.default_rng(11)
PW_M, PH_M = 0.0262, 0.0429                       # the plate in metres (what one tile covers, inside the 4 % margin)
y, x = np.mgrid[0:N, 0:N].astype(np.float32)
tx = np.clip((x // TW).astype(int), 0, 7); ty = np.clip((y // TH).astype(int), 0, ROWS)      # tile indices (row 5 = unused strip)
s = ((x - tx * TW) / TW - 0.04) / 0.92; t = ((y - ty * TH) / TH - 0.04) / 0.92               # plate coordinates 0..1 (t = 1: top edge)
inside = (s >= 0) & (s <= 1) & (t >= 0) & (t <= 1) & (ty < ROWS)
sc = np.clip(s, 0, 1); tc = np.clip(t, 0, 1); xm = (sc - 0.5) * PW_M; ym = tc * PH_M
# distance to the plate's edge (rounded lower corners)
dx = PW_M / 2 - np.abs(xm); dy = np.minimum(ym, PH_M - ym); d_edge = np.minimum(dx, dy)
rc = 0.004; cx_ = PW_M / 2 - rc; corner = (np.abs(xm) > cx_) & (ym < rc); d_edge = np.where(corner, rc - np.hypot(np.abs(xm) - cx_, ym - rc), d_edge); d_edge = np.maximum(d_edge, 0.0)
px_m = PW_M / (TW * 0.92)
tint = rng.uniform(0.86, 1.10, (ROWS + 1, 8)).astype(np.float32)[ty, tx]; warm = rng.uniform(-0.02, 0.03, (ROWS + 1, 8)).astype(np.float32)[ty, tx]
rgh0 = rng.uniform(0.46, 0.62, (ROWS + 1, 8)).astype(np.float32)[ty, tx]; rust_amt = rng.uniform(0.0, 1.0, (ROWS + 1, 8)).astype(np.float32)[ty, tx] ** 2.5
grain = npt.fbm(N, N, 700, 700, 3, rng); blot = npt.fbm(N, N, 28, 28, 4, rng); dents = npt.fbm(N, N, 90, 90, 3, rng); rustn = npt.fbm(N, N, 60, 60, 4, rng)
scr = np.clip(1 - np.abs(npt.fbm(N, N, 14, 420, 2, rng) - 0.5) * 70, 0, 1) * (npt.fbm(N, N, 9, 9, 3, rng) > 0.52)            # thin scratches along the plate
# lace holes (two, side by side, in the visible lower half) + the pair under the lace band higher up
def holes(tt, r=0.0010):
    h = np.zeros_like(xm)
    for ss in (0.30, 0.70): h = np.maximum(h, 1 - npt.smoothstep(r * 0.75, r, np.hypot(xm - (ss - 0.5) * PW_M, ym - tt * PH_M)))
    return h
hole = np.maximum(holes(0.50), holes(0.66))
rim = 1 - npt.smoothstep(0.0, 0.0007, d_edge)                    # bevel zone
# height: bevelled rim, slight dome across, hammered dents, holes
hm = (npt.smoothstep(0.0, 0.0012, d_edge) * 0.0007 + 0.0003 * (1 - (2 * sc - 1) ** 2) + (dents - 0.5) * 0.00010 + (grain - 0.5) * 0.000015 - hole * 0.0010 - scr * 0.00002).astype(np.float32)
hm = np.where(inside, hm, 0.0)
wear = np.clip(rim * 0.55 * (0.4 + 1.2 * blot) + scr * 0.5 + npt.smoothstep(0.66, 0.85, blot) * 0.2, 0, 1)                      # bright worn steel
rust = np.clip(npt.smoothstep(0.60, 0.78, rustn) * (0.25 + 0.75 * npt.smoothstep(0.004, 0.0, d_edge) + hole) * rust_amt * 0.7, 0, 1)
shade = 1.0 - 0.34 * npt.smoothstep(0.62, 0.95, tc) - 0.14 * (1 - npt.smoothstep(0.0, 0.003, d_edge))   # darker under the row above and in the gaps
base = 0.36 * tint * (0.92 + 0.16 * blot) * (0.97 + 0.06 * grain) * shade
col = np.stack([base * (1.0 + warm), base * 1.02, base * (1.07 - warm)], 2)
col = col * (1 - wear[..., None] * 0.0) + wear[..., None] * 0.11                                        # worn edges lift toward bright steel
rc_ = np.stack([np.full_like(base, 0.20), np.full_like(base, 0.085), np.full_like(base, 0.035)], 2)
col = col * (1 - rust[..., None]) + rc_ * rust[..., None]; col = col * (1 - hole[..., None]) + 0.02 * hole[..., None]
rough = np.clip(rgh0 + (grain - 0.5) * 0.18 + (blot - 0.5) * 0.10 - wear * 0.14 + rust * 0.30 + hole * 0.3, 0.2, 1.0)
metal = np.clip(1.0 - rust * 0.75 - hole, 0, 1)
nrm = npt.normal_from_height(hm, px_m, 1.0); ao = np.clip(npt.cavity_ao(hm, px_m, radius_px=6, depth=0.0008) * (1 - 0.35 * npt.smoothstep(0.72, 1.0, tc)), 0, 1)
# keep the unused strip above row 5 neutral
out_ = ~((ty < ROWS))
col[out_] = 0.08; rough[out_] = 0.8; metal[out_] = 0.0
save_np(col.astype(np.float32), os.path.join(TEX, 'T_Lamellar_BaseColor.png'), srgb=True)
save_np(nrm, os.path.join(TEX, 'T_Lamellar_Normal.png'))
save_np(np.stack([ao, rough, metal], 2).astype(np.float32), os.path.join(TEX, 'T_Lamellar_ORM.png'))
print('PLATES ATLAS written: %d px per plate width, %.3f mm per pixel' % (int(TW * 0.92), px_m * 1000))
