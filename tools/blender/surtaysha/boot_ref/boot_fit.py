# Reference masks -> metric profile tables for the boot hull (boot_profile.npz).
#   python boot_fit.py      (system python: PIL + numpy + scipy; run extract_masks.py first)
# Scale: ground line = z -0.040 (the boot stands 4 cm under the bare MetaHuman sole), boot top = z 0.450 (just under
# the knee joint at 0.495), the same scale for widths, in both views.
import os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__))
Z_GROUND, Z_TOP = -0.040, 0.450
UP = 4

# ---- side view (crop origin 812,600 of surtaysha_turn.png); image coords are pixel-edge coordinates
SBOX = (812, 600)
S_TOP, S_GROUND = 613.0 - SBOX[1], 746.7 - SBOX[1]
S_AXIS = (881.5 + 941.0) / 2 - SBOX[0]              # shaft axis column
ss = (Z_TOP - Z_GROUND) / (S_GROUND - S_TOP)        # metres per turn-sheet pixel
m = np.asarray(Image.open(os.path.join(HERE, 'mask_side.png'))) > 127
f = np.kron(m.astype(np.float32), np.ones((UP, UP), np.float32))
f = ndi.gaussian_filter(f, UP * 0.7)
fs = ss / UP
side_meta = np.array([(0.5 / UP - S_AXIS) * ss,                     # y of field column 0 (toe = -y, heel = +y)
                      (S_GROUND - 0.5 / UP) * ss + Z_GROUND,        # z of field row 0
                      fs])
def side_px(x, y):
    return ((x - SBOX[0] - S_AXIS) * ss, (S_GROUND - (y - SBOX[1])) * ss + Z_GROUND)
# feather line (upper / welt junction) traced on the side view; heel end lowered with the ground-line rectification
FEATHER = [(822, 729.5), (826, 730.4), (830, 732), (840, 735), (850, 737.5), (860, 739.6), (870, 740), (880, 739.3),
           (900, 737.3), (915, 736.2), (930, 735.2), (946, 733.4), (952, 733.0)]
feather = np.array([side_px(x, y) for x, y in FEATHER])

# ---- front view (crop origin 520,1890 of surtaysha_ref.png, mirrored: left boot, outer side = +x)
F_TOP, F_GROUND = 27.5, 445.5
fm = np.asarray(Image.open(os.path.join(HERE, 'mask_front.png'))) > 127
sf = (Z_TOP - Z_GROUND) / (F_GROUND - F_TOP)
rows = np.arange(fm.shape[0])
has = fm.any(axis=1)
xin = np.array([np.argmax(r) if r.any() else 0 for r in fm], np.float32)
xout = np.array([len(r) - np.argmax(r[::-1]) if r.any() else 0 for r in fm], np.float32)
r0, r1 = rows[has][0], rows[has][-1]
xin = ndi.gaussian_filter1d(xin[r0:r1 + 1], 2.5, mode='nearest'); xout = ndi.gaussian_filter1d(xout[r0:r1 + 1], 2.5, mode='nearest')
z = (F_GROUND - (rows[r0:r1 + 1] + 0.5)) * sf + Z_GROUND
sel = (z > 0.24) & (z < 0.40)
F_AXIS = float(np.mean((xin[sel] + xout[sel]) / 2))
front = np.stack([z, (xin - F_AXIS) * sf, (xout - F_AXIS) * sf], axis=1)[::-1].copy()   # ascending z
np.savez(os.path.join(HERE, 'boot_profile.npz'), side_field=f.astype(np.float32), side_meta=side_meta, feather=feather,
         front=front.astype(np.float32), side_px=np.array([SBOX[0] + S_AXIS, SBOX[1] + S_GROUND, ss, Z_GROUND]),
         front_px=np.array([F_AXIS, F_GROUND, sf, Z_GROUND]))
print('side scale %.3f mm/px  front scale %.3f mm/px  front axis col %.1f' % (ss * 1000, sf * 1000, F_AXIS))
for zz in (0.44, 0.35, 0.25, 0.19, 0.12, 0.06, 0.0):
    i = int(np.argmin(abs(front[:, 0] - zz)))
    print('front z %.2f  x %.3f .. %.3f  (w %.3f)' % (zz, front[i, 1], front[i, 2], front[i, 2] - front[i, 1]))
