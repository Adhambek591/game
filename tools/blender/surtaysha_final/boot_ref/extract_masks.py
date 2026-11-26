# Boot silhouettes from the author's reference (semi-automatic: hand-traced polygons where the boot touches
# other dark things, brightness threshold where it stands against the light backdrop).
#   python extract_masks.py          (system python with PIL + numpy)
# -> mask_front.png, mask_side.png (white = boot), check_front.png, check_side.png (outline over the ref crop)
# Front: surtaysha_ref.png, the boot on the image left (character's right boot, toe-out ~10 deg like the body),
#        mirrored so it reads as the LEFT boot seen from the front (outer side on the image right).
# Side:  surtaysha_turn.png third view, near boot (character's left boot seen from its outer side, toe to the left).
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', '..', 'char', 'ref')
SS = 4   # polygon supersampling

def poly_mask(size, pts, box):
    w, h = (box[2] - box[0]) * SS, (box[3] - box[1]) * SS
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([((x - box[0]) * SS, (y - box[1]) * SS) for x, y in pts], fill=255)
    return np.asarray(im.resize((w // SS, h // SS), Image.BOX)) > 127

def largest_filled(m):
    from scipy import ndimage as ndi
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1)); m = lab == (1 + int(np.argmax(sizes)))
    return ndi.binary_fill_holes(m)

def outline(m):
    from scipy import ndimage as ndi
    return m & ~ndi.binary_erosion(m)

def check(crop, m, path, s):
    c = crop.resize((crop.width * s, crop.height * s), Image.BICUBIC).convert('RGB')
    mm = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(c.size, Image.NEAREST)) > 127
    a = np.asarray(c).copy(); a[outline(mm)] = (255, 40, 40)
    Image.fromarray(a).save(path)

# ------------------------------------------------------------------ front (1792x2400)
FBOX = (520, 1890, 880, 2360)
# generous where the backdrop is light, tight along the trouser cuff (top) and where the cape hangs behind
FRONT = [(600, 1917), (640, 1921), (700, 1925), (760, 1922), (793, 1917),      # top rim under the trouser cuff (tight)
         (791, 1950), (797, 1960), (798, 1995), (790, 1999), (779, 2002), (776, 2040),   # inner side, strap tab (cape behind: tight)
         (775, 2045), (780, 2100), (764, 2160), (763, 2255), (759, 2285), (745, 2310),   # inner side (cast shadow: tight)
         (722, 2325), (690, 2330), (650, 2334), (610, 2335), (570, 2331), (546, 2323),   # sole bottom (contact shadow: tight)
         (535, 2300), (540, 2250), (575, 2190), (590, 2150), (595, 2110), (592, 2060),
         (610, 2045), (608, 2030), (604, 2000), (600, 1985), (598, 1965), (599, 1950)]   # outer side (cape behind above y 2045: tight)
def front():
    im = Image.open(os.path.join(REF, 'surtaysha_ref.png')).convert('RGB')
    crop = im.crop(FBOX); a = np.asarray(crop).astype(np.float32)
    lum = a.mean(axis=2)
    y = np.arange(FBOX[1], FBOX[3])[:, None]
    # backdrop is ~190, the contact shadow under the sole goes down to ~120: boot leather/sole is darker than 112
    notbg = lum < np.where(y > 2325, 100, 140)
    m = poly_mask(im.size, FRONT, FBOX) & notbg
    m = largest_filled(m)
    check(crop, m, os.path.join(HERE, 'check_front.png'), 3)
    m = m[:, ::-1]                                                   # -> left boot
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'mask_front.png'))
    crop.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(HERE, 'ref_front.png'))
    return m

# ------------------------------------------------------------------ side (1376x768)
SBOX = (812, 600, 962, 756)
SIDE = [(880, 613), (941, 613),                                      # top (trousers above: tight)
        (941, 650),                                                  # coat strip behind (tight)
        (949, 652), (946, 700), (947.6, 714), (947.6, 728), (946.6, 733),   # back of shaft / heel (cast shadow low down: tight)
        (946.5, 745.6), (916, 745.8), (915, 743.6), (906, 743.4),    # heel lift (dropped ~3 px onto the ground line), arch
        (890, 745.6), (865, 746.6), (850, 746.4), (840, 745.2), (832, 743.2), (826, 740.6),   # sole bottom, toe spring (tight: shadow)
        (821, 738), (821, 729), (823, 727), (823, 719), (828.5, 716), (832, 713),      # sole tip / toe (backdrop)
        (837, 711.6), (845, 710.4), (855, 709.2), (866, 705.6), (873, 699.4), (879, 690), (883, 680),   # toe top, instep (far boot behind: tight)
        (884, 670), (883, 660), (881, 640)]                          # shaft front (far boot's shaft behind: tight)
def side():
    im = Image.open(os.path.join(REF, 'surtaysha_turn.png')).convert('RGB')
    crop = im.crop(SBOX); a = np.asarray(crop).astype(np.float32)
    lum = a.mean(axis=2)
    m = poly_mask(im.size, SIDE, SBOX) & (lum < 140)
    m = largest_filled(m)
    check(crop, m, os.path.join(HERE, 'check_side.png'), 8)
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'mask_side.png'))
    crop.save(os.path.join(HERE, 'ref_side.png'))
    return m

if __name__ == '__main__':
    mf = front(); ms = side()
    for n, m in (('front', mf), ('side', ms)):
        ys, xs = np.nonzero(m)
        print(n, 'bbox x', xs.min(), xs.max(), 'y', ys.min(), ys.max(), 'area', int(m.sum()))
