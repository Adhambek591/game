# FBX per piece group + manifest for UE (weight transfer from the MetaHuman body is done in UE).
# blender -b out/armor_low.blend --python export.py
import bpy, os, json, math
from mathutils import Vector, Matrix
OUT = r"F:\qirq-qiz\tools\blender\surtaysha\out"
LM = json.load(open(os.path.join(OUT, 'landmarks.json')))
GROUPS = {'Head': 'SK_Surtaysha_Head', 'Torso': 'SK_Surtaysha_Torso', 'Arms': 'SK_Surtaysha_Arms',
          'Legs': 'SK_Surtaysha_Legs', 'Cloth': 'SK_Surtaysha_Cloth', 'Weapon': 'SM_Surtaysha_Sabre'}
TEXSET = {'M_Lamellar': 'T_Lamellar', 'M_Trim': 'T_Trim', 'M_Helmet': 'T_Helmet', 'M_Armor': 'T_Armor',
          'M_Cloth': 'T_Cloth', 'M_Weapon': 'T_Weapon', 'M_Plume': 'T_Plume'}

parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.get('ue_group')]
manifest = {'units': 'metres in Blender, exported with unit scale -> centimetres in UE',
            'axes': 'Blender: +Z up, -Y front (same as the MetaHuman FBX round trip); default FBX axes',
            'pose': 'A-pose, aligned to a 185 cm burly male proxy built from the MetaHuman skeleton',
            'normal_maps': 'DirectX (green down) - import in UE as-is',
            'orm': 'R=AO G=Roughness B=Metallic (linear)',
            'pieces': {}, 'groups': {}}
for o in parts:
    bn = o['ue_follow_bone']
    if o['ue_group'] == 'Weapon':
        piv = Vector((0, 0, 0))          # grip centre, blade along +Z
    else:
        piv = Vector(LM['bones'][bn]['head']) if bn in LM['bones'] else Vector((0, 0, 0))
    # pivot at the follow bone's head, world position unchanged
    o.data.transform(Matrix.Translation(-piv))
    o.matrix_world = Matrix.Translation(piv)
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    manifest['pieces'][o.name] = {'group': o['ue_group'], 'follow_bone': bn, 'pivot_cm': [round(c * 100, 2) for c in piv],
                                  'tris': tris, 'material': o.data.materials[0].name,
                                  'textures': TEXSET.get(o.data.materials[0].name)}
for g, fname in GROUPS.items():
    objs = [o for o in parts if o['ue_group'] == g]
    if not objs: continue
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    path = os.path.join(OUT, fname + '.fbx')
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={'MESH'}, apply_unit_scale=True,
                             apply_scale_options='FBX_SCALE_UNITS', mesh_smooth_type='FACE', use_tspace=True,
                             use_mesh_modifiers=True, add_leaf_bones=False, path_mode='STRIP', axis_forward='-Z', axis_up='Y')
    manifest['groups'][fname] = {'file': fname + '.fbx', 'pieces': [o.name for o in objs],
                                 'tris': sum(manifest['pieces'][o.name]['tris'] for o in objs)}
    print('EXPORT', path, manifest['groups'][fname]['tris'])
manifest['total_tris'] = sum(p['tris'] for p in manifest['pieces'].values())
json.dump(manifest, open(os.path.join(OUT, 'surtaysha_manifest.json'), 'w'), indent=1)
print('TOTAL TRIS', manifest['total_tris'])
