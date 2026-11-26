# Refit of the hand-tuned (v1) armour tables to the body currently in out/proxy.blend.
# v1 tables were designed around the first proxy (landmarks_v1.json / ref_slices_v1.json); here we measure
# the loaded body the same way and turn the differences into offsets, so clearances stay as designed.
import json, math, os
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
V1 = json.load(open(os.path.join(HERE, 'ref_landmarks_v1.json')))['bones']
REF = {float(k): v for k, v in json.load(open(os.path.join(HERE, 'ref_slices_v1.json'))).items()}

class Fit:
    def __init__(self, body, bones):
        self.L = bones
        self.V = [body.matrix_world @ v.co for v in body.data.vertices]
        B = lambda n: Vector(bones[n]['head'])
        def segd(p, a, b):
            d = b - a; t = max(0, min(1, (p - a).dot(d) / d.length_squared)); return (p - (a + d * t)).length
        arms = [(B('upperarm_' + s), B('lowerarm_' + s)) for s in 'lr'] + [(B('lowerarm_' + s), B('hand_' + s)) for s in 'lr']
        # torso-only vertices: drop everything skinned mostly to the arms / hands (the old distance-to-arm-axis test let
        # this body's very thick arms into the torso slices: half-width 0.35 at the waist, a cuirass like a saucer)
        gname = {g.index: g.name for g in body.vertex_groups}
        ARMK = ('upperarm', 'lowerarm', 'hand_', 'thumb', 'index', 'middle', 'ring', 'pinky', 'wrist')
        self.T = []
        for v in body.data.vertices:
            aw = sum(g.weight for g in v.groups if any(k in gname.get(g.group, '') for k in ARMK))
            if aw < 0.35: self.T.append(body.matrix_world @ v.co)
        print('FIT torso verts %d of %d (vertex groups %d)' % (len(self.T), len(self.V), len(gname)))
        self.sl = {}; self.sp = {}
        for i in range(50, 166):
            z = round(i * 0.01, 2)
            xl = 0.34 if z < 1.22 else B('upperarm_l').x - 0.005      # above the armpit the torso is never wider than the shoulder joints
            t = [p for p in self.T if abs(p.z - z) < 0.006 and abs(p.x) < 0.40] if len(self.T) > 1000 else [p for p in self.V if abs(p.z - z) < 0.006 and abs(p.x) < xl and all(segd(p, a, b) > 0.115 or abs(p.x) < 0.12 for a, b in arms)]
            if t: self.sl[z] = (max(abs(p.x) for p in t), -min(p.y for p in t), max(p.y for p in t))
            if t: self.sp[z] = [(p.x, p.y) for p in t]
        # head offset (helmet / aventail follow the head bone)
        self.head_d = B('head') - Vector(V1['head']['head'])
        # head size (helmet / aventail scale): half-width of the skull 9 cm above the head bone, vs the MHBody it was designed on
        hb = B('head'); hz = hb.z + 0.09
        hv = [p for p in self.V if abs(p.z - hz) < 0.006 and abs(p.x) < 0.2 and abs(p.y - hb.y) < 0.2]
        self.head_hx = max(abs(p.x) for p in hv) if hv else 0.0860
        self.head_scale = self.head_hx / 0.0860
        # foot: map v1 boot y values onto the new foot (heel->ball length ratio)
        f0, b0 = Vector(V1['foot_l']['head']), Vector(V1['ball_l']['head'])
        f1, b1 = B('foot_l'), B('ball_l')
        self.foot_y0, self.foot_y1 = f0.y, f1.y
        self.foot_sy = (f1.y - b1.y) / (f0.y - b0.y)
        # leg cross sections (left leg) for the boot shaft / greave
        self.leg = {}
        for i in range(0, 56):
            z = round(i * 0.01 + 0.004, 3)
            t = [p for p in self.V if abs(p.z - z) < 0.006 and p.x > 0.02]
            if len(t) > 8:
                xs = [p.x for p in t]; ys = [p.y for p in t]
                self.leg[round(z, 2)] = ((min(xs) + max(xs)) / 2, (max(xs) - min(xs)) / 2, min(ys), max(ys), min(xs), max(xs))
        # upper-arm radius (for pauldron / sleeve sizing)
        a, b = B('upperarm_l'), B('lowerarm_l'); d = (b - a).normalized(); c = a.lerp(b, 0.45)
        rr = [((p - c) - d * (p - c).dot(d)).length for p in self.V if abs((p - c).dot(d)) < 0.006 and ((p - c) - d * (p - c).dot(d)).length < 0.13]
        self.r_upperarm = sum(rr) / len(rr) if rr else 0.065

    def torso_delta(self, z, lo=-0.012, hi=0.06):
        """(dx, dfront, dback) of the loaded body vs the v1 proxy at height z (clamped)"""
        zz = min(max(round(z, 2), 0.98), 1.52)
        zs = sorted(k for k in self.sl if k in REF)
        k = min(zs, key=lambda q: abs(q - zz))
        nx, nf, nb = self.sl[k]; r = REF[k]
        cl = lambda d: min(max(d, lo), hi)
        return cl(nx - r['xmax']), cl(nf + r['ymin']), cl(nb - r['ymax'])

    def fit_table(self, tab, scale=1.0):
        out = []
        for row in tab:
            z = row[0]; dx, df, db = self.torso_delta(z)
            out.append((z, row[1] + dx * scale, row[2] + df * scale, row[3] + db * scale) + tuple(row[4:]))
        return out

    def boot_y(self, y):
        return self.foot_y1 + (y - self.foot_y0) * self.foot_sy

    def leg_at(self, z):
        ks = sorted(self.leg)
        k = min(ks, key=lambda q: abs(q - z))
        return self.leg[k]

    def cover(self, tab, clear):
        """grow table rows so the surface clears the body slice at that height by `clear` (never shrinks)"""
        out = []
        for row in tab:
            z = round(min(max(row[0], 0.95), 1.65), 2)
            k = min(self.sl, key=lambda q: abs(q - z))
            nx, nf, nb = self.sl[k]
            out.append((row[0], max(row[1], nx + clear), max(row[2], nf + clear), max(row[3], nb + clear)) + tuple(row[4:]))
        return out

    def body_at(self, z):
        k = min(self.sl, key=lambda q: abs(q - round(z, 2)))
        return self.sl[k]

    def hug(self, tab, clear, dense=0.03):
        """rows sized from the body slice at that height + clearance, a row every `dense` m, and every row is checked to
        contain the whole body slice (a wide flat back or big lats stand outside an oval sized by the extremes only):
        the section is squared up first (exponent up to 4), then enlarged"""
        zs = sorted(set([r[0] for r in tab] + [round(tab[0][0] + dense * k, 3) for k in range(1, int((tab[-1][0] - tab[0][0]) / dense))]))
        def n_at(z):
            for r0, r1 in zip(tab, tab[1:]):
                if r0[0] <= z <= r1[0]:
                    t = (z - r0[0]) / max(1e-6, r1[0] - r0[0]); return tuple(r0[k] + (r1[k] - r0[k]) * t for k in range(4, len(r0)))
            return tuple(tab[-1][4:])
        out = []
        for z in zs:
            zz = round(min(max(z, 0.55), 1.65), 2); nx, nf, nb = self.body_at(zz); rest = list(n_at(z)); n = rest[0] if rest else 2.5
            k_ = min(self.sp, key=lambda q: abs(q - zz)) if self.sp else None; pts = self.sp.get(k_, []) if k_ is not None else []
            def worst(n_):
                return max(((abs(x) / nx) ** n_ + (abs(y) / (nf if y < 0 else nb)) ** n_) ** (1.0 / n_) for x, y in pts) if pts else 1.0
            m = worst(n)
            while m > 1.004 and n < 4.0: n = min(4.0, n + 0.25); m = worst(n)
            m = max(1.0, m)
            if rest: rest[0] = n
            out.append([z, nx * m + clear, nf * m + clear, nb * m + clear] + list(rest))
        # a smooth shell: the rows must not jump from one height to the next (plate rows would stand in steps), so the
        # sizes are smoothed along the height, never going under 4 mm less than what the body needs at that row
        need = [r[:] for r in out]
        for _ in range(4):
            sm = [r[:] for r in out]
            for i in range(len(out)):
                lo, hi = max(0, i - 2), min(len(out), i + 3)
                for k in range(1, len(out[i])): sm[i][k] = sum(out[j][k] for j in range(lo, hi)) / (hi - lo)
            out = sm
        for i in range(len(out)):
            for k in (1, 2, 3): out[i][k] = max(out[i][k], need[i][k] - 0.004)
        for _ in range(2):
            sm = [r[:] for r in out]
            for i in range(1, len(out) - 1):
                for k in range(1, len(out[i])): sm[i][k] = max(out[i][k], (out[i - 1][k] + out[i][k] + out[i + 1][k]) / 3) if k < 4 else (out[i - 1][k] + out[i][k] + out[i + 1][k]) / 3
            out = sm
        return [tuple(r) for r in out]
