# Fast workbench check views of the low meshes: blender -b out/costume_low.blend --python quickshot.py -- <prefix> [zc ortho] [views]
import bpy, sys, math
a = sys.argv[sys.argv.index('--') + 1:]
pre = a[0]
zc = float(a[1]) if len(a) > 1 else 0.86
osc = float(a[2]) if len(a) > 2 else 1.9
views = a[3].split(',') if len(a) > 3 else ['f', 's', 'b', 'q']
COL = {'M_Cloth': (0.06, 0.10, 0.45), 'M_Lamellar': (0.32, 0.33, 0.35), 'M_Trim': (0.25, 0.12, 0.06), 'M_Armor': (0.30, 0.20, 0.13),
       'M_Jewel': (0.75, 0.75, 0.78), 'M_Weapon': (0.18, 0.12, 0.08), 'M_Amulet': (0.95, 0.70, 0.2)}
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    if o.name == 'GUL_Body': o.color = (0.5, 0.5, 0.5, 1)
    elif o.data.materials: o.color = (*COL.get(o.data.materials[0].name, (1, 0, 1)), 1)
    if o.get('sim_mesh'): o.hide_render = True
from mathutils import Matrix
scb = bpy.data.objects.get('GUL_Scabbard')
if scb and scb.get('sheath_matrix'):
    MS = Matrix([list(r) for r in scb['sheath_matrix']])
    for o in bpy.data.objects:
        if o.name.startswith('GUL_Sabre'): o.matrix_world = MS @ o.matrix_world
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'OBJECT'
sc.display.shading.show_cavity = True
sc.render.resolution_x = 1000; sc.render.resolution_y = 1300 if osc > 1 else 1000
cam = bpy.data.cameras.new('qc'); co = bpy.data.objects.new('qc', cam); sc.collection.objects.link(co); sc.camera = co
cam.type = 'ORTHO'; cam.ortho_scale = osc
V = {'f': ((0, -5, zc), (math.pi / 2, 0, 0)), 's': ((5, 0, zc), (math.pi / 2, 0, math.pi / 2)), 'b': ((0, 5, zc), (math.pi / 2, 0, math.pi)),
     'q': ((-3.5, -3.5, zc), (math.pi / 2, 0, -math.pi / 4)), 'r': ((-5, 0, zc), (math.pi / 2, 0, -math.pi / 2))}
for n in views:
    co.location, co.rotation_euler = V[n]
    sc.render.filepath = pre + '_' + n + '.png'; bpy.ops.render.render(write_still=True)
