# geometry of every piece (imported by build.py)
import math, random
from mathutils import Vector, Matrix
from sk import *

def edge_strip(mb, pts, nrm_fn, outward_fn, prof=None, closed=False, mat=0):
    """leather edging along a boundary polyline: nrm_fn(p) = surface normal, outward_fn(i) = in-surface direction pointing away from the panel"""
    prof = prof or edging_profile()
    ups = [nrm_fn(p) for p in pts]
    # sweep's 'side' = t x up ; we need side == outward. flip path direction if needed
    t = (pts[1] - pts[0]).normalized()
    side = t.cross(ups[0])
    if side.dot(outward_fn(0)) < 0:
        pts = pts[::-1]; ups = ups[::-1]
    return sweep(mb, pts, ups, prof, closed=closed, uv_v=TRIM['edge'], u_scale=TRIM_U, mat=mat)

def strap(mb, pts, ups, w=0.04, t=0.005, key='strap', closed=False, mat=0, bevel=0.0015):
    return sweep(mb, pts, ups, rect_profile(w, t, bevel), closed=closed, uv_v=TRIM[key], u_scale=TRIM_U, mat=mat)

def rivet_line(mb, pts, ups, every=0.06, offset=0.0, side_vecs=None, lift=0.0, r=0.0045, rng=None, mat=0):
    L = 0.0; nxt = every * 0.5
    for i in range(1, len(pts)):
        seg = (pts[i] - pts[i - 1]).length
        while L + seg >= nxt:
            t = (nxt - L) / seg
            p = pts[i - 1].lerp(pts[i], t)
            up = ups[i - 1].lerp(ups[i], t).normalized()
            if side_vecs:
                p = p + side_vecs[i].normalized() * offset
            u = (rng.random() * 0.9 + 0.05) if rng else 0.5
            rivet(mb, p + up * lift, up, r=r, uvc=(u, 0.80 + (rng.random() * 0.15 if rng else 0.07)), uvr=0.011, mat=mat)
            nxt += every
        L += seg
