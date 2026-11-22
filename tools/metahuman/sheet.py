# Labelled contact sheet: python sheet.py out.png cols "label1=img1" "label2=img2" ...
import sys
from PIL import Image, ImageDraw, ImageFont
out, cols = sys.argv[1], int(sys.argv[2]); items = [a.split('=', 1) for a in sys.argv[3:]]
T = 512
try: font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 40)
except Exception: font = ImageFont.load_default()
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * T, rows * T), (30, 30, 30))
for i, (lab, fn) in enumerate(items):
    im = Image.open(fn).convert('RGB'); im.thumbnail((T, T))
    x, y = (i % cols) * T, (i // cols) * T
    sheet.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2))
    d = ImageDraw.Draw(sheet); d.rectangle([x + 8, y + 8, x + 8 + max(60, 24 * len(lab)), y + 60], fill=(0, 0, 0))
    d.text((x + 16, y + 12), lab, fill=(255, 255, 255), font=font)
sheet.save(out); print('sheet', out, sheet.size)
