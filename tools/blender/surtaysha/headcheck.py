# UE check: skinned helmet with the head bone scaled 1.0549 (as UE does), front + side close-ups of the face
# blender -b out/skinned/surtaysha_skinned.blend --python headcheck.py
import bpy, math, os
from mathutils import Vector
OUT = r"F:\qirq-qiz\tools\blender\surtaysha\out\skinned"
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
arm.pose.bones['head'].scale = (1.0549, 1.0549, 1.0549)
bpy.context.view_layer.update()
# the BodyDirect proxy carries the already-scaled MetaHuman head: stands in for UE's scaled head
with bpy.data.libraries.load("F:/qirq-qiz/tools/blender/surtaysha/out/proxy.blend") as (src, dst):
    dst.objects = ['SUR_BodyProxy']
for o in dst.objects:
    if o: bpy.context.scene.collection.objects.link(o)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 900, 900
cd = bpy.data.cameras.new('hc'); co = bpy.data.objects.new('hc', cd); sc.collection.objects.link(co); sc.camera = co
cd.type = 'ORTHO'; cd.ortho_scale = 0.62
h = arm.matrix_world @ arm.data.bones['head'].head_local
for n, loc, rot in (('front', (0, -3, h.z + 0.05), (math.pi / 2, 0, 0)), ('side', (3, 0, h.z + 0.05), (math.pi / 2, 0, math.pi / 2))):
    co.location, co.rotation_euler = loc, rot
    sc.render.filepath = os.path.join(OUT, 'headcheck_ue_%s.png' % n); bpy.ops.render.render(write_still=True)
print('HEADCHECK DONE')
