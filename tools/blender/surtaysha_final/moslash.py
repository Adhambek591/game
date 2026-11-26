# Silhouette match of the costume against the author's turnaround (front + side views).
# python moslash.py <mask_dir> <out_dir>
# * reference: foreground segmented from the studio background, figures found by column projection, scaled so that
#   belt-centre -> sole equals the model's (500 px/m, same anchor as mask_render.py), centred on the legs.
# * model: flat class masks from mask_render.py (arms excluded: the turnaround's arms hang close, ours are in A-pose).
# * IoU per piece group (vertical bands) + overlay sheet (outlines + difference image).
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REF = os.environ.get('QQ_REF', r"F:\qirq-qiz\tools\blender\char\ref\surtaysha_turn.png")
MD = sys.argv[1] if len(sys.argv) > 1 else r"F:\qirq-qiz\tools\blender\surtaysha_final\out\moslash"
OD = sys.argv[2] if len(sys.argv) > 2 else r"F:\qirq-qiz-unity\Builds"
PXM, W, H, ZC, SOLE = 500, 800, 1150, 1.0, -0.040
FLOOR_ROW = (ZC + H / 2 / PXM - SOLE) * PXM
Z = lambda z: FLOOR_ROW - (z - SOLE) * PXM          # model z (m) -> row
# model landmark heights (m): belt centre, tasset bottom, hem, boot top, sole
LM = json.load(open(os.path.join(MD, 'landmarks_model.json'))) if os.path.exists(os.path.join(MD, 'landmarks_model.json')) else \
    {'belt': 1.093, 'tasset': 0.63, 'hem': 0.525, 'boot': 0.45, 'shoulder': 1.45}

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.float32) / 255.0
rh, rw, _ = ref.shape
bg = np.median(np.concatenate([ref[:40, :].reshape(-1, 3), ref[:40, -200:].reshape(-1, 3)]), axis=0)
mx, mn = ref.max(2), ref.min(2)
sat = (mx - mn) / np.maximum(mx, 1e-4)
dist = np.linalg.norm(ref - bg, axis=2)
fg = (dist > 0.12) | (sat > 0.22)
# floor shadows are desaturated and only a little darker than the backdrop: drop them
shadow = (sat < 0.12) & (mx > 0.45)
fg &= ~shadow
fg = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))) > 127

# figures by column projection over the body rows
col = fg[int(rh * 0.15):int(rh * 0.85)].sum(0) > 8
runs, inrun = [], False
for x, c in enumerate(col):
    if c and not inrun: s0 = x; inrun = True
    if not c and inrun:
        if x - s0 > 60: runs.append((s0, x))
        inrun = False
print('figures (cols)', runs)
FIG = {'front': runs[0], 'side': runs[2]}

def ref_landmarks(m):
    rows = np.where(m.any(1))[0]
    top, sole = rows.min(), rows.max()
    return top, sole

def ref_view(name):
    x0, x1 = FIG[name]
    pad = 12
    m = fg[:, max(0, x0 - pad):min(rw, x1 + pad)]
    img = ref[:, max(0, x0 - pad):min(rw, x1 + pad)]
    top, sole = ref_landmarks(m)
    # belt centre: the row with the most dark-red belt leather between 30 % and 50 % of the figure height
    r_, g_, b_ = img[..., 0], img[..., 1], img[..., 2]
    red = (r_ > 0.42) & (g_ > 0.30) & (b_ < g_ - 0.10) & (r_ > b_ + 0.18) & m      # gold belt plaques / buckle
    r0_, r1_ = int(top + (sole - top) * 0.30), int(top + (sole - top) * 0.50)
    cnt = red[r0_:r1_].sum(1)
    belt = r0_ + int(np.argmax(np.convolve(cnt, np.ones(9) / 9, 'same')))
    print(name, 'belt fraction %.3f' % ((belt - top) / (sole - top)))
    s = ((LM['belt'] - SOLE) * PXM) / (sole - belt)
    global S_FRONT
    if name == 'front': S_FRONT = s
    else: s = S_FRONT          # same figure size in every view of the turnaround: reuse the front scale
    nw, nh = int(m.shape[1] * s), int(m.shape[0] * s)
    M = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((nw, nh), Image.BILINEAR)) > 127
    I = np.asarray(Image.fromarray((img * 255).astype(np.uint8)).resize((nw, nh), Image.BILINEAR))
    # anchor: sole row -> FLOOR_ROW; leg centre column -> model leg centre column
    sole_s = sole * s
    legs = M[int(sole_s - 0.40 * PXM):int(sole_s)]
    cx = np.where(legs.any(0))[0]
    cxr = (cx.min() + cx.max()) / 2 if name == 'front' else None
    out = np.zeros((H, W), bool); outi = np.full((H, W, 3), 230, np.uint8)
    dy = int(round(FLOOR_ROW - sole_s))
    return M, I, dy, cxr, s, top * s + dy

def hair_mask(I):
    f = I.astype(np.float32) / 255.0
    mxx = f.max(2); mnn = f.min(2)
    return (mxx < 0.17) & ((mxx - mnn) < 0.10)

def place(M, I, dy, dx):
    out = np.zeros((H, W), bool); outi = np.full((H, W, 3), 230, np.uint8)
    for y in range(H):
        sy = y - dy
        if 0 <= sy < M.shape[0]:
            xs = np.arange(W) - dx
            ok = (xs >= 0) & (xs < M.shape[1])
            out[y, ok] = M[sy, xs[ok]]; outi[y, ok] = I[sy, xs[ok]]
    return out, outi

def model_mask(name):
    a = np.asarray(Image.open(os.path.join(MD, 'mask_' + name + '.png')).convert('RGB')).astype(int)
    fgm = a.sum(2) > 30
    arm = (a[..., 1] > 200) & (a[..., 0] < 60) & (a[..., 2] < 60)
    return fgm & ~arm, arm, a

def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 1.0

S_FRONT = None
report = {}
for name in ('front', 'side'):
    M, I, dy, cxr, s, top_row = ref_view(name)
    mm, arm, a = model_mask(name)
    # horizontal anchor: centre of the legs band (front) / centre of the boot band (side)
    band = slice(int(Z(0.40)), int(FLOOR_ROW))
    mc = np.where(mm[band].any(0))[0]; mcx = (mc.min() + mc.max()) / 2
    if name == 'front':
        dx = int(round(W / 2 - cxr))          # model is centred on x = 0 (camera axis)
    else:
        rb = M[int(M.shape[0] - 1) - int(0.30 * PXM):].any(0)   # rough; refined below
        dx = 0
    R, RI = place(M, I, dy, dx)
    if name == 'side':
        sk = slice(int(Z(LM['tasset'])), int(Z(LM['hem'])))       # align the side views on the skirt
        # align on the blue skirt cloth between tasset bottom and hem (sabre, hands, braids left out by colour)
        sk = slice(int(Z(LM['tasset'])), int(Z(LM['hem'])))
        sk = slice(int(Z(1.40)), int(Z(1.15)))
        rb = R[sk]
        mb_ = mm[sk]
        rc = np.where(rb.any(0))[0]; mc2 = np.where(mb_.any(0))[0]
        dx2 = int(round((mc2.min() + mc2.max()) / 2 - (rc.min() + rc.max()) / 2))
        R, RI = place(M, I, dy, dx + dx2)
    # the reference's arms hang beside the body: remove reference pixels lying outside the model torso columns
    # in the torso band only where our arms (excluded) are, so both sides compare the same thing
    hm = hair_mask(RI); hm[int(Z(LM['belt'])):] = False
    R_cmp = R & ~arm & ~hm
    groups = {
        'head_helmet': (Z(1.95), Z(1.45)),
        'torso_armour': (Z(1.45), Z(LM['tasset'])),
        'skirt': (Z(LM['tasset']), Z(LM['hem'])),
        'trousers_boots': (Z(LM['hem']), FLOOR_ROW + 1),
    }
    res = {}
    for g, (r0, r1) in groups.items():
        sl = slice(int(r0), int(r1))
        A, B = R_cmp[sl], mm[sl]
        if True:
            # compare the torso only (arms differ in pose): columns within the model's torso silhouette span +-3 cm
            cols = np.where(B.any(0))[0]
            c0, c1 = cols.min() - 15, cols.max() + 15
            A = A[:, c0:c1]; B = B[:, c0:c1]
        res[g] = round(iou(A, B), 3)
    res['all_no_arms'] = round(iou(R_cmp[int(Z(1.45)):], mm[int(Z(1.45)):]), 3)  # (no column limit: includes the ref cape)
    report[name] = res
    # sheet: reference | model classes | overlay outlines | difference
    edgeR = R ^ (np.asarray(Image.fromarray((R * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 127)
    edgeM = mm ^ (np.asarray(Image.fromarray((mm * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 127)
    ov = RI.copy()
    ov[edgeR] = (255, 40, 40); ov[edgeM] = (40, 220, 40)
    diff = np.full((H, W, 3), 245, np.uint8)
    diff[R_cmp & mm] = (150, 150, 150); diff[R_cmp & ~mm] = (230, 60, 60); diff[~R_cmp & mm] = (40, 170, 60)
    diff[arm] = (215, 235, 215); diff[hm & ~mm] = (230, 230, 120)
    mod = a.astype(np.uint8).copy(); mod[a.sum(2) <= 30] = (230, 230, 230)
    sheet = Image.new('RGB', (W * 4, H + 70), (250, 250, 250))
    for k, im in enumerate((RI, mod, ov, diff)):
        sheet.paste(Image.fromarray(im), (k * W, 70))
    d = ImageDraw.Draw(sheet)
    d.text((10, 8), 'turnaround (scaled belt->sole)   |   model classes   |   outlines: red = turnaround, green = model   |   difference: red = only turnaround, green = only model, pale green = arms, yellow = hair (excluded)', fill=(0, 0, 0))
    d.text((10, 32), name.upper() + '  IoU: ' + '   '.join('%s %.2f' % kv for kv in res.items()), fill=(0, 0, 0))
    for g, (r0, r1) in groups.items():
        for k in range(4): d.line([(k * W, 70 + int(r0)), (k * W + W, 70 + int(r0))], fill=(120, 120, 255))
    sheet.save(os.path.join(OD, 'surtaysha_sovut_moslash_%s.png' % name))
    print(name, res)
json.dump(report, open(os.path.join(MD, 'iou.json'), 'w'), indent=1)
