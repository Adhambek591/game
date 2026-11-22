# Comparison sheet: reference crop | new boot (same view) | new boot with the reference outline | difference
# for the front and side views (orthographic renders framed exactly like the masks) and the 3/4 view.
#   python moslash_sheet.py <renders dir> <check dir with iou.json, sil_front.npy, sil_side.npy>
# -> <renders dir>/surtaysha_etik_moslash.png        (system python: PIL + numpy + scipy)
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__))
R = sys.argv[1]; C = sys.argv[2]
REF = os.path.join(HERE, '..', '..', 'char', 'ref')
BG = (190, 190, 192); H = 900; GAP = 16
iou = json.load(open(os.path.join(C, 'iou.json')))
try: font = ImageFont.truetype('arial.ttf', 26); small = ImageFont.truetype('arial.ttf', 20)
except Exception: font = small = ImageFont.load_default()

def over_grey(p):
    im = Image.open(p).convert('RGBA'); bg = Image.new('RGBA', im.size, BG + (255,)); bg.alpha_composite(im); return bg.convert('RGB')
def fit(im):
    return im.resize((int(im.width * H / im.height), H), Image.LANCZOS)
def outline(im, mask, col=(255, 40, 40), w=3):
    m = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize(im.size, Image.NEAREST)) > 127
    e = ndi.binary_dilation(m, iterations=w) & ~ndi.binary_erosion(m, iterations=1)
    a = np.asarray(im).copy(); a[e] = col; return Image.fromarray(a)
def diff(mask, sil):
    v = np.full(mask.shape + (3,), 30, np.uint8); v[mask & sil] = (205, 205, 205); v[mask & ~sil] = (255, 60, 60); v[sil & ~mask] = (60, 120, 255)
    return Image.fromarray(v).resize((mask.shape[1] * 8, mask.shape[0] * 8), Image.NEAREST)

rows = []
for view, title in (('front', 'FRONT'), ('side', 'SIDE')):
    mask = np.asarray(Image.open(os.path.join(HERE, 'mask_%s.png' % view))) > 127
    sil = np.load(os.path.join(C, 'sil_%s.npy' % view))
    ref = Image.open(os.path.join(HERE, 'ref_%s.png' % view)).convert('RGB')
    new = over_grey(os.path.join(R, 'surtaysha_sovut_etik_m%s.png' % view))
    rows.append((title + '   silhouette IoU %.3f' % iou[view],
                 [('reference', fit(ref)), ('new boot, same orthographic view', fit(new)), ('new boot + reference outline (red)', fit(outline(new, mask))),
                  ('difference: grey both, red = reference only, blue = model only', fit(diff(mask, sil)))]))
turn = Image.open(os.path.join(REF, 'surtaysha_turn.png')).convert('RGB')
q = over_grey(os.path.join(R, 'surtaysha_sovut_etik_mq34.png'))
rows.append(('3/4', [('reference (turnaround 3/4 view, left boot)', fit(turn.crop((588, 592, 700, 752)))), ('new boot', fit(q)),
                     ('new boot, lit close-up', fit(over_grey(os.path.join(R, 'surtaysha_sovut_etik.png'))))]))
W = max(sum(im.width for _, im in ims) + GAP * (len(ims) + 1) for _, ims in rows)
sheet = Image.new('RGB', (W, (H + 90) * len(rows) + GAP), (38, 38, 40)); d = ImageDraw.Draw(sheet)
y = GAP
for title, ims in rows:
    d.text((GAP, y), title, fill=(255, 255, 255), font=font); x = GAP
    for cap, im in ims:
        sheet.paste(im, (x, y + 62)); d.text((x, y + 36), cap, fill=(200, 200, 200), font=small); x += im.width + GAP
    y += H + 90
sheet.save(os.path.join(R, 'surtaysha_etik_moslash.png')); print('saved', os.path.join(R, 'surtaysha_etik_moslash.png'), sheet.size)
