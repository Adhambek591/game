# Procedural PBR shaders for the high-poly bake sources (Cycles).
# Each builder returns a material whose Principled BSDF drives the full look; bake.py re-routes
# BaseColor / Roughness / Metallic / curvature to an Emission output for the colour bakes.
import bpy

class NB:
    def __init__(self, mat):
        self.m = mat; self.nt = mat.node_tree; self.x = -1200
        self.nt.nodes.clear()
    def n(self, typ, **kw):
        nd = self.nt.nodes.new(typ)
        nd.location = (self.x, 0); self.x += 60
        for k, v in kw.items():
            if k in nd.inputs:
                nd.inputs[k].default_value = v
            else:
                setattr(nd, k, v)
        return nd
    def l(self, a, b):
        self.nt.links.new(a, b)
    def math(self, op, a, b=None, clamp=False):
        nd = self.n('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): nd.inputs[i].default_value = v
            else: self.l(v, nd.inputs[i])
        return nd.outputs[0]
    def mix(self, fac, a, b, blend='MIX'):
        nd = self.n('ShaderNodeMix', data_type='RGBA', blend_type=blend)
        for sock, v in ((nd.inputs[0], fac), (nd.inputs[6], a), (nd.inputs[7], b)):
            if isinstance(v, (int, float)): sock.default_value = v
            elif isinstance(v, tuple): sock.default_value = (*v, 1) if len(v) == 3 else v
            else: self.l(v, sock)
        return nd.outputs[2]
    def mixf(self, fac, a, b):
        nd = self.n('ShaderNodeMix', data_type='FLOAT')
        for sock, v in ((nd.inputs[0], fac), (nd.inputs[2], a), (nd.inputs[3], b)):
            if isinstance(v, (int, float)): sock.default_value = v
            else: self.l(v, sock)
        return nd.outputs[0]
    def ramp(self, inp, stops):
        nd = self.n('ShaderNodeMapRange', clamp=True)
        self.l(inp, nd.inputs[0]); nd.inputs[1].default_value = stops[0]; nd.inputs[2].default_value = stops[1]
        nd.inputs[3].default_value = stops[2] if len(stops) > 2 else 0.0
        nd.inputs[4].default_value = stops[3] if len(stops) > 3 else 1.0
        return nd.outputs[0]
    def noise(self, vec, scale, detail=4, rough=0.55, dist=0.0, w=None):
        nd = self.n('ShaderNodeTexNoise', noise_dimensions='4D' if w is not None else '3D')
        self.l(vec, nd.inputs['Vector']); nd.inputs['Scale'].default_value = scale
        nd.inputs['Detail'].default_value = detail; nd.inputs['Roughness'].default_value = rough
        nd.inputs['Distortion'].default_value = dist
        if w is not None: nd.inputs['W'].default_value = w
        return nd
    def voronoi(self, vec, scale, feature='F1', dist='EUCLIDEAN'):
        nd = self.n('ShaderNodeTexVoronoi', feature=feature, distance=dist)
        self.l(vec, nd.inputs['Vector']); nd.inputs['Scale'].default_value = scale
        return nd
    def scale_vec(self, vec, s):
        nd = self.n('ShaderNodeVectorMath', operation='SCALE'); self.l(vec, nd.inputs[0]); nd.inputs['Scale'].default_value = s
        return nd.outputs[0]
    def add_vec(self, vec, off):
        nd = self.n('ShaderNodeVectorMath', operation='ADD'); self.l(vec, nd.inputs[0]); nd.inputs[1].default_value = off
        return nd.outputs[0]

def _common(b, seed):
    tc = b.n('ShaderNodeTexCoord')
    obj = b.add_vec(tc.outputs['Object'], (seed * 3.17, seed * 1.31, seed * 2.03))
    geo = b.n('ShaderNodeNewGeometry')
    # curvature from pointiness (dense high mesh): >0 convex, <0 concave
    curv = b.math('SUBTRACT', geo.outputs['Pointiness'], 0.5)
    convex = b.ramp(curv, (0.015, 0.09))
    concave = b.ramp(curv, (-0.015, -0.09))
    ao = b.n('ShaderNodeAmbientOcclusion', samples=8, only_local=False)
    ao.inputs['Distance'].default_value = 0.012
    cav = b.math('SUBTRACT', 1.0, ao.outputs['AO'])
    return tc, obj, geo, curv, convex, concave, cav

def _scratches(b, obj, scale=60.0, amount=0.5):
    # long thin scratches: stretched noise -> thin band threshold, two directions
    out = None
    for i, (sx, sy, sz) in enumerate(((1, 14, 1), (14, 1, 3))):
        mp = b.n('ShaderNodeMapping'); b.l(obj, mp.inputs[0]); mp.inputs['Scale'].default_value = (sx, sy, sz)
        mp.inputs['Rotation'].default_value = (0.3 * i, 0.5 + i, 0.2)
        nz = b.noise(mp.outputs[0], scale, detail=2, rough=0.4)
        band = b.math('ABSOLUTE', b.math('SUBTRACT', nz.outputs['Fac'], 0.5))
        line = b.ramp(band, (0.012, 0.0))
        gate = b.ramp(b.noise(obj, 6.0 + i, 2).outputs['Fac'], (0.5, 0.62))
        s = b.math('MULTIPLY', line, gate)
        out = s if out is None else b.math('MAXIMUM', out, s)
    return b.math('MULTIPLY', out, amount)

def _finish(b, base, rough, metal, bump_h, bump_strength=1.0, bump_dist=0.001):
    bsdf = b.n('ShaderNodeBsdfPrincipled')
    b.l(base, bsdf.inputs['Base Color'])
    if isinstance(rough, float): bsdf.inputs['Roughness'].default_value = rough
    else: b.l(rough, bsdf.inputs['Roughness'])
    if isinstance(metal, float): bsdf.inputs['Metallic'].default_value = metal
    else: b.l(metal, bsdf.inputs['Metallic'])
    bp = b.n('ShaderNodeBump', strength=bump_strength) if False else b.n('ShaderNodeBump')
    bp.inputs['Strength'].default_value = bump_strength; bp.inputs['Distance'].default_value = bump_dist
    b.l(bump_h, bp.inputs['Height']); b.l(bp.outputs['Normal'], bsdf.inputs['Normal'])
    out = b.n('ShaderNodeOutputMaterial'); b.l(bsdf.outputs[0], out.inputs['Surface'])
    m = b.m
    m['ch_base'] = 1
    # expose channels for emission bakes
    b.ch = {'base': base, 'rough': rough, 'metal': metal}
    return m

def _store(m, b):
    m['_nb'] = True
    _CH[m.name] = b.ch

_CH = {}

def iron(name, seed=0.0, tint=(0.235, 0.245, 0.262), rust=1.0, dark=1.0, rough=0.44, patina=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = NB(m)
    tc, obj, geo, curv, convex, concave, cav = _common(b, seed)
    big = b.noise(obj, 9.0, 3, 0.45)
    mid = b.noise(obj, 38.0, 4, 0.55)
    pit = b.voronoi(obj, 420.0)
    hammer = b.voronoi(obj, 55.0, 'SMOOTH_F1')
    scr = _scratches(b, obj, 55.0, 1.0)
    # rust where crevice + noise
    rmask = b.math('MULTIPLY', b.math('ADD', b.math('ADD', b.math('MULTIPLY', cav, 2.2), b.math('MULTIPLY', concave, 0.9)), b.math('MULTIPLY', b.ramp(b.noise(obj, 9.0, 4).outputs['Fac'], (0.62, 0.80)), 0.25)),
                   b.ramp(b.noise(obj, 22.0, 6, 0.7).outputs['Fac'], (0.42, 0.70)))
    rmask = b.math('MINIMUM', b.math('MULTIPLY', rmask, rust), 1.0)
    rust_col = b.mix(b.noise(obj, 80.0, 3).outputs['Fac'], (0.11, 0.055, 0.028), (0.24, 0.12, 0.05))
    steel = b.mix(b.ramp(big.outputs['Fac'], (0.3, 0.7)), tuple(c * 0.80 * dark for c in tint), tuple(c * 1.10 * dark for c in tint))
    steel = b.mix(b.math('MULTIPLY', convex, 0.85), steel, (0.42, 0.43, 0.45))
    steel = b.mix(b.math('MULTIPLY', scr, 0.6), steel, (0.50, 0.51, 0.53))
    dirt = b.math('MINIMUM', b.math('MULTIPLY', cav, 2.5), 1.0)
    # blackened oxide patina blotches (fire-scale), strongest away from rubbed edges
    pat = b.ramp(b.noise(obj, 14.0, 6, 0.65, dist=0.4).outputs['Fac'], (0.40, 0.62))
    pat = b.math('MULTIPLY', pat, b.math('SUBTRACT', 1.0, convex))
    pat = b.math('MULTIPLY', pat, patina)
    col = b.mix(b.math('MULTIPLY', pat, 0.80), steel, (0.045, 0.045, 0.048))
    col = b.mix(b.math('MULTIPLY', dirt, 0.65), col, (0.05, 0.045, 0.04))
    col = b.mix(rmask, col, rust_col)
    r = b.math('ADD', rough, b.math('MULTIPLY', b.math('SUBTRACT', mid.outputs['Fac'], 0.5), 0.35))
    r = b.math('ADD', r, b.math('MULTIPLY', b.math('SUBTRACT', hammer.outputs['Distance'], 0.3), 0.15))
    r = b.mixf(convex, r, rough * 0.6)
    r = b.mixf(b.math('MULTIPLY', scr, 0.8), r, rough * 0.5)
    r = b.mixf(dirt, r, 0.75)
    r = b.mixf(b.math('MULTIPLY', pat, 0.8), r, 0.62)
    r = b.mixf(rmask, r, 0.88)
    met = b.mixf(rmask, 1.0, 0.0)
    met = b.mixf(b.math('MULTIPLY', pat, 0.8), met, 0.35)
    met = b.mixf(b.math('MULTIPLY', dirt, 0.6), met, 0.3)
    h = b.math('ADD', b.math('MULTIPLY', hammer.outputs['Distance'], 0.25), b.math('MULTIPLY', scr, -0.6))
    h = b.math('ADD', h, b.math('MULTIPLY', pit.outputs['Distance'], 0.08))
    h = b.math('ADD', h, b.math('MULTIPLY', rmask, b.math('MULTIPLY', b.noise(obj, 260.0, 3).outputs['Fac'], 0.5)))
    _finish(b, col, r, met, h, 0.35, 0.0006)
    _store(m, b); return m

def gold(name, seed=0.0, wear=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = NB(m)
    tc, obj, geo, curv, convex, concave, cav = _common(b, seed)
    big = b.noise(obj, 12.0, 5, 0.6)
    scr = _scratches(b, obj, 70.0, 1.0)
    pit = b.voronoi(obj, 300.0)
    g = b.mix(b.ramp(big.outputs['Fac'], (0.3, 0.75)), (0.80, 0.56, 0.24), (0.98, 0.74, 0.36))
    g = b.mix(b.math('MULTIPLY', convex, 0.9), g, (1.0, 0.86, 0.55))
    # rubbed-through gilding on high edges shows the bronze/iron below
    thru = b.math('MULTIPLY', b.ramp(curv, (0.06, 0.14)), b.ramp(b.noise(obj, 40.0, 4).outputs['Fac'], (0.5, 0.65)))
    thru = b.math('MULTIPLY', thru, wear)
    g = b.mix(thru, g, (0.36, 0.25, 0.15))
    dirt = b.math('MINIMUM', b.math('ADD', b.math('MULTIPLY', cav, 2.6), b.math('MULTIPLY', concave, 0.8)), 1.0)
    tarn = b.mix(b.noise(obj, 60.0, 3).outputs['Fac'], (0.10, 0.07, 0.035), (0.22, 0.14, 0.06))
    col = b.mix(b.math('MULTIPLY', dirt, 0.85), g, tarn)
    col = b.mix(b.math('MULTIPLY', scr, 0.4), col, (1.0, 0.85, 0.55))
    r = b.math('ADD', 0.24, b.math('MULTIPLY', b.math('SUBTRACT', big.outputs['Fac'], 0.5), 0.2))
    r = b.mixf(convex, r, 0.14)
    r = b.mixf(dirt, r, 0.62)
    r = b.mixf(b.math('MULTIPLY', scr, 0.6), r, 0.40)
    met = b.mixf(b.math('MULTIPLY', dirt, 0.7), 1.0, 0.35)
    h = b.math('ADD', b.math('MULTIPLY', scr, -0.6), b.math('MULTIPLY', pit.outputs['Distance'], 0.06))
    _finish(b, col, r, met, h, 0.3, 0.0005)
    _store(m, b); return m

def leather(name, seed=0.0, tint=(0.115, 0.058, 0.030), wear=1.0, gilt=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = NB(m)
    tc, obj, geo, curv, convex, concave, cav = _common(b, seed)
    blot = b.noise(obj, 7.0, 6, 0.65)
    grain = b.voronoi(obj, 650.0, 'F2')
    grain2 = b.voronoi(obj, 260.0, 'DISTANCE_TO_EDGE')
    crease = b.noise(obj, 25.0, 6, 0.7, dist=1.5)
    scr = _scratches(b, obj, 40.0, 0.8)
    base = b.mix(b.ramp(blot.outputs['Fac'], (0.3, 0.75)), tuple(c * 0.70 for c in tint), tuple(c * 1.35 for c in tint))
    worn = b.math('MINIMUM', b.math('ADD', b.math('MULTIPLY', convex, wear), b.math('MULTIPLY', scr, 0.7)), 1.0)
    base = b.mix(b.math('MULTIPLY', worn, 0.7), base, (0.19, 0.11, 0.06))
    dirt = b.math('MINIMUM', b.math('MULTIPLY', cav, 2.4), 1.0)
    col = b.mix(b.math('MULTIPLY', dirt, 0.75), base, (0.03, 0.018, 0.010))
    r = b.math('ADD', 0.62, b.math('MULTIPLY', b.math('SUBTRACT', blot.outputs['Fac'], 0.5), 0.25))
    r = b.mixf(b.math('MULTIPLY', convex, 0.8), r, 0.42)
    r = b.mixf(dirt, r, 0.85)
    h = b.math('ADD', b.math('MULTIPLY', grain.outputs['Distance'], 0.10), b.math('MULTIPLY', grain2.outputs['Distance'], 0.15))
    h = b.math('ADD', h, b.math('MULTIPLY', b.ramp(crease.outputs['Fac'], (0.45, 0.55)), 0.25))
    h = b.math('ADD', h, b.math('MULTIPLY', scr, -0.4))
    met = 0.0
    if gilt:
        # gilt tooled lines from the vertex colour written by the relief pass (worn off on the high spots)
        at = b.n('ShaderNodeAttribute', attribute_name='orn')
        gm = b.math('MULTIPLY', b.ramp(at.outputs['Fac'], (0.25, 0.6)), b.mixf(b.math('MULTIPLY', convex, 0.6), 1.0, 0.55))
        gcol = b.mix(b.noise(obj, 90.0, 3).outputs['Fac'], (0.62, 0.43, 0.17), (0.86, 0.64, 0.28))
        col = b.mix(gm, col, gcol)
        r = b.mixf(gm, r, 0.32)
        met = b.mixf(gm, 0.0, 0.95)
    _finish(b, col, r, met, h, 0.45, 0.0006)
    _store(m, b); return m

def cloth(name, seed=0.0, tint=(0.085, 0.060, 0.045), weave=1300.0, dust=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = NB(m)
    tc, obj, geo, curv, convex, concave, cav = _common(b, seed)
    sep = b.n('ShaderNodeSeparateXYZ'); b.l(obj, sep.inputs[0])
    w1 = b.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='X'); b.l(obj, w1.inputs['Vector']); w1.inputs['Scale'].default_value = weave
    w2 = b.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='Z'); b.l(obj, w2.inputs['Vector']); w2.inputs['Scale'].default_value = weave
    chk = b.n('ShaderNodeTexChecker'); b.l(obj, chk.inputs['Vector']); chk.inputs['Scale'].default_value = weave * 0.32
    wv = b.mixf(chk.outputs['Fac'], w1.outputs['Fac'], w2.outputs['Fac'])
    slub = b.noise(obj, 180.0, 3)
    blot = b.noise(obj, 6.0, 5, 0.6)
    base = b.mix(b.ramp(blot.outputs['Fac'], (0.3, 0.75)), tuple(c * 0.80 for c in tint), tuple(c * 1.25 for c in tint))
    base = b.mix(b.math('MULTIPLY', b.ramp(slub.outputs['Fac'], (0.55, 0.75)), 0.4), base, tuple(c * 1.6 for c in tint))
    # dust toward hems (low z) and on convex folds
    zdust = b.ramp(sep.outputs['Z'], (0.55, 0.05))
    dmask = b.math('MULTIPLY', b.math('ADD', b.math('MULTIPLY', zdust, 0.6), b.math('MULTIPLY', convex, 0.5)), dust)
    dmask = b.math('MULTIPLY', dmask, b.ramp(b.noise(obj, 14.0, 5).outputs['Fac'], (0.35, 0.65)))
    base = b.mix(b.math('MINIMUM', dmask, 0.5), base, (0.13, 0.11, 0.09))
    dirt = b.math('MINIMUM', b.math('MULTIPLY', cav, 2.0), 1.0)
    col = b.mix(b.math('MULTIPLY', dirt, 0.6), base, tuple(c * 0.35 for c in tint))
    col = b.mix(b.math('MULTIPLY', wv, 0.18), col, tuple(c * 0.6 for c in tint))
    r = b.math('ADD', 0.86, b.math('MULTIPLY', wv, 0.08))
    h = b.math('ADD', b.math('MULTIPLY', wv, 0.35), b.math('MULTIPLY', slub.outputs['Fac'], 0.2))
    _finish(b, col, r, 0.0, h, 0.25, 0.0004)
    _store(m, b); return m
