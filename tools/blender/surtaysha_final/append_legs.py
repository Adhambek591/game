# bring the accepted fitted boots and trousers (armor_low.blend) into armor_C.blend so the whole outfit is seen together
import bpy,os
HERE=os.path.dirname(os.path.abspath(__file__));src=os.path.join(HERE,'out','armor_low.blend')
with bpy.data.libraries.load(src) as (f,t):
    names=[n for n in f.objects]
    print('LOW objects',names)
    t.objects=[n for n in f.objects if ('Trouser' in n or 'Boot' in n) and n not in bpy.data.objects]
for o in t.objects:
    if o: bpy.context.scene.collection.objects.link(o); print('APPENDED',o.name,len(o.data.vertices),[m.name for m in o.data.materials],tuple(round(x,3) for x in o.scale))
bpy.ops.wm.save_mainfile()
