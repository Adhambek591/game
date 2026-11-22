# flatten the RGBA renders (shadow-catcher floor) onto a studio-grey backdrop like the reference sheet
# python compose.py <dir> [prefix]
import sys, os
from PIL import Image
d = sys.argv[1]; pre = sys.argv[2] if len(sys.argv) > 2 else 'surtaysha_sovut_'
for f in os.listdir(d):
    if not (f.startswith(pre) and f.endswith('.png')): continue
    p = os.path.join(d, f); im = Image.open(p)
    if im.mode != 'RGBA': continue
    w, h = im.size
    bg = Image.new('RGB', (w, h))
    px = bg.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        c = int(206 - 26 * t)
        for x in range(w): px[x, y] = (c, c, c + 2)
    bg.paste(im, (0, 0), im)
    bg.save(p)
    print('composed', p)
