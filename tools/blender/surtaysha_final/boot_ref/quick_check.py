# Fast silhouette check of the hull retopology against the reference masks, outside Blender (numpy + PIL).
#   python quick_check.py -> quick_front.png, quick_side.png, IoU numbers; also checks the leg stays inside.
import os, sys, math, numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import boot_hull
H = boot_hull.Hull()
R = H.upper_rings()
cap = H.toe_cap(R[-1])
quads = []
for j in range(len(R) - 1):
    for i in range(R.shape[1]):
        quads.append([R[j][i], R[j][(i + 1) % R.shape[1]], R[j + 1][(i + 1) % R.shape[1]], R[j + 1][i]])
for j in range(len(cap) - 1):
    for i in range(len(cap[0]) - 1):
        quads.append([cap[j][i], cap[j][i + 1], cap[j + 1][i + 1], cap[j + 1][i]])
# crude sole: footprint grown 7 mm, between feather line and the underside
fp = H.footprint()
c = np.mean(fp, axis=0)
for k in range(len(fp)):
    a, b = np.array(fp[k]), np.array(fp[(k + 1) % len(fp)])
    a = a + (a - c) / np.linalg.norm(a - c) * 0.007; b = b + (b - c) / np.linalg.norm(b - c) * 0.007
    quads.append([(a[0], a[1], H.z_feather(a[1])), (b[0], b[1], H.z_feather(b[1])), (b[0], b[1], H.z_bottom(b[1])), (a[0], a[1], H.z_bottom(a[1]))])
print('rings', R.shape, 'toe', H.y_toe, 'heel', H.y_heel, 'pivot', H.P)
def raster(view, mask_path, px, out):
    m = np.asarray(Image.open(os.path.join(HERE, mask_path))) > 127
    S = 4; im = Image.new('L', (m.shape[1] * S, m.shape[0] * S), 0); d = ImageDraw.Draw(im)
    ax, gy, s, zg = px
    for q in quads:
        pts = []
        for p in q:
            if view == 'side': u = H.to_world(p, (0, 0))[1]
            else: u = H.to_world(p, (0, 0))[0]
            pts.append(((u / s + ax) * S, (gy - (p[2] - zg) / s) * S))
        d.polygon(pts, fill=255)
    r = np.asarray(im.resize((m.shape[1], m.shape[0]), Image.BOX)) > 127
    iou = (r & m).sum() / (r | m).sum()
    vis = np.zeros(m.shape + (3,), np.uint8); vis[m & r] = (200, 200, 200); vis[m & ~r] = (255, 60, 60); vis[r & ~m] = (60, 120, 255)
    Image.fromarray(vis).resize((m.shape[1] * (2 if view == 'front' else 6), m.shape[0] * (2 if view == 'front' else 6)), Image.NEAREST).save(os.path.join(HERE, out))
    return iou
d = np.load(os.path.join(HERE, 'boot_profile.npz'))
sp = d['side_px']; sp = (sp[0] - 812, sp[1] - 600, sp[2], sp[3])
print('IoU side  %.4f' % raster('side', 'mask_side.png', sp, 'quick_side.png'))
print('IoU front %.4f' % raster('front', 'mask_front.png', d['front_px'], 'quick_front.png'))
# leg containment
L = np.load(os.path.join(HERE, 'leg_pts.npy'))
sel = L[(L[:, 2] > 0.25) & (L[:, 2] < 0.40)]
ORIGIN = (float((sel[:, 0].min() + sel[:, 0].max()) / 2), float((sel[:, 1].min() + sel[:, 1].max()) / 2))
print('origin', ORIGIN)
out = 0; worst = []
for p in L[L[:, 2] < 0.44]:
    q = H.to_local(p, ORIGIN)
    if not H.inside(q[0], q[1], max(q[2], H.z_feather(q[1]) - 0.011)): out += 1; worst.append(p)
print('leg points outside the boot:', out, 'of', int((L[:, 2] < 0.44).sum()))
if worst:
    W = np.array(worst); print(' outside range', W.min(axis=0), W.max(axis=0))
