# ref (surtaysha_turn.png: front | three-quarter | side | back) against our four renders, one sheet.
#   python cmp_ref.py out.png ours_front ours_q34 ours_side ours_back
import sys
from PIL import Image, ImageDraw
ref = Image.open('F:/qirq-qiz/tools/blender/char/ref/surtaysha_turn.png').convert('RGB'); crops = [(0, 0, 410, 768), (410, 0, 800, 768), (800, 0, 1010, 768), (1010, 0, 1376, 768)]
H = 900; cols = []
for (bx, f, lb) in zip(crops, sys.argv[2:6], ('old', 'q34', 'yon', 'orqa')):
    r = ref.crop(bx); r = r.resize((int(r.width * H / r.height), H), Image.LANCZOS); o = Image.open(f).convert('RGB'); o = o.resize((int(o.width * H / o.height), H), Image.LANCZOS)
    c = Image.new('RGB', (r.width + o.width + 6, H + 26), 'white'); c.paste(r, (0, 26)); c.paste(o, (r.width + 6, 26)); ImageDraw.Draw(c).text((6, 6), lb + ': ref | biz', fill=(0, 0, 0)); cols.append(c)
s = Image.new('RGB', (sum(c.width for c in cols) + 12 * 3, H + 26), 'white'); x = 0
for c in cols: s.paste(c, (x, 0)); x += c.width + 12
s.save(sys.argv[1]); print(sys.argv[1], s.size)
