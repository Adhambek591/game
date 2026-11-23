# Arm landmarks from slices (see fitlib.py for the shared helpers).
import numpy as np
from fitlib import *

def arm_centres(P, sh, step=0.006):
    """Slices of the free arm by distance from the shoulder joint (spherical shells cut a bent arm almost
    square to its axis in any pose): arrays r, centre(n,3), girth (2 x RMS radius about the centre)."""
    d = P - sh; r = np.linalg.norm(d, axis=1)
    rs, cs, gs = [], [], []
    for r0 in np.arange(max(r.min(), 0.10), r.max(), step):
        m = (r >= r0) & (r < r0 + step)
        if m.sum() < 20: continue
        c = P[m].mean(0); u = unit(c - sh); q = P[m] - c; q = q - np.outer(q @ u, u)
        rs.append(r0 + step / 2); cs.append(c); gs.append(2 * np.sqrt((q ** 2).sum(1).mean()))
    return np.array(rs), np.array(cs), np.array(gs)

def path_point(cs, sh, wrist, last, ratio):
    """Index of the centre-line point (1..last-1) that splits shoulder -> point -> wrist at ratio."""
    best = None
    for i in range(1, last):
        a = np.linalg.norm(cs[i] - sh); b = np.linalg.norm(wrist - cs[i])
        e = abs(a / (a + b) - ratio)
        if best is None or e < best[0]: best = (e, i)
    return best[1]

def arm_analysis(C, L, side, shoulder, ratio, wrist_along=0.0):
    """Mesh-only arm landmarks from slices, given the shoulder joint and the upper/(upper+fore) length ratio.
    wrist = narrowest forearm slice (perpendicular to the forearm) moved wrist_along * forearm length toward
    the hand; elbow = centre-line point at the length ratio, and separately the kink of the centre line.
    Returns dict with wrist, wrist_raw, elbow_ratio, elbow_kink, kink, hand_dir, palm_n, hand_side."""
    idx = arm_points(C, L, side); P = C[idx]
    zs, cs, gs = arm_centres(P, shoulder)
    rel = zs / zs[-1]                       # distance from the shoulder / distance of the finger tips
    m = np.where((rel > 0.58) & (rel < 0.84))[0]
    iw = m[np.argmin(gs[m])]
    ie = path_point(cs, shoulder, cs[iw], iw, ratio)
    for _ in range(2):          # refine the wrist with slices perpendicular to the forearm
        f = unit(cs[iw] - cs[ie])
        t, cl, g = centreline(P, f, step=0.004)
        near = np.where(np.linalg.norm(cl - cs[iw], axis=1) < 0.05)[0]
        j = near[np.argmin(g[near])]
        wrist_raw = cl[j]
        iw = int(np.argmin(np.linalg.norm(cs - wrist_raw, axis=1)))
        ie = path_point(cs, shoulder, wrist_raw, iw, ratio)
    f = unit(wrist_raw - cs[ie])
    wrist = wrist_raw + f * wrist_along * np.linalg.norm(wrist_raw - cs[ie])
    elbow_ratio = cs[path_point(cs, shoulder, wrist, iw, ratio)]
    # kink of the centre line between the armpit and the wrist (two straight pieces)
    ca = cs[2:iw + 1]; kb = None
    for k in range(3, len(ca) - 3):
        c1, d1 = fit_line(ca[:k + 1]); c2, d2 = fit_line(ca[k:])
        r1 = ca[:k + 1] - c1; r2 = ca[k:] - c2
        e = (np.linalg.norm(r1 - np.outer(r1 @ d1, d1), axis=1) ** 2).sum() + (np.linalg.norm(r2 - np.outer(r2 @ d2, d2), axis=1) ** 2).sum()
        if kb is None or e < kb[0]:
            if d1[2] > 0: d1 = -d1
            if d2[2] > 0: d2 = -d2
            kb = (e, k, d1, d2)
    kink = between(kb[2], kb[3]); elbow_kink = ca[kb[1]]
    # hand: everything beyond the wrist along the forearm
    hand = P[(P - wrist) @ f > 0.0]
    hc = hand.mean(0)
    _, _, vt = np.linalg.svd(hand - hc)
    hdir = vt[0] if vt[0] @ (hc - wrist) > 0 else -vt[0]
    return dict(wrist=wrist, wrist_raw=wrist_raw, elbow_ratio=elbow_ratio, elbow_kink=elbow_kink, kink=float(kink),
                hand_dir=hdir, palm_n=vt[2], hand_side=vt[1], hand_c=hc, hand_len=float(((hand - wrist) @ hdir).max()),
                fore_width=float(gs[max(ie, 0):iw + 1].max()), upper_width=float(gs[:max(ie, 1)].max()))
