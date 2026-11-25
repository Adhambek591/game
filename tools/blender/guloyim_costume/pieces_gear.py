# Executed inside build.py (after pieces.py helpers): amulet + chain, sabre, scabbard + hangers.
import gamulet; importlib.reload(gamulet)

# =========================================================== AMULET (static mesh, identical everywhere) + chain
def build_amulet():
    mb = gamulet.amulet_mb(MB, lathe_fn=lambda m, prof, segs, c, uv_rect: lathe_capped(m, prof, segs, c, uv_rect=uv_rect))
    # placement on the chest: top resting on the tunic at the V, apex leaning on the cuirass edging
    zt = 1.346 + SH_DZ; za = zt - 0.0068 - gamulet.H
    yt = cy_at(zt) - tab_r(TR_BODY, 0.0, zt) - 0.012
    ya = cy_at(za) - tab_r(TR_HULL, 0.0, za) - (CU_GROW + 0.0105)
    yt = min(yt, ya + 0.004)
    up = Vector((0, yt - ya, zt - za)).normalized()
    fwd = Vector((0, -1, 0)); fwd = (fwd - up * fwd.dot(up)).normalized()
    R = Matrix((Vector((1, 0, 0)), -fwd, up)).transposed()
    M = R.to_4x4(); M.translation = Vector((0, ya, za)) + up * (gamulet.H + 0.0068) + fwd * 0.0
    ob = mb.build('GUL_Amulet', [M_AMU])
    ob.matrix_world = M
    done(ob, 'spine_05', 'Amulet')
    ob['amulet_note'] = 'gold triangle pointing down; geometry + relief from gamulet.py'
    # chain: bail -> left side of the collar -> around the back of the neck -> right side -> bail
    bail = M.translation.copy()
    loop = []
    NY = bone('neck_01').y - 0.009
    for k in range(41):
        u = 0.62 + (2 * math.pi - 1.24) * k / 40
        z = 1.447 + SH_DZ + 0.026 * (1 - math.cos(u)) / 2
        r = FIT.ray_dist(('neck', 'torso'), Vector((0, NY, z)), Vector((math.sin(u), -math.cos(u), 0)), 0.3) or 0.06
        loop.append(Vector((0, NY, z)) + Vector((math.sin(u), -math.cos(u), 0)) * (r + 0.0135))
    def drop(p_end, sgn):
        mid = p_end.lerp(bail, 0.5) + Vector((0, -0.010, 0.0))
        return [bail + Vector((sgn * 0.0012, 0, 0.0028)), mid, p_end]
    left = spline(drop(loop[0], 1), 0.006)
    right = spline(drop(loop[-1], -1), 0.006)[::-1]
    path = left[:-1] + resample(loop, step=0.006)[0] + right[1:]
    path = [FIT.conform(p, ('torso', 'neck'), 0.0115) for p in path]
    path = smooth_pts(path, 3)
    cm = MB()
    ups = [(p - Vector((0, 0.0, 1.40))).normalized() for p in path]
    sweep(cm, path, ups, [(math.cos(2 * math.pi * q / 6) * 0.0016, math.sin(2 * math.pi * q / 6) * 0.0016) for q in range(7)],
          uv_v=TRIM['chain'], u_scale=TRIM_U, cap=True)
    done(cm.build('GUL_Amulet_Chain', [M_TRIM]), 'spine_05', 'Torso')

# =========================================================== SABRE (local: grip centre at origin, blade +Z, spine +Y)
SB_L = 0.68
def sb_path(s):
    return Vector((0, 0.088 * s ** 2.0, s * SB_L))
def sb_width(s):
    w = 0.031 - 0.005 * s
    w += 0.007 * smoothstep(0.60, 0.80, s) * (1 - smoothstep(0.82, 1.0, s))
    return w * (1 - smoothstep(0.93, 1.0, s) * 0.88)
def build_sabre(group='Weapon'):
    mb = MB()
    nseg = 36
    rings = []
    for k in range(nseg + 1):
        s = k / nseg
        p = sb_path(s)
        tg = (sb_path(min(s + 0.01, 1)) - sb_path(max(s - 0.01, 0))).normalized()
        across = Vector((0, 1, 0)); across = (across - tg * across.dot(tg)).normalized()
        flat = Vector((1, 0, 0))
        w = sb_width(s); t = 0.0062 - 0.0030 * s
        fe = smoothstep(0.60, 0.80, s)
        fu = (1 - smoothstep(0.55, 0.70, s)) * smoothstep(0.0, 0.06, s)
        top = [(-0.5, 0.04), (-0.30, 0.30), (-0.05, 0.47), (0.12, 0.47 - 0.25 * fu), (0.30, 0.47 - 0.25 * fu), (0.40, 0.48), (0.5, 0.5 * (1 - fe * 0.9))]
        full = top + [(a, -b) for a, b in reversed(top)]
        rings.append([mb.add_v(p + across * (a * w - w * 0.05) + flat * (b * t)) for a, b in full])
    n = len(rings[0])
    for k in range(nseg):
        for i in range(n):
            i1 = (i + 1) % n
            mb.add_f((rings[k][i], rings[k][i1], rings[k + 1][i1], rings[k + 1][i]),
                     ((0.02 + 0.30 * i / n, 0.02 + 0.96 * k / nseg), (0.02 + 0.30 * (i + 1) / n, 0.02 + 0.96 * k / nseg),
                      (0.02 + 0.30 * (i + 1) / n, 0.02 + 0.96 * (k + 1) / nseg), (0.02 + 0.30 * i / n, 0.02 + 0.96 * (k + 1) / nseg)))
    cap_quads(mb, rings[-1], False, (0.31, 0.99))
    cap_quads(mb, rings[0], True, (0.31, 0.01))
    gp = MB()
    bar = [Vector((0, y, -0.003 - 0.008 * (abs(y) / 0.052) ** 2)) for y in [-0.052 + 0.104 * k / 14 for k in range(15)]]
    sweep(gp, bar, [Vector((1, 0, 0))] * 15, [(-0.0055, -0.0070), (-0.0055, 0.0070), (0.0055, 0.0070), (0.0055, -0.0070), (-0.0055, -0.0070)],
          uv_v=(0.40, 0.48), u_scale=1.0, cap=True)
    for sy in (-1, 1):
        lathe_capped(gp, [(0.0, -0.0085), (0.0062, -0.0068), (0.0085, 0.0), (0.0062, 0.0068), (0.0, 0.0085)], 10,
                     Vector((0, sy * 0.054, -0.011 - 0.002)), uv_rect=(0.40, 0.5 + 0.1 * (sy > 0), 0.48, 0.58 + 0.1 * (sy > 0)))
    for sx in (1, -1):
        G = [[Vector((sx * (0.0042 + 0.0016 * (1 - j / 6)), (i / 3 - 0.5) * (0.016 - 0.009 * j / 6), 0.002 + 0.034 * j / 6)) for i in range(4)] for j in range(7)]
        shell(gp, G, 0.0015, out_fn=lambda p, sx=sx: Vector((sx, 0, 0)), uv_off=(0.5 + 0.1 * (sx > 0), 0.1))
    gr = MB()
    gpath = [Vector((0, -0.008 * (k / 10) ** 2, -0.010 - 0.104 * k / 10)) for k in range(11)]
    G = loft_grid(gpath, lambda j, a: (0.0115 * math.cos(a) * (1 + 0.05 * math.sin(math.pi * j / 10)), 0.0142 * math.sin(a) * (1 + 0.05 * math.sin(math.pi * j / 10))), 12)
    shell(gr, G, 0.0, out_fn=lambda p: Vector((p.x, p.y + 0.004, 0)), closed_u=True, back=False, walls=False, uv_off=(0.6, 0.4))
    pc = gpath[-1]
    lathe_capped(gp, [(0.0128, 0.0), (0.0150, -0.005), (0.0162, -0.013), (0.0128, -0.022), (0.007, -0.027), (0.0, -0.029)], 12,
                 pc + Vector((0, 0, 0.004)), sx=0.85, sy=1.2, uv_rect=(0.4, 0.8, 0.5, 0.98))
    done(gp.build('GUL_Sabre_Guard', [M_WPN]), 'hand_r', group)
    done(gr.build('GUL_Sabre_Grip', [M_WPN]), 'hand_r', group)
    done(mb.build('GUL_Sabre_Blade', [M_WPN]), 'hand_r', group)

# =========================================================== SCABBARD on the left hip (built in the sabre's frame)
def _sheath(dzx):
    mouth = Vector((0.226, -0.075, 0.945))
    dz = Vector((dzx, 0.13, -0.99)).normalized()          # blade direction in the scabbard: down and back, along the leg
    up = Vector((0.0, 0.85, 0.50)); up = (up - dz * up.dot(dz)).normalized()   # spine side up/back, edge down
    xx = up.cross(dz).normalized()
    M = Matrix((xx, up, dz)).transposed().to_4x4()
    M = M @ Matrix.Rotation(math.radians(-22), 4, 'Z')    # flat turned a little toward the front (the curve reads)
    M.translation = mouth - dz * 0.004
    return M
def sheath_matrix():
    # hang as close to the leg as possible while staying outside the skirt / tassets
    for k in range(30):
        dzx = 0.00 + 0.012 * k
        M = _sheath(dzx)
        worst = 9.0
        for s_ in [0.06 * q for q in range(1, 15)]:
            p = M @ sb_path(min(s_, 1.0))
            if p.z < SK_HEM or p.z > SK_TOP: continue
            a, bf, bb, cy = skirt_dims(p.z)
            u = math.atan2(p.x, -(p.y - cy))
            q = skirt_S(u, p.z, grow=0.012 if p.z > TAS_BOT else 0.0)
            worst = min(worst, Vector((p.x, p.y - cy, 0)).length - Vector((q.x, q.y - cy, 0)).length)
        if worst > 0.010: break
    print('SHEATH dz.x %.3f clearance %.3f' % (dzx, worst))
    return M

def build_sabre_and_scabbard():
    build_sabre()
    MS = sheath_matrix()
    sc = MB(); ft = MB()
    nrow = 40
    def ring_pt(s, a, grow=0.0):
        p = sb_path(s)
        w = max(sb_width(min(s, 0.93)), 0.014) / 2 + 0.0062 + grow
        t = 0.0034 + 0.0050 + grow
        c = p + Vector((0, -0.05 * sb_width(s), 0))
        return c + Vector((math.cos(a) * t, math.sin(a) * w, 0))
    S0, S1 = 0.004 / SB_L, (SB_L + 0.014) / SB_L
    G = [[ring_pt(S0 + (S1 - S0) * j / nrow, 2 * math.pi * i / 12) for i in range(12)] for j in range(nrow + 1)]
    for j in range(nrow - 3, nrow + 1):          # rounded tip
        f = (j - (nrow - 4)) / 4
        cen = sum(G[j], Vector()) / 12
        G[j] = [cen + (p - cen) * (1 - 0.55 * f ** 2) for p in G[j]]
    G = [[MS @ p for p in row] for row in G]
    F, N = shell(sc, G, 0.0, out_fn=lambda p: p - (MS @ sb_path(min(max(((MS.inverted() @ p).z) / SB_L, 0), 1))), closed_u=True, back=False, walls=False)
    cap_quads(sc, [F[-1][i] for i in range(12)], False, (0.9, 0.9))
    o = done(sc.build('GUL_Scabbard', [M_WPN]), 'pelvis', 'Torso')
    o['sheath_matrix'] = [list(r) for r in MS]
    # fittings: mouth locket, two suspension bands with rings, chape
    def band(s0, s1, grow=0.0018):
        nj = 3
        Gb = [[MS @ ring_pt(s0 + (s1 - s0) * j / (nj - 1), 2 * math.pi * i / 12, grow=grow) for i in range(12)] for j in range(nj)]
        shell(ft, Gb, 0.0012, out_fn=lambda p: p - (MS @ sb_path(min(max(((MS.inverted() @ p).z) / SB_L, 0), 1))), closed_u=True)
    band(S0, 0.055)
    band(0.085, 0.115); band(0.30, 0.33)
    rings_w = []
    for s in (0.10, 0.315):
        c = MS @ (ring_pt(s, math.pi / 2, grow=0.004))
        axis = (MS.to_3x3() @ Vector((0, 0, 1))).normalized()
        R0, r0 = 0.007, 0.0016
        bx = (MS.to_3x3() @ Vector((1, 0, 0))).normalized(); by = (MS.to_3x3() @ Vector((0, 1, 0))).normalized()
        cc = c + by * (R0 + 0.001)
        tor = [[ft.add_v(cc + (by * math.cos(2 * math.pi * a / 12) + axis * math.sin(2 * math.pi * a / 12)) * (R0 + r0 * math.cos(2 * math.pi * b / 6)) + bx * r0 * math.sin(2 * math.pi * b / 6)) for b in range(6)] for a in range(12)]
        for a in range(12):
            for b in range(6):
                a1, b1 = (a + 1) % 12, (b + 1) % 6
                ft.add_f((tor[a][b], tor[a1][b], tor[a1][b1], tor[a][b1]), ((0.7 + a * 0.02, 0.7 + b * 0.02), (0.72 + a * 0.02, 0.7 + b * 0.02), (0.72 + a * 0.02, 0.72 + b * 0.02), (0.7 + a * 0.02, 0.72 + b * 0.02)))
        rings_w.append(cc + by * R0)
    # chape over the tip
    nj = 5
    Gc = [[MS @ ring_pt(0.90 + (S1 - 0.90) * j / (nj - 1), 2 * math.pi * i / 12, grow=0.0016) for i in range(12)] for j in range(nj)]
    for j in range(nj - 2, nj):
        f = (j - (nj - 3)) / 2
        cen = sum(Gc[j], Vector()) / 12
        Gc[j] = [cen + (p - cen) * (1 - 0.5 * f ** 2) for p in Gc[j]]
    Fc, Nc = shell(ft, Gc, 0.0, out_fn=lambda p: p - (MS @ sb_path(min(max(((MS.inverted() @ p).z) / SB_L, 0), 1))), closed_u=True, back=False, walls=False)
    cap_quads(ft, [Fc[-1][i] for i in range(12)], False, (0.9, 0.95))
    done(ft.build('GUL_Scabbard_Fittings', [M_WPN]), 'pelvis', 'Torso')
    # hanger straps from the rings up to the belt (left side)
    hm = MB()
    S = lambda u, v: torso_S(u, v, grow=BELT_GROW)
    for rw, u in zip(rings_w, (1.05, 1.62)):
        top = belt_S(u, BELT_Z - 0.012, 0.007)
        mid = top.lerp(rw, 0.5) + Vector((0.012, 0, 0))
        path = spline([top, mid, rw], 0.010)
        path = [FIT.conform(p, ('torso', 'legL'), 0.030) if i < len(path) - 2 else p for i, p in enumerate(path)]
        ups = [((p - Vector((0, cy_at(1.0), p.z))) * Vector((1, 1, 0))).normalized() for p in path]
        strap(hm, path, ups, w=0.016, t=0.0028)
    done(hm.build('GUL_Scabbard_Hangers', [M_TRIM]), 'pelvis', 'Torso')
