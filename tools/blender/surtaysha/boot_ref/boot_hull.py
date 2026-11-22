# Boot shape from the reference silhouettes (numpy only: runs in Blender's python and in system python).
#
# The boot is the visual hull of the two reference masks with rounded sections:
#   - side mask  -> smooth field S(y, z): where the boot is in profile (local y: toe = -y, heel = +y)
#   - front mask -> x extent of every height (world X about the shaft axis)
# Sections are superellipses whose long axis is the chord of a section line through the side silhouette and whose
# lateral half-width comes from the front mask. Section lines: horizontal for the shaft, a fan about a pivot in
# front of the instep crease for the ankle/heel (these become the ankle edge loops), vertical for the fore foot.
# Local frame: origin on the ground under the shaft axis; world = Rz(toe-out) * local + origin.
import os, math
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))

def smooth01(t):
    t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)

class Hull:
    EMBED = 0.012          # the upper carries on this far below the feather line, inside the sole
    N_SHAFT, N_FOOT_TOP, N_FOOT_BOT, K_FOOT = 2.25, 1.8, 3.4, 0.66
    SKIN = 0.0060          # the grey panel lies on the shaft: the leather under it is this much inside the silhouette

    def __init__(self, theta=math.radians(14.0), a_ball=0.103, cx_foot=0.012, path=None):
        d = np.load(path or os.path.join(HERE, 'boot_profile.npz'))
        self.F = d['side_field']; self.fy0, self.fz0, self.fs = [float(v) for v in d['side_meta']]
        self.front = d['front']; self.feather = d['feather']
        self._spx = [float(v) for v in d['side_px']]; self._fpx = [float(v) for v in d['front_px']]
        self.theta = theta; self.a_ball = a_ball; self.cx_foot = cx_foot
        # the reference side view shows the toed-out boot foreshortened: its true length is 1/cos longer
        self.ky = 1.0 / math.cos(theta)
        self.z_top = 0.450 - 0.0015; self.z_ground = -0.040
        self.P = self.side_px(873.0, 684.0)             # fan pivot, in front of / above the instep crease
        self._cache = {}
        self._zb = None
        # extents of the upper in profile
        ys = np.arange(self.fy0 * self.ky, (self.fy0 + self.fs * self.F.shape[1]) * self.ky, 0.001)
        zs = np.arange(self.z_ground, 0.46, 0.001)
        Y, Z = np.meshgrid(ys, zs)
        g = self.g(Y, Z) > 0
        sfull = self.S(Y, Z) > 0.5
        cf = sfull.any(axis=0)
        self.y_toe_sole = float(ys[cf][0]); self.y_heel_sole = float(ys[cf][-1])
        # underside of the sole per column (the upper never comes closer than 6 mm to it)
        zb = np.where(cf, zs[np.argmax(sfull, axis=0)], 0.5)
        self._zb = (ys, zb)
        g = self.g(Y, Z) > 0
        cols = g.any(axis=0)
        self.y_toe = float(ys[cols][0]); self.y_heel = float(ys[cols][-1])

    # ---------------------------------------------------------------- reference coordinates
    def side_px(self, x, y):
        """turn-sheet pixel (side view) -> local (y, z)"""
        ax, gy, s, zg = self._spx
        return ((x - ax) * s * self.ky, (gy - y) * s + zg)

    def S(self, y, z):
        c = (np.asarray(y, float) / self.ky - self.fy0) / self.fs; r = (self.fz0 - np.asarray(z, float)) / self.fs
        h, w = self.F.shape
        ok = (c >= 0) & (c <= w - 1.001) & (r >= 0) & (r <= h - 1.001)
        c = np.clip(c, 0, w - 1.001); r = np.clip(r, 0, h - 1.001)
        c0 = c.astype(int); r0 = r.astype(int); fc = c - c0; fr = r - r0
        F = self.F
        v = (F[r0, c0] * (1 - fc) + F[r0, c0 + 1] * fc) * (1 - fr) + (F[r0 + 1, c0] * (1 - fc) + F[r0 + 1, c0 + 1] * fc) * fr
        return np.where(ok, v, 0.0)

    def z_feather(self, y):
        return np.interp(np.asarray(y, float) / self.ky, self.feather[:, 0], self.feather[:, 1])

    def g(self, y, z):
        """> 0 inside the upper's profile (side silhouette above the feather line, carried EMBED into the sole)"""
        y = np.asarray(y, float); z = np.asarray(z, float)
        emb = self.EMBED
        if self._zb is not None:
            # at the toe and heel ends the upper stops on the feather line (it must not come out through the sole's edge)
            emb = self.EMBED * np.clip(np.minimum(y - (self.y_toe_sole + 0.010), (self.y_heel_sole - 0.010) - y) / 0.035, 0.0, 1.0)
        lo = self.z_feather(y) - emb
        if self._zb is not None: lo = np.maximum(lo, np.interp(y, self._zb[0], self._zb[1]) + 0.006)
        return np.minimum(self.S(y, z) - 0.5, (z - lo) * 25.0)

    def chord(self, O, d, fn=None, tmax=0.80, step=0.001):
        """first run of fn > 0 along O + t d: (t0, t1) or None"""
        fn = fn or self.g
        t = np.arange(0.0, tmax, step)
        v = fn(O[0] + t * d[0], O[1] + t * d[1]) > 0
        if not v.any(): return None
        # longest run of inside samples
        e = np.diff(np.concatenate([[0], v.astype(np.int8), [0]]))
        st = np.nonzero(e == 1)[0]; en = np.nonzero(e == -1)[0]
        k = int(np.argmax(en - st)); i0 = int(st[k]); i1 = min(int(en[k]), len(v) - 1)
        def bis(a, b):          # fn(a) <= 0 < fn(b) or the reverse
            fa = fn(O[0] + a * d[0], O[1] + a * d[1]) > 0
            for _ in range(18):
                m = (a + b) / 2
                if (fn(O[0] + m * d[0], O[1] + m * d[1]) > 0) == fa: a = m
                else: b = m
            return (a + b) / 2
        t0 = bis(t[i0 - 1], t[i0]) if i0 > 0 else 0.0
        t1 = bis(t[i1 - 1], t[i1])
        return t0, t1

    # ---------------------------------------------------------------- lateral size of the sections
    def front_x(self, z):
        return float(np.interp(z, self.front[:, 0], self.front[:, 1])), float(np.interp(z, self.front[:, 0], self.front[:, 2]))

    def a_foot(self, y):
        """plan half-width of the fore foot: widest at the ball, big blunt rounded toe"""
        s = (self.y_heel - y) / (self.y_heel - self.y_toe)
        sb = 0.60
        if s <= sb: return self.a_ball * (1 - 0.05 * ((sb - s) / 0.2) ** 2)
        u = min(1.0, (s - sb) / (1.0 - sb + 0.004))
        return self.a_ball * (1 - u ** 2.0) ** (1 / 2.0)

    # ---------------------------------------------------------------- sections
    def sec_shaft(self, z):
        k = ('s', round(z, 5))
        if k in self._cache: return self._cache[k]
        O = (self.fy0 * self.ky, z); d = (1.0, 0.0)
        c = self.chord(O, d)
        c = (c[0] + self.SKIN, c[1])
        xi, xo = self.front_x(z); xi += self.SKIN; xo -= self.SKIN
        b = (c[1] - c[0]) / 2; cy = O[0] + (c[0] + c[1]) / 2
        half = (xo - xi) / 2; st, ct = math.sin(self.theta), math.cos(self.theta)
        a = math.sqrt(max(half * half - (b * st) ** 2, (0.7 * half) ** 2)) / ct
        cx = ((xi + xo) / 2 + cy * st) / ct
        r = dict(O=O, d=d, c0=c[0], c1=c[1], w=a, cx=cx, n0=self.N_SHAFT, n1=self.N_SHAFT, k=0.5)
        self._cache[k] = r; return r

    def sec_foot(self, y):
        k = ('f', round(y, 5))
        if k in self._cache: return self._cache[k]
        O = (y, self.P[1] + 0.03); d = (0.0, -1.0)
        c = self.chord(O, d)
        r = dict(O=O, d=d, c0=c[0], c1=c[1], w=self.a_foot(y), cx=self.cx_foot, n0=self.N_FOOT_TOP, n1=self.N_FOOT_BOT, k=self.K_FOOT)
        self._cache[k] = r; return r

    def sec_fan(self, phi):
        k = ('a', round(phi, 5))
        if k in self._cache: return self._cache[k]
        O = self.P; d = (math.cos(phi), -math.sin(phi))
        c = self.chord(O, d)
        A = self.sec_shaft(self.P[1]); B = self.sec_foot(self.P[0])
        t = smooth01(phi / (math.pi / 2))
        L = lambda q: A[q] + (B[q] - A[q]) * t
        # the heel is a little narrower than both the ankle of the shaft and the ball
        w = L('w') * (1 - 0.06 * math.sin(math.pi * phi / (math.pi / 2)) ** 2)
        c = (c[0] + self.SKIN * (1 - smooth01(phi / (math.pi / 2) * 1.6)), c[1])      # the panel's allowance fades out over the instep
        r = dict(O=O, d=d, c0=c[0], c1=c[1], w=w, cx=L('cx'), n0=L('n0'), n1=A['n1'] + (B['n1'] - A['n1']) * smooth01((phi / (math.pi / 2) - 0.45) / 0.55), k=L('k'))
        self._cache[k] = r; return r

    @staticmethod
    def sec_point(s, psi):
        """psi 0 = near end of the chord (front of the shaft / top of the foot), pi/2 = +x (outer side), pi = far end"""
        cm = s['c0'] + s['k'] * (s['c1'] - s['c0'])
        cs, sn = math.cos(psi), math.sin(psi)
        if cs >= 0:
            n = s['n0']; c = cm - (cm - s['c0']) * abs(cs) ** (2 / n)
        else:
            n = s['n1']; c = cm + (s['c1'] - cm) * abs(cs) ** (2 / n)
        x = s['cx'] + s['w'] * math.copysign(abs(sn) ** (2 / n), sn)
        return np.array((x, s['O'][0] + c * s['d'][0], s['O'][1] + c * s['d'][1]))

    def ring(self, s, N, start=math.pi):
        """N points round the section, evenly spaced by arc length on each half, starting at the far end (seam)"""
        M = 96
        dense = [self.sec_point(s, start + 2 * math.pi * i / M) for i in range(M + 1)]
        out = []
        for h in range(2):
            seg = np.array(dense[h * M // 2: h * M // 2 + M // 2 + 1])
            L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(seg, axis=0), axis=1))])
            for i in range(N // 2):
                out.append(np.array([np.interp(L[-1] * i / (N // 2), L, seg[:, k]) for k in range(3)]))
        return out

    # ---------------------------------------------------------------- implicit surface (any point)
    def section_at(self, y, z):
        if z >= self.P[1]: s = self.sec_shaft(round(min(z, self.z_top), 4)); c = y - s['O'][0]
        elif y <= self.P[0]: s = self.sec_foot(round(max(y, self.y_toe + 0.0005), 4)); c = s['O'][1] - z
        else:
            phi = math.atan2(self.P[1] - z, y - self.P[0])
            s = self.sec_fan(round(phi, 3)); c = math.hypot(y - self.P[0], z - self.P[1])
        return s, c

    def inside(self, x, y, z):
        if z > self.z_top or y < self.y_toe or z < self.z_ground - 0.05: return False
        s, c = self.section_at(y, z)
        if not (s['c0'] < c < s['c1']): return False
        cm = s['c0'] + s['k'] * (s['c1'] - s['c0'])
        if c < cm: n = s['n0']; u = (cm - c) / (cm - s['c0'])
        else: n = s['n1']; u = (c - cm) / (s['c1'] - cm)
        return u ** n + (abs(x - s['cx']) / s['w']) ** n < 1.0

    def half_width(self, y, z):
        """(cx, w): the surface is at x = cx +- w at this profile point (w = 0 outside)"""
        if z > self.z_top or y < self.y_toe: return 0.0, 0.0
        s, c = self.section_at(y, z)
        if not (s['c0'] < c < s['c1']): return s['cx'], 0.0
        cm = s['c0'] + s['k'] * (s['c1'] - s['c0'])
        if c < cm: n = s['n0']; u = (cm - c) / (cm - s['c0'])
        else: n = s['n1']; u = (c - cm) / (s['c1'] - cm)
        return s['cx'], s['w'] * max(0.0, 1 - u ** n) ** (1 / n)

    def ray(self, o, d, t0=0.0, t1=0.5, step=0.002, enter=False):
        """surface point along o + t d, starting inside (enter=False) or outside (enter=True)"""
        o = np.asarray(o, float); d = np.asarray(d, float)
        t = t0; prev = t0
        while t <= t1:
            p = o + d * t
            if self.inside(p[0], p[1], p[2]) == enter:
                a, b = prev, t
                for _ in range(16):
                    m = (a + b) / 2; q = o + d * m
                    if self.inside(q[0], q[1], q[2]) == enter: b = m
                    else: a = m
                return o + d * (a + b) / 2
            prev = t; t += step
        return None

    def normal(self, p, e=0.003):
        """outward normal from the implicit surface (central differences of occupancy on a small stencil)"""
        p = np.asarray(p, float); n = np.zeros(3)
        dirs = []
        for i in range(-1, 2):
            for j in range(-1, 2):
                for k in range(-1, 2):
                    if i or j or k: dirs.append(np.array((i, j, k), float))
        for d in dirs:
            for r in (e, 2 * e):
                q = p + d / np.linalg.norm(d) * r
                if not self.inside(q[0], q[1], q[2]): n += d / np.linalg.norm(d)
        L = np.linalg.norm(n)
        return n / L if L > 1e-9 else np.array((0.0, 0.0, 1.0))

    # ---------------------------------------------------------------- quad retopology of the upper
    def upper_rings(self, N=40, n_shaft=14, n_fan=8, foot_f=(0.0, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.76, 0.85, 0.92, 0.965), smooth=1):
        """rings from the cuff down the shaft, round the ankle (fan = ankle edge loops) and along the foot"""
        secs = []
        for i in range(n_shaft):
            secs.append(self.sec_shaft(self.z_top + (self.P[1] - self.z_top) * i / n_shaft))
        for i in range(n_fan):
            secs.append(self.sec_fan(math.pi / 2 * i / n_fan))
        for f in foot_f:
            secs.append(self.sec_foot(self.P[0] + (self.y_toe - self.P[0]) * f))
        rings = [self.ring(s, N) for s in secs]
        # light smoothing along the boot so the three section families blend without a kink
        R = np.array(rings)
        for _ in range(smooth):
            Q = R.copy()
            Q[1:-1] = R[1:-1] * 0.7 + (R[:-2] + R[2:]) * 0.15
            Q[n_shaft + n_fan + len(foot_f) - 3:] = R[n_shaft + n_fan + len(foot_f) - 3:]      # keep the toe rings
            Q[:2] = R[:2]
            R = Q
        return R

    @staticmethod
    def coons(ring):
        """all-quad fill of a closed ring of N = 4q points (ring[0] = middle of the first side): (q+1) x (q+1) grid"""
        R = np.asarray(ring, float); N = len(R); q = N // 4; o = q // 2
        idx = lambda i: R[(i + o) % N]
        bot = [idx(-k) for k in range(0, q + 1)]
        A = [idx(k) for k in range(0, q + 1)]
        top = [idx(q + k) for k in range(0, q + 1)]
        Bs = [idx(N - q - k) for k in range(0, q + 1)]
        G = [[None] * (q + 1) for _ in range(q + 1)]
        for j in range(q + 1):
            for i in range(q + 1):
                u, v = i / q, j / q
                G[j][i] = (1 - v) * bot[i] + v * top[i] + (1 - u) * A[j] + u * Bs[j] - ((1 - u) * (1 - v) * bot[0] + u * (1 - v) * bot[q] + (1 - u) * v * top[0] + u * v * top[q])
        return G

    def toe_cap(self, last_ring):
        """all-quad cap closing the toe: Coons patch of the last ring pushed forward onto the surface"""
        G = self.coons(last_ring); q = len(G) - 1
        y0 = float(np.asarray(last_ring)[:, 1].mean())
        for j in range(1, q):
            for i in range(1, q):
                p = G[j][i]
                hit = self.ray((p[0], y0 + 0.0002, p[2]), (0, -1, 0), 0.0, y0 - self.y_toe + 0.01, 0.0005)
                if hit is not None: G[j][i] = hit
        for _ in range(3):          # relax the dome (no pinch where the toe meets the welt)
            Q = [[p.copy() for p in row] for row in G]
            for j in range(1, q):
                for i in range(1, q):
                    Q[j][i] = G[j][i] * 0.5 + (G[j - 1][i] + G[j + 1][i] + G[j][i - 1] + G[j][i + 1]) * 0.125
            G = Q
        return G

    # ---------------------------------------------------------------- sole (welt + outsole + heel lift)
    def footprint(self, K=120):
        """outline of the upper where it meets the sole, counter-clockwise from the toe: list of (x, y)"""
        ys = np.linspace(self.y_toe + 0.0015, self.y_heel - 0.0015, K)
        o, i = [], []
        for y in ys:
            cx, w = self.half_width(y, self.z_feather(y) + 0.002)
            o.append((cx + w, y)); i.append((cx - w, y))
        return o + i[::-1]

    def z_bottom(self, y):
        """underside of the sole from the side mask (toe spring, heel lift)"""
        y = min(max(y, self.y_toe_sole + 0.012), self.y_heel_sole - 0.008)      # the rounded ends of the profile are not the underside
        c = self.chord((y, self.z_ground - 0.02), (0.0, 1.0), fn=lambda a, b: self.S(a, b) - 0.5, tmax=0.2, step=0.0005)
        return self.z_ground - 0.02 + c[0] if c else self.z_ground

    # ---------------------------------------------------------------- world placement
    def to_world(self, p, origin):
        st, ct = math.sin(self.theta), math.cos(self.theta)
        return np.array((p[0] * ct - p[1] * st + origin[0], p[0] * st + p[1] * ct + origin[1], p[2]))

    def to_local(self, p, origin):
        st, ct = math.sin(self.theta), math.cos(self.theta)
        x, y = p[0] - origin[0], p[1] - origin[1]
        return np.array((x * ct + y * st, -x * st + y * ct, p[2]))
