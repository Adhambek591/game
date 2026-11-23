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
sheet.save(out); print('sheet', out, sheet.size)
