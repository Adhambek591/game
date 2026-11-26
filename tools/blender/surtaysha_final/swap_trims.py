# The bindings (trim-sheet tubes) are not part of the unique bakes: after a rebuild of armor_C.blend they can be swapped
# into the baked armor_low.blend without touching the packed UVs of the baked pieces.
# blender -b out/armor_low.blend --python swap_trims.py
import bpy, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); src = os.path.join(OUT, 'armor_C.blend')
names = [o.name for o in bpy.data.objects if o.name.startswith('SUR_') and (o.name.endswith('_Trim') or o.name == 'SUR_Coat_Border')]
props = {n: (bpy.data.objects[n].get('ue_group'), bpy.data.objects[n].get('ue_follow_bone')) for n in names}
for n in names: bpy.data.objects.remove(bpy.data.objects[n])
with bpy.data.libraries.load(src) as (f, t): t.objects = [n for n in names if n in f.objects]
mt = bpy.data.materials['M_Trim']
for o in t.objects:
    bpy.context.scene.collection.objects.link(o); o.data.materials.clear(); o.data.materials.append(mt); o['ue_group'], o['ue_follow_bone'] = props[o.name]
    print('SWAPPED', o.name, len(o.data.vertices), 'uv', bool(o.data.uv_layers))
bpy.ops.wm.save_mainfile()
