# Blender: athletic standard female body (MPFB) at the author's character height, exported as the MetaHuman body-conform
# target (warrior maidens are slim and fit; Guloyim is tall). Same FBX axes as prep_target.py.
# Run: blender -b --python prep_body.py -- <out.fbx> <height_m> [muscle weight proportions]
import bpy, bmesh, sys, addon_utils
a = sys.argv[sys.argv.index('--') + 1:]; out = a[0]; H = float(a[1])
mus, wt, prop = (float(x) for x in (a[2:5] if len(a) >= 5 else (.78, .3, 1.0)))
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties
bm = HumanService.create_human()
for k, v in {'gender': 0.0, 'age': .45, 'muscle': mus, 'weight': wt, 'proportions': prop, 'height': .65, 'cupsize': .35, 'firmness': .7, 'asian': .55, 'caucasian': .4, 'african': .05}.items():
    HumanObjectProperties.set_value(k, v, entity_reference=bm)
TargetService.reapply_macro_details(bm); TargetService.bake_targets(bm)
for m in list(bm.modifiers): bm.modifiers.remove(m)
b = bmesh.new(); b.from_mesh(bm.data); gi = bm.vertex_groups['body'].index; dl = b.verts.layers.deform.verify()
bmesh.ops.delete(b, geom=[v for v in b.verts if v[dl].get(gi, 0) < .5], context='VERTS'); b.to_mesh(bm.data); b.free()
top = max(v.co.z for v in bm.data.vertices); k = H / top
bm.scale = (k, k, k); bpy.context.view_layer.objects.active = bm; bm.select_set(True); bpy.ops.object.transform_apply(scale=True)
bpy.ops.export_scene.fbx(filepath=out, use_selection=True, apply_unit_scale=True, global_scale=1.0, axis_forward='-Y', axis_up='Z', object_types={'MESH'}, mesh_smooth_type='FACE', add_leaf_bones=False)
print('BODY', out, 'verts', len(bm.data.vertices), 'height', H)
