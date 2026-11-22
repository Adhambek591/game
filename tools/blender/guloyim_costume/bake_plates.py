# Guloyim lamellar atlas: 40 variants of her ONE (smaller) plate with two rivet heads + 4 lace variants, high -> low, 4K.
# blender -b --factory-startup --python bake_plates.py -- [size]
import bpy, sys, os, math, random, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from mathutils import Vector, Matrix, noise
import bake_common as bc
import mats
import gsk as sk

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SIZE = int(args[0]) if args else 4096
bpy.ops.wm.read_factory_settings(use_empty=True)
bc.setup_cycles(4)

pairs = []
hmats = []
lows = []
for i in range(44):
    is_lace = i >= 40
    if is_lace:
        mb = sk.lace_mesh(tile=(i - 40, 5))
    else:
        mb = sk.plate_mesh(tile=(i % sk.ATLAS_COLS, i // sk.ATLAS_COLS))
    low = mb.build('PL_%02d' % i, [], col='BAKE')
    low.location = ((i % 11) * 0.05, (i // 11) * 0.09, 0)
    bpy.context.view_layer.update()
    seed = i * 1.37
    if is_lace:
        def disp(p, s):
            return noise.noise(p * 400 + Vector((s, s, s))) * 0.00008
        h = bc.make_high(low, level=3, bevel=0.0, disp=disp, seed=seed)
        mt = mats.leather('LACE_%d' % i, seed=seed, tint=(0.075, 0.04, 0.022), wear=0.6)
    else:
        lw, lh = sk.PLATE_W, sk.PLATE_H
        rnd = random.Random(i)
        nicks = [(rnd.uniform(-lw / 2, lw / 2), rnd.choice([0.0, lh]) if rnd.random() < 0.5 else rnd.uniform(0, lh)) for _ in range(rnd.randint(1, 4))]
        def disp(p, s, nicks=nicks, lw=lw, lh=lh, low=low):
            q = p                    # mesh-local plate coordinates
            # dents and hammer marks on the face
            d = -max(0.0, noise.noise(q * 70 + Vector((s, 2 * s, 3 * s))) - 0.15) * 0.00055
            d += noise.noise(q * 260 + Vector((s, s, 0))) * 0.00006
            # edge-wear nicks: pull the surface in near random rim points
            for nx, ny in nicks:
                dd = math.hypot(q.x - nx, q.y - ny)
                if dd < 0.003: d -= (1 - dd / 0.003) * 0.0005
            # lace slot dimple under the lace + two domed rivet heads up the centre line
            dd = math.hypot((q.x) * 2.2, q.y - lh * 0.25)
            if dd < 0.0045 and q.z > 0.001: d -= (1 - dd / 0.0045) ** 2 * 0.0005
            for hy in (lh * 0.58, lh * 0.84):
                dd = math.hypot(q.x, q.y - hy)
                if q.z > 0.001:
                    if dd < 0.0021: d += (1 - (dd / 0.0021) ** 2) ** 0.5 * 0.00075
                    elif dd < 0.0030: d -= (1 - (dd - 0.0021) / 0.0009) * 0.00012
            return d
        h = bc.make_high(low, level=4, bevel=0.0003, disp=disp, seed=seed)
        mt = mats.iron('PLATE_%d' % i, seed=seed, tint=(0.21, 0.22, 0.24), rust=0.45, rough=0.44)
    h.data.materials.clear(); h.data.materials.append(mt)
    hmats.append(mt)
    pairs.append((low, [h]))
    lows.append(low)

for o in lows:
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, False)
imgs = {c: bc.new_image(f'T_Lamellar_{c}', SIZE, data=(c != 'base')) for c in ('base', 'nrm', 'rough', 'metal', 'ao', 'curv')}
bm = bc.bake_material(imgs['base'])
for o in lows:
    o.data.materials.clear(); o.data.materials.append(bm)
for o in lows: o.select_set(False)
bc.select_only(lows, lows[0]); bpy.ops.object.join()
jl = bpy.context.view_layer.objects.active
for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
    setattr(jl, a, False)
jp = [(jl, [p[1][0] for p in pairs])]
for kind, key, smp, ch in (('NORMAL', 'nrm', 4, None), ('AO', 'ao', 64, None), ('EMIT', 'base', 4, 'base'),
                           ('EMIT', 'rough', 4, 'rough'), ('EMIT', 'metal', 4, 'metal'), ('EMIT', 'curv', 4, 'curv')):
    bc.bake(kind, jp, imgs[key], [bm], extrusion=0.003, ray=0.006, samples=smp, highs_mats=hmats if ch else None, channel=ch)
bc.write_set('T_Lamellar', imgs['base'], imgs['nrm'], imgs['rough'], imgs['metal'], imgs['ao'], imgs['curv'])
bpy.data.libraries.write(os.path.join(bc.TEX, '..', 'high_T_Lamellar.blend'), set(p[1][0] for p in pairs) | {jl}, fake_user=True)
print('PLATES DONE')
