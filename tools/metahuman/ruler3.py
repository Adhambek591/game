# Three figures rendered with the SAME fixed camera, side by side with a height ruler; prints head-top height and widths.
#   python ruler3.py out.png ref_height_cm img_ref img_b img_c [label_ref label_b label_c]
# The ruler is calibrated on the first image: soles = 0 cm, top of the head = ref_height_cm.
import sys
from PIL import Image, ImageDraw
TH = 246
out, Href = sys.argv[1], float(sys.argv[2]); files = sys.argv[3:6]; labels = sys.argv[6:9] if len(sys.argv) >= 9 else files
def ext(im):
    # figure = anything that is not the white backdrop (a light, lit scalp is brighter than a plain grey threshold)
    r, g_, b = im.convert('RGB').split(); from PIL import ImageChops
    g = ImageChops.darker(ImageChops.darker(r, g_), b).point(lambda v: 0 if v < TH else 255); w, h = g.size; px = g.load()
    rows = [y for y in range(h) if sum(1 for x in range(0, w, 2) if px[x, y] < 200) >= 3]
    return g, rows[0], rows[-1]
ims = [Image.open(f).convert('RGB') for f in files]; g0, top0, bot0 = ext(ims[0]); k = (bot0 - top0) / Href      # px per cm
res = []
for im, lb in zip(ims, labels):
    g, top, bot = ext(im); w, h = g.size; px = g.load()
    def width_at(cm):
        y = int(bot0 - cm * k); xs = [x for x in range(w) if px[x, y] < 200]; return ((xs[-1] - xs[0]) / k, xs[0], xs[-1]) if xs else (0, 0, 0)
    res.append((lb, (bot0 - top) / k, (bot0 - bot) / k, width_at(Href * 0.80)[0], width_at(Href * 0.50)[0]))
    print('%-22s head top %.1f cm  soles %+.1f cm  width at 80%% height %.1f cm  width at 50%% height %.1f cm' % res[-1])
crop_l = min(ext(i)[0].getbbox()[0] for i in ims)
W, H = ims[0].size; sheet = Image.new('RGB', (W * 3, H), 'white')
for i, im in enumerate(ims): sheet.paste(im, (i * W, 0))
d = ImageDraw.Draw(sheet)
for cm in range(0, int(Href) + 11, 10):
    y = int(bot0 - cm * k); d.line([(0, y), (W * 3, y)], fill=(170, 170, 170) if cm % 50 else (90, 90, 90), width=1 if cm % 50 else 2); d.text((6, y - 14), '%d cm' % cm, fill=(40, 40, 40))
for i, (lb, ht, so, w80, w50) in enumerate(res):
    y = int(bot0 - ht * k); d.line([(i * W + 80, y), (i * W + W - 40, y)], fill=(220, 30, 30), width=2); d.text((i * W + 90, 20), '%s: head top %.1f cm' % (lb, ht), fill=(200, 0, 0))
sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS); sheet.save(out); print('saved', out, sheet.size)
