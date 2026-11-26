# Side-profile check of a conformed MetaHuman body against the approved reference.
#   python profile_cmp.py out.png ref.png "x0,x1" ours_side.png target.json result.json scale [label]
# Panel 1: ref side | ours side silhouettes, same height, outlines overlaid (ref red, ours blue), full figure.
# Panel 2: the same overlay zoomed on the upper body (back + bust).
# Panel 3: mesh profiles in cm (1 cm grid): wrap target (green) vs conform result (blue), back line (spine band) and
#          front line (bust band), result brought back to the target size by `scale` and aligned at the pelvis.
# Prints the max / mean back and bust differences in cm. Pure python + PIL (no numpy).
import sys, json, math
from PIL import Image, ImageDraw, ImageFont, ImageChops
out, ref, sx, ours, tj, rj, scale = sys.argv[1:8]; scale = float(scale); label = sys.argv[8] if len(sys.argv) > 8 else ''
H = 1200
try: F = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 30); FS = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
except Exception: F = FS = ImageFont.load_default()

def mask(im, thr=22):
    im = im.convert('RGB'); bg = Image.new('RGB', im.size, im.getpixel((3, 3)))
    m = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > thr else 0)
    b = m.getbbox(); m = m.crop(b); im = im.crop(b); s = H / m.height
    return m.resize((max(1, int(m.width * s)), H), Image.NEAREST), im.resize((max(1, int(im.width * s)), H), Image.LANCZOS)

def edges(m):
    px = m.load(); L = []; R = []
    for y in range(m.height):
        xs = [x for x in range(m.width) if px[x, y]]
        L.append(xs[0] if xs else None); R.append(xs[-1] if xs else None)
    return L, R

r = Image.open(ref); a, b = map(int, sx.split(',')); rm, ri = mask(r.crop((a, 0, b, r.height)))
om, oi = mask(Image.open(ours))
# both must face LEFT (front = left edge): the figure's toes are on the front side -> compare the foot row extents
def faces_left(m):
    L, R = edges(m); rows = [(L[y], R[y]) for y in range(int(H * 0.97), H) if L[y] is not None]
    mid = [(L[y] + R[y]) / 2 for y in range(int(H * 0.80), int(H * 0.90)) if L[y] is not None]
    c = sum(mid) / len(mid); l = min(x for x, _ in rows); rr = max(x for _, x in rows)
    return (c - l) > (rr - c)
if not faces_left(rm): rm = rm.transpose(Image.FLIP_LEFT_RIGHT); ri = ri.transpose(Image.FLIP_LEFT_RIGHT)
if not faces_left(om): om = om.transpose(Image.FLIP_LEFT_RIGHT); oi = oi.transpose(Image.FLIP_LEFT_RIGHT)
rL, rR = edges(rm); oL, oR = edges(om)
# horizontal alignment: back edge (right) at ankle-to-knee level averaged
def anchor(L, R):
    v = [(L[y] + R[y]) / 2 for y in range(int(H * 0.62), int(H * 0.72)) if L[y] is not None]; return sum(v) / len(v)
dx = anchor(rL, rR) - anchor(oL, oR)
W = 520
def overlay(y0, y1, zoom, title):
    w = int(W * zoom); h = int((y1 - y0) * zoom); im = Image.new('RGB', (w, h + 50), (255, 255, 255)); d = ImageDraw.Draw(im)
    cx = anchor(rL, rR)
    def X(x): return w / 2 + (x - cx) * zoom
    for (L, R, off, col) in ((rL, rR, 0, (220, 30, 30)), (oL, oR, dx, (30, 60, 220))):
        for E in (L, R):
            pts = [(X(E[y] + off), 50 + (y - y0) * zoom) for y in range(y0, y1) if E[y] is not None]
            d.line(pts, fill=col, width=3)
    d.text((10, 8), title, fill=(0, 0, 0), font=F); return im
full = overlay(0, H, 1.0, 'outline: ref (red) / ours (blue)')
zoomp = overlay(int(H * 0.10), int(H * 0.48), 2.6, 'upper body x2.6: back + bust')

# ---- mesh profiles
def load(p):
    P = json.load(open(p)); mn = [min(q[i] for q in P) for i in range(3)]; mx = [max(q[i] for q in P) for i in range(3)]; ex = [mx[i] - mn[i] for i in range(3)]
    up = ex.index(max(ex)); rest = [i for i in range(3) if i != up]; lat = max(rest, key=lambda i: ex[i]); dep = [i for i in rest if i != lat][0]
    lc = (mn[lat] + mx[lat]) / 2; C = [(q[lat] - lc, q[dep], q[up] - mn[up]) for q in P]
    toes = [q[1] for q in C if q[2] < 3]; body = [q[1] for q in C if 85 < q[2] < 95 and abs(q[0]) < 12]
    sgn = 1 if sum(toes) / len(toes) > sum(body) / len(body) else -1      # +depth = forward
    return [(x, y * sgn, z) for x, y, z in C]
T = load(tj); Rr = [(x / scale, y / scale, z / scale) for x, y, z in load(rj)]
def prof(C, z0, z1, step=1.0):
    back = {}; front = {}
    for x, y, z in C:
        if not (z0 <= z < z1): continue
        b = int((z - z0) / step)
        if abs(x) < 5: back[b] = min(back.get(b, 1e9), y)
        if 3 < abs(x) < 13: front[b] = max(front.get(b, -1e9), y)
    return back, front
def pel(C):
    v = [y for x, y, z in C if 86 < z < 94 and abs(x) < 12]; return (min(v) + max(v)) / 2
Z0, Z1 = 95.0, 142.0
tb, tf = prof(T, Z0, Z1); pt = pel(T)
# the result has the lifted neck base: compare below the lift zone only (z < 134 at target size) for the numbers
rb, rf = prof(Rr, Z0, Z1); pr = pel(Rr)
# MetaHuman's A-pose carries its own trunk lean (posture, set by the rig, not by the shape): remove it per height so the
# plot compares the SHAPE of the back and of the bust around the trunk centreline
lean = {k: ((rb[k] - pr) + (rf[k] - pr)) / 2 - ((tb[k] - pt) + (tf[k] - pt)) / 2 for k in rb if k in rf and k in tb and k in tf}
print('trunk lean of the A-pose result vs target at chest height: %.1f cm (- = backwards)' % (sum(lean[k] for k in lean if 113 <= Z0 + k <= 128) / max(1, sum(1 for k in lean if 113 <= Z0 + k <= 128))))
rb = {k: rb[k] - lean[k] for k in lean}; rf = {k: rf[k] - lean[k] for k in lean}
def diff(a, pa, b, pb, zmax):
    d = [(Z0 + k, (b[k] - pb) - (a[k] - pa)) for k in a if k in b and Z0 + k < zmax]; return d
db = diff(tb, pt, rb, pr, 134); df = diff(tf, pt, rf, pr, 134)
def stat(d): return (max(abs(v) for _, v in d), sum(abs(v) for _, v in d) / len(d), max(d, key=lambda t: abs(t[1])))
sb, sf = stat(db), stat(df)
print('BACK  result-target (cm, + = further forward): max %.2f mean %.2f worst at z=%.0f (%.2f)' % (sb[0], sb[1], sb[2][0], sb[2][1]))
print('FRONT result-target (cm, + = further forward): max %.2f mean %.2f worst at z=%.0f (%.2f)' % (sf[0], sf[1], sf[2][0], sf[2][1]))
S = 16.0; pw, ph = int(40 * S), int((Z1 - Z0) * S) + 60; plot = Image.new('RGB', (pw, ph), (255, 255, 255)); d = ImageDraw.Draw(plot)
for i in range(0, 41): d.line([(i * S, 50), (i * S, ph)], fill=(225, 225, 225) if i % 5 else (170, 170, 170))
for j in range(0, int(Z1 - Z0) + 1): d.line([(0, ph - j * S), (pw, ph - j * S)], fill=(225, 225, 225) if j % 5 else (170, 170, 170))
def PX(y, p): return pw / 2 - (y - p) * S          # forward to the left, like the pictures
for (bk, fr, p, col) in ((tb, tf, pt, (20, 150, 40)), (rb, rf, pr, (30, 60, 220))):
    for E in (bk, fr):
        pts = [(PX(E[k], p), ph - (k + 0.5) * S) for k in sorted(E)]; d.line(pts, fill=col, width=3)
d.text((10, 8), 'mesh, 1 cm grid, posture removed: wrap (green) / result (blue)', fill=(0, 0, 0), font=FS)
d.text((10, 30), 'back max %.1f cm, bust/front max %.1f cm (below the neck)' % (sb[0], sf[0]), fill=(0, 0, 0), font=FS)

hh = max(H + 110, zoomp.height + 60, plot.height + 60)
sheet = Image.new('RGB', (ri.width + oi.width + full.width + zoomp.width + plot.width + 120, hh), (235, 235, 235)); d = ImageDraw.Draw(sheet); x = 20
for im, t in ((ri, 'ref side'), (oi, 'ours side ' + label)):
    sheet.paste(im, (x, 60)); d.text((x, 14), t, fill=(0, 0, 0), font=F); x += im.width + 20
for im in (full, zoomp, plot): sheet.paste(im, (x, 10)); x += im.width + 20
sheet.save(out); print('sheet', out, sheet.size)
