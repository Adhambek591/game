# blender -b out/armor_A.blend --python merge_parts.py -- out/armor_B.blend out/armor_low.blend
# Brings the pieces built in a second pass (real-size cuirass and kaftan) into the first-pass file.
import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:]; src, dst = a[0], a[1]
have = {o.name for o in bpy.data.objects}
with bpy.data.libraries.load(src) as (f, t):
    t.objects = [n for n in f.objects if n.startswith('SUR_') and n != 'SUR_BodyProxy']
for o in t.objects:
    if o is None: continue
    if o.name.split('.')[0] in have and o.name != o.name.split('.')[0]:
        old = bpy.data.objects.get(o.name.split('.')[0])
        if old: bpy.data.objects.remove(old)
        o.name = o.name.split('.')[0]
    bpy.context.scene.collection.objects.link(o)
print('MERGED', sorted(o.name for o in bpy.data.objects if o.name.startswith('SUR_')))
bpy.ops.wm.save_as_mainfile(filepath=dst)
