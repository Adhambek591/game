# Point plots (side: central band only; front: all) of vertex dumps written by the gexact step.
#   python gx_plot.py out.png name1 name2 ...      (names of out/gx_<name>.json)
import json, sys
from PIL import Image, ImageDraw
OUT = 'F:/qirq-qiz/tools/metahuman/out'; S = 4; HT = 190
def view(name, front):
    P = json.load(open(f'{OUT}/gx_{name}.json'))
    toes = [q[1] for q in P if q[2] < 3]; pel = [q[1] for q in P if 85 < q[2] < 95 and abs(q[0]) < 12]
    fs = 1 if sum(toes) / len(toes) > sum(pel) / len(pel) else -1
    W = 130 if front else 90; im = Image.new('RGB', (W * S, HT * S), 'white'); d = ImageDraw.Draw(im)
    for z in range(0, HT, 10): d.line([(0, (HT - z) * S), (W * S, (HT - z) * S)], fill=(220, 220, 220)); d.text((2, (HT - z) * S - 12), str(z), fill=(120, 120, 120))
    for x, y, z in P:
        if front: px = int((W / 2 + x) * S)
        elif abs(x) < 14: px = int((W / 2 - y * fs) * S)
        else: continue
        py = int((HT - z) * S)
        if 0 <= px < im.width and 0 <= py < im.height: im.putpixel((px, py), (30, 60, 200))
    d.text((10, 6), name + (' front' if front else ' side (front = left)') + '  top %.1f' % max(q[2] for q in P), fill=(0, 0, 0)); return im
ims = [view(n, f) for n in sys.argv[2:] for f in (False, True)]
s = Image.new('RGB', (sum(i.width for i in ims), ims[0].height), 'white'); x = 0
for i in ims: s.paste(i, (x, 0)); x += i.width
s.save(sys.argv[1]); print(sys.argv[1], s.size)
