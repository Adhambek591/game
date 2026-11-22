# Guloyim bake shaders (Cycles) on top of mats.py: blue wool with stitched border / piping driven by mesh
# attributes (edist / ealong written by the build), printed headscarf (pu / pv), silver, jewellery (jk attr), gold.
import bpy
import mats
from mats import NB, _common, _scratches, _finish, _store

def _attr(b, name):
    return b.n('ShaderNodeAttribute', attribute_name=name).outputs['Fac']

def _thin(b, x, c, w):
    """1 on a thin line where x == c (half width w, soft)"""
    return b.ramp(b.math('ABSOLUTE', b.math('SUBTRACT', x, c)), (w, w * 0.4))

def cloth2(name, seed=0.0, tint=(0.030, 0.050, 0.300), weave=1300.0, dust=0.6, border=False, scarf=False,
           piping=(0.050, 0.030, 0.018), thread=(0.55, 0.50, 0.38), band_tint=None):
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
    base = b.mix(b.ramp(blot.outputs['Fac'], (0.3, 0.75)), tuple(c * 0.78 for c in tint), tuple(c * 1.22 for c in tint))
    base = b.mix(b.math('MULTIPLY', b.ramp(slub.outputs['Fac'], (0.55, 0.75)), 0.35), base, tuple(min(c * 1.5, 1) for c in tint))
    h = b.math('ADD', b.math('MULTIPLY', wv, 0.35), b.math('MULTIPLY', slub.outputs['Fac'], 0.2))
    r = b.math('ADD', 0.84, b.math('MULTIPLY', wv, 0.08))
    if border:
        ed = _attr(b, 'edist'); al = _attr(b, 'ealong')
        band = b.ramp(ed, (0.036, 0.032))                       # lighter woven border band
        pipe = b.ramp(ed, (0.0055, 0.0040))                     # leather piping on the very edge
        ph = b.math('FRACT', b.math('DIVIDE', al, 0.0065))
        dash = b.math('MULTIPLY', b.ramp(ph, (0.10, 0.18)), b.ramp(ph, (0.70, 0.62)))
        st = b.math('MULTIPLY', b.math('ADD', _thin(b, ed, 0.0105, 0.0008), _thin(b, ed, 0.029, 0.0008)), dash)
        bt = band_tint or tuple(min(c * 1.25 + 0.006, 1) for c in tint)
        base = b.mix(b.math('MULTIPLY', band, 0.85), base, bt)
        base = b.mix(pipe, base, piping)
        base = b.mix(st, base, thread)
        h = b.math('ADD', h, b.math('ADD', b.math('MULTIPLY', st, 0.6), b.math('MULTIPLY', pipe, 0.5)))
        r = b.mixf(pipe, r, 0.62)
    if scarf:
        pu = _attr(b, 'pu'); pv = _attr(b, 'pv'); ed = _attr(b, 'edist'); al = _attr(b, 'ealong')
        # block-print rosettes on a brick grid (5 cm), drawn in local polar coordinates of each cell
        CELL = 0.050
        Y = b.math('DIVIDE', pv, CELL)
        X = b.math('ADD', b.math('DIVIDE', pu, CELL), b.math('MULTIPLY', b.math('FLOOR', Y), 0.5))
        fx = b.math('SUBTRACT', b.math('FRACT', X), 0.5); fy = b.math('SUBTRACT', b.math('FRACT', Y), 0.5)
        rr = b.math('SQRT', b.math('ADD', b.math('MULTIPLY', fx, fx), b.math('MULTIPLY', fy, fy)))
        ang = b.math('ARCTAN2', fy, fx)
        petal = b.math('ADD', 0.29, b.math('MULTIPLY', b.math('COSINE', b.math('MULTIPLY', ang, 6.0)), 0.11))
        ring = b.math('ADD', _thin(b, rr, petal, 0.024), _thin(b, rr, b.math('ADD', 0.12, b.math('MULTIPLY', b.math('COSINE', b.math('MULTIPLY', ang, 6.0)), -0.03)), 0.018))
        dot = b.ramp(rr, (0.050, 0.035))
        vein = b.math('MULTIPLY', _thin(b, b.math('SINE', b.math('MULTIPLY', ang, 6.0)), 0.0, 0.08), b.math('MULTIPLY', b.ramp(rr, (0.38, 0.32)), b.ramp(rr, (0.14, 0.17))))
        corner = b.ramp(b.math('ADD', b.math('ABSOLUTE', fx), b.math('ABSOLUTE', fy)), (0.88, 0.94))
        vein = b.math('ADD', vein, corner)
        motif = b.math('MINIMUM', b.math('ADD', b.math('ADD', ring, dot), b.math('MULTIPLY', vein, 0.7)), 1.0)
        # border: two lines + zigzag between them, along every edge of the scarf
        zz = b.math('MULTIPLY', b.math('ABSOLUTE', b.math('SUBTRACT', b.math('FRACT', b.math('DIVIDE', al, 0.022)), 0.5)), 2.0)
        zline = _thin(b, b.math('DIVIDE', b.math('SUBTRACT', ed, 0.012), 0.016), zz, 0.07)
        inb = b.math('MULTIPLY', b.ramp(ed, (0.010, 0.0125)), b.ramp(ed, (0.030, 0.0275)))
        bl = b.math('ADD', b.math('ADD', _thin(b, ed, 0.009, 0.0011), _thin(b, ed, 0.032, 0.0011)), b.math('MULTIPLY', zline, inb))
        motif = b.math('MULTIPLY', motif, b.ramp(ed, (0.036, 0.042)))
        pr = b.math('MINIMUM', b.math('ADD', motif, bl), 1.0)
        ink = (0.13, 0.19, 0.46)
        base = b.mix(b.math('MULTIPLY', pr, 0.80), base, ink)
        r = b.mixf(pr, r, 0.80)
    zdust = b.ramp(sep.outputs['Z'], (0.55, 0.05))
    dmask = b.math('MULTIPLY', b.math('ADD', b.math('MULTIPLY', zdust, 0.6), b.math('MULTIPLY', convex, 0.5)), dust)
    dmask = b.math('MULTIPLY', dmask, b.ramp(b.noise(obj, 14.0, 5).outputs['Fac'], (0.35, 0.65)))
    base = b.mix(b.math('MINIMUM', dmask, 0.45), base, (0.16, 0.14, 0.12))
    dirt = b.math('MINIMUM', b.math('MULTIPLY', cav, 2.0), 1.0)
    col = b.mix(b.math('MULTIPLY', dirt, 0.6), base, tuple(c * 0.35 for c in tint))
    col = b.mix(b.math('MULTIPLY', wv, 0.16), col, tuple(c * 0.6 for c in tint))
    _finish(b, col, r, 0.0, h, 0.25, 0.0004)
    _store(m, b); return m

def silver(name, seed=0.0, wear=1.0, tarnish=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = NB(m)
    tc, obj, geo, curv, convex, concave, cav = _common(b, seed)
    big = b.noise(obj, 12.0, 5, 0.6)
    scr = _scratches(b, obj, 70.0, 1.0)
    pit = b.voronoi(obj, 300.0)
    g = b.mix(b.ramp(big.outputs['Fac'], (0.3, 0.75)), (0.56, 0.57, 0.58), (0.74, 0.75, 0.76))
    g = b.mix(b.math('MULTIPLY', convex, 0.9 * wear), g, (0.88, 0.88, 0.87))
    dirt = b.math('MINIMUM', b.math('ADD', b.math('MULTIPLY', cav, 2.8), b.math('MULTIPLY', concave, 0.9)), 1.0)
    tarn = b.mix(b.noise(obj, 60.0, 3).outputs['Fac'], (0.05, 0.048, 0.045), (0.14, 0.13, 0.12))
    col = b.mix(b.math('MULTIPLY', dirt, 0.9 * tarnish), g, tarn)
    col = b.mix(b.math('MULTIPLY', scr, 0.35), col, (0.90, 0.90, 0.90))
    r = b.math('ADD', 0.26, b.math('MULTIPLY', b.math('SUBTRACT', big.outputs['Fac'], 0.5), 0.2))
    r = b.mixf(convex, r, 0.16)
    r = b.mixf(dirt, r, 0.55)
    met = b.mixf(b.math('MULTIPLY', dirt, 0.7), 1.0, 0.45)
    hh = b.math('ADD', b.math('MULTIPLY', scr, -0.6), b.math('MULTIPLY', pit.outputs['Distance'], 0.06))
    _finish(b, col, r, met, hh, 0.3, 0.0005)
    _store(m, b); return m

def jewel(name, seed=0.0):
    """silver parts, red coral beads and dark leather cords in one object, selected by the 'jk' attribute"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = NB(m)
    tc, obj, geo, curv, convex, concave, cav = _common(b, seed)
    jk = _attr(b, 'jk')
    red = b.math('MULTIPLY', b.ramp(jk, (0.5, 0.6)), b.ramp(jk, (1.6, 1.5)))
    cord = b.ramp(jk, (1.5, 1.6))
    big = b.noise(obj, 30.0, 4, 0.6)
    scr = _scratches(b, obj, 120.0, 1.0)
    sil = b.mix(b.ramp(big.outputs['Fac'], (0.3, 0.75)), (0.56, 0.57, 0.58), (0.76, 0.77, 0.78))
    sil = b.mix(b.math('MULTIPLY', convex, 0.8), sil, (0.90, 0.90, 0.89))
    dirt = b.math('MINIMUM', b.math('ADD', b.math('MULTIPLY', cav, 3.0), b.math('MULTIPLY', concave, 0.9)), 1.0)
    sil = b.mix(b.math('MULTIPLY', dirt, 0.85), sil, (0.06, 0.055, 0.05))
    coral = b.mix(b.noise(obj, 220.0, 3).outputs['Fac'], (0.42, 0.045, 0.025), (0.62, 0.10, 0.05))
    coral = b.mix(b.math('MULTIPLY', convex, 0.5), coral, (0.75, 0.25, 0.15))
    lea = b.mix(b.noise(obj, 300.0, 3).outputs['Fac'], (0.035, 0.018, 0.010), (0.07, 0.035, 0.018))
    col = b.mix(red, sil, coral)
    col = b.mix(cord, col, lea)
    r = b.mixf(convex, 0.30, 0.18)
    r = b.mixf(dirt, r, 0.55)
    r = b.mixf(red, r, 0.32)
    r = b.mixf(cord, r, 0.75)
    met = b.mixf(b.math('MULTIPLY', dirt, 0.6), 1.0, 0.5)
    met = b.mixf(b.math('MAXIMUM', red, cord), met, 0.0)
    hh = b.math('ADD', b.math('MULTIPLY', scr, -0.5), b.math('MULTIPLY', b.noise(obj, 400.0, 2).outputs['Fac'], 0.1))
    _finish(b, col, r, met, hh, 0.3, 0.0003)
    _store(m, b); return m
