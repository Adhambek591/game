# clay/colour preview of the left boot (workbench): blender -b <blend> --python boot_ref/preview.py -- out_prefix
import bpy, sys, math
from mathutils import Vector
pre = sys.argv[sys.argv.index('--') + 1]
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.show_shadows = False
sh.show_object_outline = False
sc.display.render_aa = '8'
COL = {'SUR_Boot_Shaft': (0.22, 0.24, 0.26), 'SUR_Boot_Straps': (0.20, 0.11, 0.06), 'SUR_Boot_Sole': (0.10, 0.08, 0.07), 'SUR_Boot': (0.26, 0.17, 0.12),
       'SUR_Trousers': (0.08, 0.07, 0.06)}
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    key = next((k for k in COL if o.name.startswith(k + '_')), None)
    if key is None:
        o.hide_render = not o.name.startswith('SUR_Coat'); continue
    m = bpy.data.materials.new('pv_' + o.name); m.diffuse_color = (*COL[key], 1)
    o.data.materials.clear(); o.data.materials.append(m)
O = bpy.data.objects['SUR_Boot_L']['boot_origin']
c = Vector((O[0], O[1] - 0.09, 0.21))
cam = bpy.data.cameras.new('pc'); co = bpy.data.objects.new('pc', cam); sc.collection.objects.link(co); sc.camera = co
cam.lens = 85
sc.render.resolution_x = 1000; sc.render.resolution_y = 1000
sc.render.film_transparent = False
w = bpy.data.worlds.new('W'); sc.world = w; w.color = (0.5, 0.5, 0.5)
for n, az, el in (('f', 0, 8), ('s', 90, 3), ('q', 38, 10), ('b', 180, 4), ('qi', -40, 14), ('t', 20, 55), ('u', 30, -25)):
    a = math.radians(az); e = math.radians(el); d = 1.45
    co.location = c + Vector((math.sin(a) * math.cos(e) * d, -math.cos(a) * math.cos(e) * d, math.sin(e) * d))
    co.rotation_euler = (c - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = pre + '_' + n + '.png'; bpy.ops.render.render(write_still=True)
