# turnaround ref | front | 3/4 | side | back comparison sheet -> surtaysha_sovut_cmp.png
import sys, os
from PIL import Image
d = sys.argv[1]
H = 1600
turn = Image.open(r"F:/qirq-qiz/tools/blender/char/ref/surtaysha_turn.png").convert('RGB')
ims = [turn.resize((int(turn.width * H / turn.height), H))]
for n in ('front', 'q34', 'side', 'back'):
    p = os.path.join(d, 'surtaysha_sovut_%s.png' % n)
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); ims.append(im.resize((int(im.width * H / im.height), H)))
sheet = Image.new('RGB', (sum(i.width for i in ims) + 20 * (len(ims) - 1), H), (40, 40, 40))
x = 0
for im in ims:
    sheet.paste(im, (x, 0)); x += im.width + 20
sheet.save(os.path.join(d, 'surtaysha_sovut_cmp.png')); print('cmp sheet saved')
