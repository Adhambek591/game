# Refresh pieces of the baked armor_low.blend from a rebuilt armor_C.blend without touching the packed UVs of the others:
# plates and laces (atlas / trim-sheet UVs), bindings, and new cloth pieces (then re-bake T_Cloth only).
# blender -b out/armor_low.blend --python swap_parts.py -- <suffix or name>,<...>
import bpy, os, sys
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); src = os.path.join(OUT, 'armor_C.blend'); keys = sys.argv[sys.argv.index('--') + 1].split(',')
MAT = lambda n: 'M_Lamellar' if n.endswith('_Lamellar') else ('M_Trim' if n.endswith(('_Trim', '_Lace')) or n == 'SUR_Coat_Border' else ('M_Cloth' if n.startswith(('SUR_Trousers', 'SUR_Coat', 'SUR_Robe_Torso')) else 'M_Armor'))
def grp(n):
    if n.startswith(('SUR_Helmet', 'SUR_Aventail')): return 'Head', 'head'
    if n.startswith(('SUR_Pauldron', 'SUR_Bracer')): return 'Arms', 'clavicle_l'
    if n.startswith(('SUR_Robe', 'SUR_Coat', 'SUR_Trousers')): return 'Cloth', 'pelvis'
    if n.startswith('SUR_Boot'): return 'Legs', 'calf_l'
    return 'Torso', 'spine_03'
with bpy.data.libraries.load(src) as (f, t): want = [n for n in f.objects if n.startswith('SUR_') and any(n.endswith(k) or n == k for k in keys)]; t.objects = want
for n in want:
    old = [o for o in bpy.data.objects if o.name == n and o not in t.objects]
    for o in old: bpy.data.objects.remove(o)
for o in t.objects:
    o.name = o.name.split('.')[0]; bpy.context.scene.collection.objects.link(o); o.data.materials.clear(); o.data.materials.append(bpy.data.materials[MAT(o.name)]); o['ue_group'], o['ue_follow_bone'] = grp(o.name)
    print('SWAPPED', o.name, len(o.data.vertices), MAT(o.name), 'uv', bool(o.data.uv_layers))
bpy.ops.wm.save_mainfile()
