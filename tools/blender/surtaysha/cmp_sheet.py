# ref | front | 3/4 comparison sheet -> surtaysha_sovut_cmp.png
import sys, os
from PIL import Image
d = sys.argv[1]
ref = Image.open(r"F:\qirq-qiz\tools\blender\char\ref\surtaysha_ref.png").convert('RGB')
ims = [ref] + [Image.open(os.path.join(d, 'surtaysha_sovut_%s.png' % n)).convert('RGB') for n in ('front', 'q34')]
H = 1600
ims = [im.resize((int(im.width * H / im.height), H)) for im in ims]
sheet = Image.new('RGB', (sum(i.width for i in ims) + 20 * (len(ims) - 1), H), (40, 40, 40))
x = 0
for im in ims:
    sheet.paste(im, (x, 0)); x += im.width + 20
sheet.save(os.path.join(d, 'surtaysha_sovut_cmp.png')); print('cmp sheet saved')
