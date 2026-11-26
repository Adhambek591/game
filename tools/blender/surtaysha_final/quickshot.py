# quick workbench views of a blend: blender -b file.blend --python quickshot.py -- out_prefix
import bpy, sys, math
from mathutils import Vector
pre=sys.argv[sys.argv.index('--')+1]
sc=bpy.context.scene
sc.render.engine='BLENDER_WORKBENCH'
sc.display.shading.light='STUDIO'; sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_cavity=True; sc.display.shading.cavity_type='BOTH'; sc.display.shading.show_specular_highlight=False
sc.display.shading.show_backface_culling=True
sc.render.resolution_x=900; sc.render.resolution_y=1200
cam=bpy.data.cameras.new('qc'); co=bpy.data.objects.new('qc',cam); sc.collection.objects.link(co); sc.camera=co
cam.type='ORTHO'; cam.ortho_scale=2.0
views=[('f',(0,-5,0.95),(math.pi/2,0,0)),('s',(5,0,0.95),(math.pi/2,0,math.pi/2)),('b',(0,5,0.95),(math.pi/2,0,math.pi))]
if len(sys.argv)>sys.argv.index('--')+2:
    zc=float(sys.argv[sys.argv.index('--')+2]); cam.ortho_scale=float(sys.argv[sys.argv.index('--')+3])
    views=[(n,(p[0],p[1],zc),r) for n,p,r in views]+[('q',(3.5,-3.5,zc),(math.pi/2,0,math.pi/4))]
for n,p,r in views:
    co.location=p; co.rotation_euler=r
    sc.render.filepath=pre+'_'+n+'.png'; bpy.ops.render.render(write_still=True)
