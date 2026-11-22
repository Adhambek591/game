# Packs UVs of the uniquely-unwrapped texture sets, builds high-poly sources, bakes PBR maps (BaseColor / Normal DX / ORM).
# blender -b out/costume_low.blend --python bake_unique.py -- T_Cloth,T_Armor,T_Jewel,T_Weapon,T_Amulet [size] [pack]
import bpy, sys, os, math, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_common as bc; importlib.reload(bc)
import mats; importlib.reload(mats)
import gmats; importlib.reload(gmats)
import gamulet; importlib.reload(gamulet)
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
WANT = args[0].split(',') if args else ['T_Cloth', 'T_Armor', 'T_Jewel', 'T_Weapon', 'T_Amulet']
SIZE = int(args[1]) if len(args) > 1 else 4096
PACK_ONLY = len(args) > 2 and args[2] == 'pack'
SETS = {'T_Cloth': 'M_Cloth', 'T_Armor': 'M_Armor', 'T_Jewel': 'M_Jewel', 'T_Weapon': 'M_Weapon', 'T_Amulet': 'M_Amulet'}
SIZES = {'T_Jewel': min(SIZE, 2048), 'T_Amulet': min(SIZE, 2048)}

BLUE = (0.020, 0.030, 0.150)          # deep indigo / cobalt wool (the turnaround), not saturated royal blue
def kind_of(name):
    K = {
        'GUL_Tunic_Torso': ('cloth2', dict(tint=BLUE, dust=0.2), bc.d_cloth, 1),
        'GUL_Tunic_Collar': ('cloth2', dict(tint=BLUE, dust=0.1, border=True), bc.d_cloth, 1),
        'GUL_Tunic_Skirt': ('cloth2', dict(tint=BLUE, dust=0.7, border=True), 'sheet', 1),
        'GUL_Sleeve_L': ('cloth2', dict(tint=BLUE, dust=0.35), bc.d_cloth, 1),
        'GUL_Trousers_L': ('cloth2', dict(tint=(0.040, 0.021, 0.011), dust=0.6, weave=1500.0), bc.d_cloth, 1),
        'GUL_Headscarf': ('cloth2', dict(tint=(0.022, 0.034, 0.190), dust=0.1, scarf=True, weave=1800.0), 'sheet', 1),
        'GUL_Boot_L': ('leather', dict(tint=(0.074, 0.036, 0.018), wear=1.0), 'boot', 2),
        'GUL_Boot_Sole_L': ('leather', dict(tint=(0.030, 0.019, 0.012), wear=0.7), 'sole', 2),
        'GUL_Boot_Heel_L': ('leather', dict(tint=(0.034, 0.021, 0.013), wear=0.7), 'heel', 2),
        'GUL_Bracer_Plate_L': ('iron', dict(tint=(0.30, 0.31, 0.33), rust=0.55, rough=0.33, patina=0.6), bc.d_iron, 2),
        'GUL_Bracer_Leather_L': ('leather', dict(tint=(0.070, 0.037, 0.020)), bc.d_leather, 2),
        'GUL_Pauldron_Backing_L': ('leather', dict(tint=(0.060, 0.032, 0.018)), bc.d_leather, 1),
        'GUL_Belt_Silver': ('silver', dict(wear=1.0), 'plaque', 3),
        'GUL_Belt_Cords': ('jewel', dict(), 'fine', 2),
        'GUL_Headband': ('jewel', dict(), 'fine', 2),
        'GUL_Sabre_Blade': ('iron', dict(tint=(0.50, 0.51, 0.53), rust=0.12, rough=0.22, patina=0.12), bc.d_gold, 2),
        'GUL_Sabre_Guard': ('silver', dict(wear=1.0), bc.d_gold, 2),
        'GUL_Sabre_Grip': ('leather', dict(tint=(0.050, 0.026, 0.015)), 'wrap', 2),
        'GUL_Scabbard': ('leather', dict(tint=(0.040, 0.022, 0.013), wear=0.8), bc.d_leather, 2),
        'GUL_Scabbard_Fittings': ('silver', dict(wear=0.9, tarnish=1.3), bc.d_gold, 2),
        'GUL_Amulet': ('gold', dict(wear=0.6), 'amulet', 4),
    }
    return K.get(name)

def d_sheet(p, s):
    # single-layer cloth: gentle weave/fold relief, small so the sheet never self-crosses
    return bc.d_cloth(p, s) * 0.6

def d_boot(p, s):
    # leather grain + creases around the ankle / instep (horizontal, wavy, strongest at the front)
    h = bc.d_leather(p, s)
    if 0.055 < p.z < 0.20:
        w = min(1.0, (p.z - 0.055) / 0.03) * min(1.0, (0.20 - p.z) / 0.04)
        ph = p.z / 0.0085 + 1.6 * math.sin(p.x * 160 + p.y * 90)
        h -= 0.00055 * w * max(0.0, math.sin(ph * 2 * math.pi)) ** 6
    return h

def d_sole(p, s):
    # layered sole: groove between outsole and midsole + stitch dents along the top edge
    h = bc.d_leather(p, s) * 0.5
    zz = p.z - (-0.015)
    h -= 0.0004 * math.exp(-((zz % 0.025 - 0.0076) / 0.0006) ** 2)
    return h

def d_heel(p, s):
    # stacked leather heel: lifts every 4 mm
    zz = (p.z + 0.015) % 0.004
    return bc.d_leather(p, s) * 0.4 - 0.00025 * math.exp(-((zz - 0.002) / 0.00035) ** 2)

def d_fine(p, s):
    return bc.d_gold(p, s) * 0.5

def d_wrap(p, s):
    a = math.atan2(p.x, p.y)
    return -abs(math.sin(p.z * 240 + a * 1.0)) ** 6 * 0.0005

def d_amulet(p, s):
    if p.y < -gamulet.T * 0.3:                        # front face only (local space, -Y = front)
        return gamulet.relief(p.x, p.z)
    return bc.d_gold(p, s) * 0.3

def make_d_plaque(plq):
    C = [(Vector(q[0:3]), Vector(q[3:6]).normalized(), q[6]) for q in plq]
    def d(p, s):
        c, n, r0 = min(C, key=lambda c: (p - c[0]).length)
        v = p - c; v = v - n * v.dot(n)
        x = n.orthogonal().normalized(); y = n.cross(x)
        r = v.length / r0; a = math.atan2(v.dot(y), v.dot(x))
        h = 0.0
        h += max(0.0, 1 - abs(r - 0.82) / 0.07) * 0.0005                       # rim ring
        h += max(0.0, math.cos(a * 8)) ** 2 * max(0.0, 1 - abs(r - 0.52) / 0.20) * 0.0006   # eight petals
        h += max(0.0, 1 - r / 0.18) * 0.0007                                    # centre boss
        ph = (a / (2 * math.pi) * 18) % 1.0
        h += max(0.0, 1 - math.hypot((ph - 0.5) * 0.35, (r - 0.93) * 2.2) / 0.12) * 0.0004  # bead ring
        return h + bc.d_gold(p, s) * 0.3
    return d

bc.setup_cycles(8)
lows_all = [o for o in bpy.data.objects if o.type == 'MESH']

def pack(objs, margin=0.002):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
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

def set_objs(tset):
    mname = SETS[tset]
    return [o for o in lows_all if o.data.materials and o.data.materials[0].name == mname and not o.get('bake_skip')]

for tset in WANT:
    objs = set_objs(tset)
    print(tset, [o.name for o in objs], flush=True)
    if objs: pack(objs)
    print('packed', tset, flush=True)
copy_mirror_uvs()
bpy.ops.wm.save_mainfile()
if PACK_ONLY:
    sys.exit(0)

for o in lows_all:
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, False)

for tset in WANT:
    objs = set_objs(tset)
    size = SIZES.get(tset, SIZE)
    pairs = []; hmats = []
    for i, o in enumerate(objs):
        k = kind_of(o.name)
        if not k: print('no kind for', o.name); continue
        shader, kw, disp, lvl = k
        if disp == 'sheet': dfun = d_sheet
        elif disp == 'fine': dfun = d_fine
        elif disp == 'boot': dfun = d_boot
        elif disp == 'sole': dfun = d_sole
        elif disp == 'heel': dfun = d_heel
        elif disp == 'wrap': dfun = d_wrap
        elif disp == 'amulet': dfun = d_amulet
        elif disp == 'plaque': dfun = make_d_plaque(list(o['plaques']))
        else: dfun = disp
        h = bc.make_high(o, level=lvl, bevel=0.0005 if shader not in ('cloth2',) else 0.0, disp=dfun, seed=i * 1.7)
        h.matrix_world = o.matrix_world
        fn = getattr(gmats, shader, None) or getattr(mats, shader)
        mt = fn(o.name + '_HM', seed=i * 0.37, **kw)
        h.data.materials.clear(); h.data.materials.append(mt)
        hmats.append(mt)
        pairs.append((o, [h]))
    if not pairs: continue
    imgs = {c: bc.new_image(f'{tset}_{c}', size, data=(c != 'base')) for c in ('base', 'nrm', 'rough', 'metal', 'ao', 'curv')}
    bm = bc.bake_material(imgs['base'])
    saved = {o.name: list(o.data.materials) for o, _ in pairs}
    for o, _ in pairs:
        o.data.materials.clear(); o.data.materials.append(bm)
    ext = 0.010 if tset == 'T_Cloth' else (0.002 if tset == 'T_Amulet' else 0.005)
    ray = 0.025 if tset == 'T_Cloth' else (0.005 if tset == 'T_Amulet' else 0.012)
    bc.bake('NORMAL', pairs, imgs['nrm'], [bm], extrusion=ext, ray=ray, samples=4)
    bc.bake('AO', pairs, imgs['ao'], [bm], extrusion=ext, ray=ray, samples=64)
    for ch in ('base', 'rough', 'metal', 'curv'):
        bc.bake('EMIT', pairs, imgs[ch], [bm], extrusion=ext, ray=ray, samples=4, highs_mats=hmats, channel=ch)
    for o, _ in pairs:
        o.data.materials.clear()
        for m in saved[o.name]: o.data.materials.append(m)
    bc.write_set(tset, imgs['base'], imgs['nrm'], imgs['rough'], imgs['metal'], imgs['ao'], imgs['curv'])
    for o, hs in pairs:
        for h in hs: bpy.data.objects.remove(h)
    bpy.data.materials.remove(bm)
    print('BAKED', tset)
bpy.ops.wm.save_mainfile()
print('BAKE DONE', WANT)
