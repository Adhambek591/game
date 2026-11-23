# Body-match sheet: python moslash.py out.png ref.png "x0,x1" "x0,x1" ours_front.png ours_side.png
# -> ref front | ours front | ref side | ours side, each figure cropped to its silhouette and scaled to the same height
import sys
from PIL import Image, ImageDraw, ImageFont, ImageChops
out, ref, fx, sx, of, os_ = sys.argv[1:7]
H = 1100; W = 520
def fig(im):
    im = im.convert('RGB'); bg = Image.new('RGB', im.size, im.getpixel((3, 3)))
    d = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 22 else 0); b = d.getbbox() or (0, 0) + im.size
    im = im.crop((max(0, b[0] - 10), max(0, b[1] - 10), min(im.width, b[2] + 10), min(im.height, b[3] + 10))); s = H / im.height
    return im.resize((max(1, int(im.width * s)), H), Image.LANCZOS)
r = Image.open(ref)
def rc(xs):
    a, b = map(int, xs.split(',')); return fig(r.crop((a, 0, b, r.height)))
cells = [('ref old', rc(fx)), ('bizniki old', fig(Image.open(of))), ('ref yon', rc(sx)), ('bizniki yon', fig(Image.open(os_)))]
sheet = Image.new('RGB', (W * 4, H + 80), (200, 200, 200)); dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 36)
except Exception: font = ImageFont.load_default()
for i, (lab, im) in enumerate(cells):
    if im.width > W: im = im.crop(((im.width - W) // 2, 0, (im.width - W) // 2 + W, H))
    sheet.paste(im, (i * W + (W - im.width) // 2, 70)); dr.text((i * W + 16, 16), lab, fill=(0, 0, 0), font=font)
for y in range(70, H + 70, 110): dr.line([(0, y), (W * 4, y)], fill=(255, 0, 0), width=1)
# second row: crotch / upper-leg crops of both front views at the same body-relative region, enlarged
def crotch(im):
    w = int(H * 0.17); cx = im.width // 2; return im.crop((cx - w, int(H * 0.47), cx + w, int(H * 0.66))).resize((W * 2 - 20, int((W * 2 - 20) * (H * 0.19) / (2 * w))), Image.LANCZOS)
cr = [crotch(cells[0][1]), crotch(cells[1][1])]; h2 = max(c.height for c in cr) + 70
full = Image.new('RGB', (sheet.width, sheet.height + h2), (200, 200, 200)); full.paste(sheet, (0, 0)); dr = ImageDraw.Draw(full)
for i, (lab, c) in enumerate(zip(('ref oraliq (kesim)', 'bizniki oraliq (kesim)'), cr)):
    full.paste(c, (i * W * 2 + 10, sheet.height + 60)); dr.text((i * W * 2 + 16, sheet.height + 10), lab, fill=(0, 0, 0), font=font)
full.save(out); print('sheet', out, full.size)
