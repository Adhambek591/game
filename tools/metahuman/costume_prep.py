# Geometry-only hand-off of the Higgsfield costume (costume + skirt shells from MH_gulayim.glb) to Unreal.
# NO weights / armature here: it is exported as a plain static mesh in the MetaHuman body's space;
# skinning is done inside Unreal (Geometry Script transfer of the MetaHuman body's own weights).
# Also prints alignment against the UE-exported MetaHuman FullBody and renders an overlay check.
# Run: blender -b --python costume_prep.py -- <MH_gulayim.glb> <MH_FullBody.fbx> <out_dir>
import bpy, sys, os, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; GLB, FULL, OUTD = a
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
cos = [o for o in bpy.data.objects if o.type == 'MESH' and o.name in ('costume', 'skirt')]
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o not in cos: bpy.data.objects.remove(o, do_unlink=True)
for o in cos:
    for m in list(o.modifiers): o.modifiers.remove(m)
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); o.select_set(False)
    o.vertex_groups.clear()
for o in list(bpy.data.objects):
    if o.type == 'ARMATURE': bpy.data.objects.remove(o, do_unlink=True)
def bb(objs):
    vs = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    return Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))), Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
print('COS bb', bb(cos))
before = set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=FULL)
new = [o for o in bpy.data.objects if o not in before]
body = [o for o in new if o.type == 'MESH' and o.name.endswith('LOD0')] or [o for o in new if o.type == 'MESH']
for o in new:
    if o.type == 'MESH' and o not in body: bpy.data.objects.remove(o, do_unlink=True)
print('MH bb', bb(body), [o.name for o in body])
# export costume only (the MetaHuman body is already in Unreal)
for o in bpy.data.objects: o.select_set(o in cos)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUTD, 'gulayim_costume_static.fbx'), use_selection=True, object_types={'MESH'},
                         apply_unit_scale=True, global_scale=1.0, axis_forward='-Y', axis_up='Z', mesh_smooth_type='FACE', path_mode='COPY', embed_textures=True, add_leaf_bones=False)
# overlay renders (front / side) to check alignment
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 900; sc.render.resolution_y = 1000
sc.display.shading.color_type = 'OBJECT'
for o in cos: o.color = (0.2, 0.4, 1.0, 0.6)
for o in body: o.color = (1.0, 0.6, 0.5, 1)
sc.display.shading.show_xray = True; sc.display.shading.xray_alpha = 0.5
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.0
for nm, loc, rot in [('front', (0, -5, 0.9), (math.pi/2, 0, 0)), ('side', (5, 0, 0.9), (math.pi/2, 0, math.pi/2))]:
    cam.location = loc; cam.rotation_euler = rot
    sc.render.filepath = os.path.join(OUTD, f'costume_align_{nm}.png'); bpy.ops.render.render(write_still=True)
