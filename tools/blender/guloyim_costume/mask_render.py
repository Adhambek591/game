# Orthographic flat class masks of the costume for the silhouette match against the turnaround (moslash.py).
# blender -b out/costume_low.blend --python mask_render.py -- <outdir>
# 500 px per metre, camera centre z = 0.85, floor (sole bottom, z = -0.015) on row 907.5; arms rendered in their own
# colour so they can be left out (the turnaround's arms hang close to the body, the MetaHuman rest pose is an A-pose).
import bpy, sys, os, math
from mathutils import Matrix
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTD = a[0] if a else r"F:\qirq-qiz\tools\blender\guloyim_costume\out\moslash"
os.makedirs(OUTD, exist_ok=True)
PXM, W, H, ZC = 500, 800, 950, 0.85
CLS = {'blue': (0, 0, 1), 'brown': (0.5, 0.25, 0.0), 'grey': (0.5, 0.5, 0.5), 'skin': (1.0, 0.78, 0.6), 'arm': (0.0, 1.0, 0.0)}
ARM = ('Sleeve', 'Bracer', 'Pauldron')
def cls(o):
    n = o.name
    if n == 'GUL_Body':
        return 'skin'
    if any(k in n for k in ARM): return 'arm'
    m = o.data.materials[0].name if o.data.materials else ''
    if m == 'M_Cloth' and 'Trousers' not in n: return 'blue'
    if m in ('M_Lamellar', 'M_Jewel', 'M_Amulet'): return 'grey'
    return 'brown'
body = bpy.data.objects.get('GUL_Body')
if body:
    # hands / arms of the body belong to the arm class (A-pose); keep head, neck, legs as skin
    import bmesh
    gname = {g.index: g.name for g in body.vertex_groups}
    me = body.data
    arm_v = set()
    for v in me.vertices:
        if v.groups:
            g = gname.get(max(v.groups, key=lambda g: g.weight).group, '')
            if g.startswith(('upperarm', 'lowerarm', 'hand', 'thumb', 'index_', 'middle_', 'ring_', 'pinky')) and 'toe' not in g:
                arm_v.add(v.index)
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    armgeo = [bm.verts[i] for i in arm_v]
    bmesh.ops.delete(bm, geom=armgeo, context='VERTS')
    bm.to_mesh(me); bm.free()
scb = bpy.data.objects.get('GUL_Scabbard')
if scb and scb.get('sheath_matrix'):
    MS = Matrix([list(r) for r in scb['sheath_matrix']])
    for o in bpy.data.objects:
        if o.name.startswith('GUL_Sabre'): o.matrix_world = MS @ o.matrix_world
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.color = (*CLS[cls(o)], 1)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sh = sc.display.shading
sh.light = 'FLAT'; sh.color_type = 'OBJECT'; sh.show_cavity = False; sh.show_shadows = False; sh.show_specular_highlight = False
sh.background_type = 'VIEWPORT'; sh.background_color = (0, 0, 0)
sc.view_settings.view_transform = 'Standard'
sc.render.film_transparent = False
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = 100
sc.render.filter_size = 0.0
cam = bpy.data.cameras.new('mk'); co = bpy.data.objects.new('mk', cam); sc.collection.objects.link(co); sc.camera = co
cam.type = 'ORTHO'; cam.ortho_scale = H / PXM
for name, loc, rot in (('front', (0, -5, ZC), (math.pi / 2, 0, 0)), ('side', (5, 0, ZC), (math.pi / 2, 0, math.pi / 2))):
    co.location, co.rotation_euler = loc, rot
    sc.render.filepath = os.path.join(OUTD, 'mask_' + name + '.png')
    bpy.ops.render.render(write_still=True)
print('MASKS DONE')
