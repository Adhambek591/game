# After swap_parts.py left the refreshed pieces as "<name>.001" beside the old ones: keep the new, drop the old, restore
# names, materials and UE groups. blender -b out/armor_low.blend --python fix_swap.py
import bpy
MAT = lambda n: 'M_Lamellar' if n.endswith('_Lamellar') else ('M_Trim' if n.endswith(('_Trim', '_Lace')) or n == 'SUR_Coat_Border' else ('M_Cloth' if n.startswith(('SUR_Trousers', 'SUR_Coat', 'SUR_Robe_Torso')) or n == 'SUR_Helmet_Plume' else 'M_Armor'))
def grp(n):
    if n.startswith(('SUR_Helmet', 'SUR_Aventail')): return 'Head', 'head'
    if n.startswith(('SUR_Pauldron', 'SUR_Bracer')): return 'Arms', 'clavicle_l'
    if n.startswith(('SUR_Robe', 'SUR_Coat', 'SUR_Trousers')): return 'Cloth', 'pelvis'
    if n.startswith('SUR_Boot'): return 'Legs', 'calf_l'
    return 'Torso', 'spine_03'
for o in [o for o in bpy.data.objects if o.name.startswith('SUR_') and '.' in o.name]:
    base = o.name.split('.')[0]; old = bpy.data.objects.get(base)
    if old is not None and old is not o: bpy.data.objects.remove(old)
    o.name = base; o.data.materials.clear(); o.data.materials.append(bpy.data.materials[MAT(base)]); o['ue_group'], o['ue_follow_bone'] = grp(base)
    print('FIXED', o.name, MAT(base), len(o.data.vertices))
for o in sorted([o for o in bpy.data.objects if o.name.startswith('SUR_') and o.name != 'SUR_BodyProxy'], key=lambda o: o.name):
    print('PIECE %-28s %-11s %-6s %6d' % (o.name, o.data.materials[0].name if o.data.materials else '-', o.get('ue_group'), len(o.data.vertices)))
bpy.ops.wm.save_mainfile()
