# Packs UVs of the uniquely-unwrapped texture sets, builds high-poly sources, bakes 4K PBR maps.
# blender -b out/armor_low.blend --python bake_unique.py -- T_Helmet,T_Armor,T_Cloth,T_Weapon [size]
import bpy, sys, os, math, importlib, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc; importlib.reload(bc)
import mats; importlib.reload(mats)
import relief; importlib.reload(relief)
from mathutils import Vector, noise

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
WANT = args[0].split(',') if args else ['T_Helmet', 'T_Armor', 'T_Cloth', 'T_Weapon']
SIZE = int(args[1]) if len(args) > 1 else 4096
PACK_ONLY = len(args) > 2 and args[2] == 'pack'

SETS = {'T_Helmet': 'M_Helmet', 'T_Armor': 'M_Armor', 'T_Cloth': 'M_Cloth', 'T_Weapon': 'M_Weapon'}

# high-poly shader + displacement per object
def kind_of(name):
    K = {
        'SUR_Helmet_Bowl': ('iron', dict(tint=(0.30, 0.31, 0.33), rust=0.35, rough=0.36), bc.d_iron, 2),
        'SUR_Helmet_Gold': ('gold', dict(wear=0.8), bc.d_gold, 2),
        'SUR_Helmet_Liner': ('cloth', dict(tint=(0.10, 0.075, 0.05), weave=900.0, dust=0.2), bc.d_leather, 1),
        'SUR_WaistGuard': ('leather', dict(tint=(0.090, 0.048, 0.025), gilt=True), 'tooled', 4),
        'SUR_Belt_Gold': ('gold', dict(wear=1.0), 'relief', 4),
        'SUR_Pauldron_Backing_L': ('leather', dict(tint=(0.070, 0.036, 0.020)), bc.d_leather, 1),
        'SUR_Bracer_Plate_L': ('iron', dict(tint=(0.15, 0.165, 0.19), rust=0.30, rough=0.36, patina=0.3), bc.d_iron, 2),
        'SUR_Bracer_Leather_L': ('leather', dict(tint=(0.085, 0.045, 0.024)), bc.d_leather, 2),
        # two-tone leather riding boot (reference): brown boot, grey leather shaft panel, dark welted sole. No metal.
        'SUR_Boot_L': ('leather', dict(tint=(0.074, 0.046, 0.032), wear=0.9, scuff=True), 'boot', 2),
        'SUR_Boot_Shaft_L': ('leather', dict(tint=(0.082, 0.087, 0.093), wear=1.25, worn_col=(0.27, 0.28, 0.29), dirt_col=(0.022, 0.022, 0.022), rough=0.50), 'panel', 2),
        'SUR_Boot_Sole_L': ('leather', dict(tint=(0.050, 0.040, 0.034), wear=0.7, worn_col=(0.16, 0.13, 0.11)), bc.d_leather, 2),
        'SUR_Robe_Torso': ('cloth', dict(tint=(0.105, 0.066, 0.042), dust=0.5), bc.d_cloth, 1),      # brown wool kaftan (reference)
        'SUR_Coat': ('cloth', dict(tint=(0.090, 0.058, 0.038), dust=0.45), bc.d_cloth, 1),
        'SUR_Trousers_L': ('cloth', dict(tint=(0.030, 0.027, 0.025), dust=0.9), bc.d_cloth, 1),
        'SUR_Trousers': ('cloth', dict(tint=(0.055, 0.048, 0.043), dust=0.9), 'trouser', 1),      # dark brown-grey wool (reference), not black
        'SUR_Sleeve_L': ('cloth', dict(tint=(0.055, 0.038, 0.028), dust=0.4), bc.d_cloth, 1),
        'SUR_Cape': ('cloth', dict(tint=(0.028, 0.020, 0.017), dust=0.3, weave=1000.0), bc.d_cloth, 1),
        'SUR_Sabre_Blade': ('iron', dict(tint=(0.50, 0.51, 0.53), rust=0.15, rough=0.24, patina=0.15), bc.d_gold, 2),
        'SUR_Sabre_Guard': ('gold', dict(wear=1.1), bc.d_gold, 2),
        'SUR_Sabre_Grip': ('leather', dict(tint=(0.07, 0.035, 0.02)), 'wrap', 2),
    }
    K.update({
        'SUR_WaistGuard': ('leather', dict(tint=(0.090, 0.048, 0.025), gilt=True), 'tooled_c', 4),
        'SUR_Belt': ('leather', dict(tint=(0.060, 0.032, 0.018)), 'belt_c', 3),
        'SUR_Belt_Gold': ('gold', dict(wear=1.0), 'relief_c', 4),
        'SUR_Cuirass_Backing': ('leather', dict(tint=(0.075, 0.040, 0.022)), bc.d_leather, 1),
        'SUR_Cuirass_Straps': ('leather', dict(tint=(0.085, 0.045, 0.024)), bc.d_leather, 2),
        'SUR_Cuirass_Yoke': ('leather', dict(tint=(0.085, 0.045, 0.024)), bc.d_leather, 2),
        'SUR_Tassets_Backing': ('leather', dict(tint=(0.075, 0.040, 0.022)), bc.d_leather, 1),
        'SUR_Pauldron_Backing': ('leather', dict(tint=(0.070, 0.036, 0.020)), bc.d_leather, 1),
        'SUR_Aventail_Backing': ('leather', dict(tint=(0.070, 0.036, 0.020)), bc.d_leather, 1),
        'SUR_Bracer': ('iron', dict(tint=(0.15, 0.165, 0.19), rust=0.30, rough=0.36, patina=0.3), bc.d_iron, 2),
        'SUR_Bracer_Gold': ('gold', dict(wear=1.0), bc.d_gold, 1),
        'SUR_Bracer_Straps': ('leather', dict(tint=(0.085, 0.045, 0.024)), bc.d_leather, 1),
        'SUR_Helmet_Plume': ('cloth', dict(tint=(0.012, 0.011, 0.011), dust=0.15, weave=1400.0), 'plume_c', 2),
        'SUR_Coat': ('cloth', dict(tint=(0.090, 0.058, 0.038), dust=0.45), 'skirt_c', 2),
    })
    return K.get(name) or (K.get(name[:-2] + '_L') if name.endswith('_R') else None)
_META = None
def meta():
    global _META
    if _META is None: _META = json.load(open(os.path.join(bc.TEX, '..', 'armor_c_meta.json')))
    return _META
def d_tooled_c(p, s):
    # the waist guard: grained leather, a stitched line inside each bound edge, a tooled scroll on the front above and below the belt
    m = meta(); u = math.atan2(p.x, -(p.y - m['yax'])); h = bc.d_leather(p, s) * 0.6
    for zc in (m['g_top'] - 0.011, m['g_bot'] + 0.011): h -= 0.0006 * math.exp(-((p.z - zc) / 0.0016) ** 2)
    if abs(u) < 0.75:
        for z0, z1 in ((m['belt_z'] + m['belt_h'] + 0.006, m['g_top'] - 0.016), (m['g_bot'] + 0.016, m['belt_z'] - m['belt_h'] - 0.006)):
            if z0 < p.z < z1:
                yy = (p.z - (z0 + z1) / 2) / max(z1 - z0, 1e-3); xx = abs(u) * 0.20
                sc = math.sin(xx / 0.016 * 6.283 + math.sin(yy * 9.0) * 1.6) * math.cos(yy * 3.1416)
                h += 0.00050 * max(0.0, abs(sc) - 0.35) / 0.65 * min(1.0, (0.75 - abs(u)) / 0.1)
    return h
def d_belt_c(p, s):
    m = meta(); h = bc.d_leather(p, s) * 0.5
    for zc in (m['belt_z'] + m['belt_h'] - 0.004, m['belt_z'] - m['belt_h'] + 0.004): h -= 0.0005 * math.exp(-((p.z - zc) / 0.0012) ** 2)
    return h
def d_relief_c(p, s):
    return d_relief(p, s, [(Vector(c), r0, big) for c, r0, big in meta()['plaques']])
def d_skirt_c(p, s):
    # the kaftan's skirt: wool weave + long hanging folds that deepen toward the hem
    m = meta(); u = math.atan2(p.x, -(p.y - m['yax'])); t = max(0.0, min(1.0, (m['skirt_top'] - p.z) / max(1e-3, m['skirt_top'] - m['skirt_hem'])))
    return bc.d_cloth(p, s) + 0.0016 * t * math.sin(29 * u + 3.0 * math.sin(4 * u) + 2.0 * t) + 0.0008 * t * math.sin(53 * u + 1.7)
def d_plume_c(p, s):
    return 0.0012 * math.sin(p.x * 900 + 3 * math.sin(p.z * 40)) * math.sin(p.y * 700 + p.z * 15)

def d_relief(p, s, centres=[]):
    # embossed rosettes on plaques / beast-mask scrolls on the buckle, done in object space
    best = None
    for c, r0, big in centres:
        d = (p - c)
        if best is None or d.length < best[0]: best = (d.length, d, r0, big, c)
    dl, d, r0, big, c = best
    # local planar coords: use x / z of the belt surface (vertical z, tangential via xy)
    t = Vector((-c.y, c.x, 0)).normalized() if c.length > 0 else Vector((1, 0, 0))
    x = d.dot(t); z = d.z
    r = math.hypot(x, z) / r0
    a = math.atan2(z, x)
    h = 0.0
    rim = max(0.0, 1 - abs(r - 0.86) / 0.06) * 0.0011
    if big:
        ax = abs(x) / r0
        h += max(0.0, math.cos(ax * 9 + z / r0 * 6)) * 0.0007 * (r < 0.75)
        h += max(0.0, 1 - math.hypot(ax - 0.28, z / r0 - 0.15) / 0.12) * 0.0018   # eyes
        h += max(0.0, 1 - math.hypot(x / r0, z / r0 + 0.25) / 0.22) * 0.0016      # muzzle
        rim = max(0.0, 1 - abs(max(abs(x) / (r0 * 1.32), abs(z) / (r0 * 0.88)) - 0.9) / 0.05) * 0.0012
    else:
        h += max(0.0, math.cos(a * 4)) * max(0.0, 1 - r / 0.62) * 0.0012
        h += max(0.0, 1 - r / 0.16) * 0.0012
    return h + rim

def d_tooled(p, s):
    u = math.atan2(p.x, -p.y); cu = math.cos(u)
    zt = 1.198 + 0.016 * cu * cu * (1 if cu > 0 else 0.3)
    zb = 1.030 - 0.040 * max(0.0, cu) ** 10
    h = bc.d_leather(p, s)
    for zc in (zt - 0.011, zb + 0.011):
        h -= 0.0006 * math.exp(-((p.z - zc) / 0.0016) ** 2)
    # tooled scroll motif on the front panels above and below the belt
    if cu > 0.80:
        for z0, z1 in ((1.128, zt - 0.018), (zb + 0.018, 1.058)):
            if z0 < p.z < z1:
                yy = (p.z - (z0 + z1) / 2) / max(z1 - z0, 1e-3)
                xx = abs(u) * 0.20
                sc = math.sin(xx / 0.016 * 6.283 + math.sin(yy * 9.0) * 1.6) * math.cos(yy * 3.1416)
                h += 0.00045 * max(0.0, abs(sc) - 0.35) / 0.65
    return h

_BT = None
def _boot_extent():
    global _BT
    if _BT is None:
        o = bpy.data.objects['SUR_Boot_L']; vs = [v.co for v in o.data.vertices]
        _BT = (min(v.y for v in vs), max(v.y for v in vs))
    return _BT
def d_boot(p, s):
    """soft boot leather: walking creases across the vamp and round the ankle, leather grain"""
    yF, yB = _boot_extent()
    h = bc.d_leather(p, s)
    if 0.02 < p.z < 0.19:
        band = math.exp(-((p.z - 0.105) / 0.05) ** 2) * (0.35 + 0.65 * math.exp(-((p.y - (yF + 0.20)) / 0.09) ** 2))
        cr = max(0.0, math.sin(p.y / 0.0125 * 6.283 + 2.2 * math.sin(p.x * 55) + p.z * 30)) ** 6
        h -= 0.0008 * band * cr
    return h
def d_panel(p, s):
    """stiffer grey leather of the shaft panel: grain + a few shallow sags"""
    return bc.d_leather(p, s) * 0.8 + noise.noise(p * 14.0 + Vector((s, s, 0))) * 0.0004
def boot_scuff(p):
    yF, yB = _boot_extent()
    toe = math.exp(-((p.y - yF) / 0.035) ** 2) * (1.0 if p.z < 0.07 else 0.0)
    heel = math.exp(-((p.y - yB) / 0.03) ** 2) * (1.0 if p.z < 0.07 else 0.0)
    return min(0.42, (toe + heel) * 0.42)      # soft dusty wear on toe and heel (no per-vertex noise: it bakes blocky)

def d_wrap(p, s):
    a = math.atan2(p.x, p.y)
    return -abs(math.sin(p.z * 260 + a * 1.0)) ** 6 * 0.0006

TORSO_TAB = [tuple(r) for r in json.load(open(os.path.join(bc.TEX, '..', 'fit.json')))['TORSO']]
def torso_point(u, v, grow):
    import sk
    a, bf, bb, n = sk.interp_table(TORSO_TAB, v)
    a += grow; bf += grow; bb += grow
    s_, c_ = math.sin(u), math.cos(u)
    x = a * math.copysign(abs(s_) ** (2 / n), s_)
    y = -bf * abs(c_) ** (2 / n) if c_ > 0 else bb * abs(c_) ** (2 / n)
    return Vector((x, y, v))

bc.setup_cycles(8)
lows_all = [o for o in bpy.data.objects if o.type == 'MESH']

def pack(objs, margin=0.002):
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    bc.select_only(objs, objs[0])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.seams_from_islands()
    bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.001)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')

def copy_mirror_uvs():
    for o in lows_all:
        if o.get('bake_skip') and o.name.endswith('_R'):
            L = bpy.data.objects.get(o.name[:-2] + '_L')
            if not L: continue
            lu = L.data.uv_layers.active.data; ru = o.data.uv_layers.active.data
            for pl, pr in zip(L.data.polygons, o.data.polygons):
                n = pl.loop_total
                for k in range(n):
                    ru[pr.loop_start + k].uv = lu[pl.loop_start + n - 1 - k].uv

for tset in WANT:
    mname = SETS[tset]
    objs = [o for o in lows_all if o.data.materials and o.data.materials[0].name == mname and not o.get('bake_skip')]
    print(tset, [o.name for o in objs])
    pack(objs)
copy_mirror_uvs()
bpy.ops.wm.save_mainfile()
if PACK_ONLY:
    sys.exit(0)

# lows (and the proxy body) must not occlude the highs' AO / crevice masks
for o in lows_all:
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, False)

for tset in WANT:
    mname = SETS[tset]
    objs = [o for o in lows_all if o.data.materials and o.data.materials[0].name == mname and not o.get('bake_skip')]
    pairs = []; hmats = []
    for i, o in enumerate(objs):
        k = kind_of(o.name)
        if not k: print('no kind for', o.name); continue
        shader, kw, disp, lvl = k
        afun = None
        if disp == 'relief':
            cents = [(torso_point(0.0, 1.093, 0.031), 0.056, 0.040, -1)]
            for k, u in enumerate((0.42, 0.78, 1.14, 1.50)):
                for sg in (1, -1):
                    cents.append((torso_point(u * sg, 1.093, 0.031), 0.022, 0.023, k))
            dfun = lambda p, s, c=cents: relief.belt_gold(p, c)
        elif disp == 'boot':
            dfun = lambda p, s: d_boot(p, s)
            afun = lambda p: boot_scuff(p)
        elif disp == 'panel':
            dfun = d_panel
        elif disp == 'tooled':
            dfun = lambda p, s: relief.guard_orn(p)[0] + bc.d_leather(p, s) * 0.6
            afun = lambda p: relief.guard_orn(p)[1]
        elif disp == 'wrap':
            dfun = d_wrap
        elif disp in ('tooled_c', 'belt_c', 'relief_c', 'skirt_c', 'plume_c'):
            dfun = {'tooled_c': d_tooled_c, 'belt_c': d_belt_c, 'relief_c': d_relief_c, 'skirt_c': d_skirt_c, 'plume_c': d_plume_c}[disp]
        elif disp == 'trouser':
            # fitted riding trousers: the wrinkles live in the normal map only (creases behind the knee, a slight gather
            # at the boot top); design-space heights: knee 0.50, boot top 0.45
            def dfun(p, s_):
                h = bc.d_cloth(p, s_)
                back = max(0.0, min(1.0, p.y / 0.05))
                h += 0.0011 * math.sin((p.z - 0.50) / 0.021 * 6.2832 + 3.0 * p.x) * math.exp(-((p.z - 0.50) / 0.05) ** 2) * (0.2 + 0.8 * back)
                h += 0.0009 * math.sin(p.z / 0.011 * 6.2832 + 9.0 * p.x) * max(0.0, 1.0 - abs(p.z - 0.47) / 0.035)
                return h
        else:
            dfun = disp
        # the pieces were built at the kit's design size and scaled back to the real body: the relief / crease functions
        # are written in design coordinates, so evaluate them there
        _K = float(os.environ.get('SUR_DESIGN_K', '1.0'))
        if _K != 1.0 and disp not in ('tooled_c', 'belt_c', 'relief_c', 'skirt_c', 'plume_c'):      # (the new pieces are built at real size)
            if callable(dfun): dfun = (lambda f: (lambda p, s_: f(p * _K, s_)))(dfun)
            if callable(afun): afun = (lambda f: (lambda p: f(p * _K)))(afun)
        h = bc.make_high(o, level=lvl, bevel=0.0006 if shader != 'cloth' else 0.0, disp=dfun, seed=i * 1.7, attr=afun)
        mt = getattr(mats, shader)(o.name + '_HM', seed=i * 0.37, **kw)
        h.data.materials.clear(); h.data.materials.append(mt)
        hmats.append(mt)
        pairs.append((o, [h]))
    imgs = {c: bc.new_image(f'{tset}_{c}', SIZE, data=(c != 'base')) for c in ('base', 'nrm', 'rough', 'metal', 'ao', 'curv')}
    bm = bc.bake_material(imgs['base'])
    # per-object bakes: each low only sees its own high (no cross-hits between layered cloth / overlapping pieces)
    saved = {o.name: list(o.data.materials) for o, _ in pairs}
    for o, _ in pairs:
        o.data.materials.clear(); o.data.materials.append(bm)
    ext = 0.012 if tset == 'T_Cloth' else 0.006
    ray = 0.03 if tset == 'T_Cloth' else 0.015
    bc.bake('NORMAL', pairs, imgs['nrm'], [bm], extrusion=ext, ray=ray, samples=4)
    bc.bake('AO', pairs, imgs['ao'], [bm], extrusion=ext, ray=ray, samples=64)
    for ch in ('base', 'rough', 'metal', 'curv'):
        bc.bake('EMIT', pairs, imgs[ch], [bm], extrusion=ext, ray=ray, samples=4, highs_mats=hmats, channel=ch)
    for o, _ in pairs:
        o.data.materials.clear()
        for m in saved[o.name]: o.data.materials.append(m)
    bc.write_set(tset, imgs['base'], imgs['nrm'], imgs['rough'], imgs['metal'], imgs['ao'], imgs['curv'])
    hs_all = set(h for _, hs in pairs for h in hs)
    bpy.data.libraries.write(os.path.join(bc.TEX, '..', 'high_' + tset + '.blend'), hs_all, fake_user=True)
    for o, hs in pairs:
        for h in hs:
            bpy.data.objects.remove(h)
    bpy.data.materials.remove(bm)
bpy.ops.wm.save_mainfile()
print('BAKE DONE', WANT)
