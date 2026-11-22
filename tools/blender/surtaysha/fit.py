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
        self.sl = {}
        for i in range(95, 160):
            z = round(i * 0.01, 2)
            t = [p for p in self.V if abs(p.z - z) < 0.006 and abs(p.x) < 0.34 and all(segd(p, a, b) > 0.085 or abs(p.x) < 0.12 for a, b in arms)]
            if t: self.sl[z] = (max(abs(p.x) for p in t), -min(p.y for p in t), max(p.y for p in t))
        # head offset (helmet / aventail follow the head bone)
        self.head_d = B('head') - Vector(V1['head']['head'])
        # foot: map v1 boot y values onto the new foot (heel->ball length ratio)
        f0, b0 = Vector(V1['foot_l']['head']), Vector(V1['ball_l']['head'])
        f1, b1 = B('foot_l'), B('ball_l')
        self.foot_y0, self.foot_y1 = f0.y, f1.y
        self.foot_sy = (f1.y - b1.y) / (f0.y - b0.y)
        # leg cross sections (left leg) for the boot shaft / greave
        self.leg = {}
        for i in range(10, 56):
            z = round(i * 0.01, 2)
            t = [p for p in self.V if abs(p.z - z) < 0.006 and p.x > 0.02]
            if len(t) > 8:
                xs = [p.x for p in t]; ys = [p.y for p in t]
                self.leg[z] = ((min(xs) + max(xs)) / 2, (max(xs) - min(xs)) / 2, min(ys), max(ys))

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
