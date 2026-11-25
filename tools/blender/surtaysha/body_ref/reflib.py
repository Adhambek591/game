# Side-view front profile of the approved Guloyim turnaround (third figure, facing left) and its registration
# to the model: figure mask against the grey backdrop, leftmost figure pixel per row = front profile.
import bpy, os, numpy as np

REF = r"F:\qirq-qiz\tools\blender\char\ref\guloyim_body_turn.png"
COLS = (700, 880)            # column range of the side-view figure in the 1376 px wide sheet

def load_ref():
    im = bpy.data.images.load(REF)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3].copy()      # row 0 = top
    bpy.data.images.remove(im)
    return a

def ref_profile(a):
    """per image row: column of the front-most (left-most) figure pixel in the side view, or -1."""
    sub = a[:, COLS[0]:COLS[1]]
    bg = np.median(sub[:, :6].reshape(-1, 3), axis=0)            # backdrop colour beside the figure
    rowbg = np.median(sub[:, :6], axis=1)                        # per row (the backdrop has a soft gradient)
    d = np.abs(sub - rowbg[:, None, :]).max(axis=2)
    m = d > 0.07
    # drop isolated specks: a figure pixel must start a run of at least 4
    run = m & np.roll(m, -1, 1) & np.roll(m, -2, 1) & np.roll(m, -3, 1)
    col = np.where(run.any(1), run.argmax(1) + COLS[0], -1)
    return col.astype(float), m

def model_profile(P, zs, xmax=0.165, tol=0.004):
    """front-most y of the torso / legs (arms left out by |x| < xmax) at each height."""
    o = np.argsort(P[:, 2]); Z = P[o, 2]; Y = P[o, 1]; X = P[o, 0]
    out = np.full(len(zs), np.nan)
    for i, z in enumerate(zs):
        a, b = np.searchsorted(Z, z - tol), np.searchsorted(Z, z + tol)
        k = np.abs(X[a:b]) < xmax
        if k.any(): out[i] = Y[a:b][k].min()
    return out

def register(col, P, zr=((0.40, 0.68), (0.93, 1.13)), height=None):
    """scale (px/m), floor row and x0 so that  column = x0 + y * scale,  row = floor - z * scale,
    fitted on parts of the front profile that are real body in both (thigh, belly)."""
    best = None
    zs = np.concatenate([np.arange(a, b, 0.005) for a, b in zr])
    ym = model_profile(P, zs)
    top = np.where(col > 0)[0][0]                          # top of the hair
    for sc in np.arange(380, 440, 1.0):
        for fl in np.arange(735, 765, 1.0):
            # the figure is as tall as the model (hair lies ~1 cm on the skull): ties scale and floor together
            if height is not None and abs((fl - top) / sc - (height + 0.01)) > 0.006: continue
            rows = np.round(fl - zs * sc).astype(int)
            c = col[rows]
            ok = (c > 0) & ~np.isnan(ym)
            if ok.sum() < 0.8 * len(zs): continue
            x0 = np.median(c[ok] - ym[ok] * sc)
            e = np.abs(c[ok] - (x0 + ym[ok] * sc)).mean()
            if best is None or e < best[0]: best = (e, sc, fl, x0)
    return best
