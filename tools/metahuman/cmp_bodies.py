# Objective comparison of two exported MetaHuman bodies (out/gp_mesh_<tag>.json written by the gada / gada2 steps):
# silhouettes below the neck from the front, the side and the back drawn from the meshes with the same orthographic
# camera, their IoU, an overlay picture, and (same topology) the per-vertex distance.
#   python cmp_bodies.py <tagA> <tagB> <out_prefix>
import json, sys, math
from PIL import Image, ImageDraw, ImageChops
OUT = 'F:/qirq-qiz/tools/metahuman/out'; S = 6      # pixels per cm
def load(tag):
    D = json.load(open(f'{OUT}/gp_mesh_{tag}.json')); V = D['v']; I = D['i']
    mn = [min(q[i] for q in V) for i in range(3)]; mx = [max(q[i] for q in V) for i in range(3)]; ex = [mx[i] - mn[i] for i in range(3)]
    up = ex.index(max(ex)); rest = [i for i in range(3) if i != up]; lat = max(rest, key=lambda i: ex[i]); dep = [i for i in rest if i != lat][0]; lc = (mn[lat] + mx[lat]) / 2
    C = [(q[lat] - lc, q[dep], q[up] - mn[up]) for q in V]
    toes = [q[1] for q in C if q[2] < 3]; pel = [q[1] for q in C if 85 < q[2] < 95 and abs(q[0]) < 12]
    fs = 1.0 if sum(toes) / len(toes) > sum(pel) / len(pel) else -1.0
    pc = sum(pel) / len(pel) * fs
    C = [(x, y * fs - pc, z) for x, y, z in C]      # +y forward, pelvis centre at 0
    return C, [tuple(I[k:k + 3]) for k in range(0, len(I), 3)], max(q[2] for q in C)
def sil(C, T, view, zmax, W=150, H=190):
    im = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(im)
    def pr(q):
        x = q[0] if view == 'front' else (-q[0] if view == 'back' else -q[1])
        return ((W / 2 + x) * S, (H - q[2]) * S)
    for a, b, c in T:
        if C[a][2] > zmax and C[b][2] > zmax and C[c][2] > zmax: continue
        d.polygon([pr(C[a]), pr(C[b]), pr(C[c])], fill=255)
    d.rectangle([0, 0, W * S, (H - zmax) * S], fill=0)
    return im
ta, tb, pre = sys.argv[1], sys.argv[2], sys.argv[3]
A, TA, HA = load(ta); B, TB, HB = load(tb)
zcut = 0.84 * HA      # below the neck (about the collar-bone line)
print('heights: %s %.1f cm, %s %.1f cm; compared below z = %.1f cm' % (ta, HA, tb, HB, zcut))
panels = []
for view in ('front', 'side', 'back'):
    a = sil(A, TA, view, zcut); b = sil(B, TB, view, zcut)
    inter = sum(1 for p in ImageChops.multiply(a, b).getdata() if p > 127); union = sum(1 for p in ImageChops.lighter(a, b).getdata() if p > 127)
    print('IoU %-5s %.4f' % (view, inter / union))
    ov = Image.merge('RGB', (a, b, b)).point(lambda v: 255 - v // 2 if False else v)      # A red, B cyan, both = white
    bg = Image.new('RGB', ov.size, (255, 255, 255)); m = ImageChops.lighter(a, b)
    col = Image.merge('RGB', (ImageChops.subtract(m, b).point(lambda v: 230 if v > 127 else 0), Image.new('L', a.size, 0), ImageChops.subtract(m, a).point(lambda v: 230 if v > 127 else 0)))
    both = ImageChops.multiply(a, b); grey = Image.merge('RGB', (both.point(lambda v: 150 if v > 127 else 0),) * 3)
    comp = ImageChops.add(col, grey); bg.paste(comp, (0, 0), m)
    ImageDraw.Draw(bg).text((10, 10), '%s: grey = both, red = only %s, blue = only %s, IoU %.4f' % (view, ta, tb, inter / union), fill=(0, 0, 0)); panels.append(bg)
sheet = Image.new('RGB', (sum(p.width for p in panels), panels[0].height), 'white'); x = 0
for p in panels: sheet.paste(p, (x, 0)); x += p.width
sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS); sheet.save(pre + '_overlay.png'); print('overlay', pre + '_overlay.png', sheet.size)
if len(A) == len(B):
    d = [math.dist(p, q) for p, q in zip(A, B) if p[2] < zcut]
    print('same topology: per-vertex distance below the neck: max %.3f cm, mean %.3f cm (n %d)' % (max(d), sum(d) / len(d), len(d)))
    dh = [math.dist(p, q) for p, q in zip(A, B) if p[2] >= zcut]
    print('head / neck region (expected to differ: different face): max %.2f cm, mean %.2f cm' % (max(dh), sum(dh) / len(dh)))
