# FBX per piece group + manifest for UE 5.8 (skin weights are transferred from the MetaHuman body in UE).
# blender -b out/costume_low.blend --python export.py
import bpy, os, json
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
LM = json.load(open(os.path.join(OUT, 'landmarks.json')))
GROUPS = {'Head': 'SK_Guloyim_Headband', 'Torso': 'SK_Guloyim_Torso', 'Arms': 'SK_Guloyim_Arms', 'Legs': 'SK_Guloyim_Legs',
          'Cloth': 'SK_Guloyim_Cloth', 'Scarf': 'SK_Guloyim_Scarf', 'Weapon': 'SM_Guloyim_Sabre', 'Amulet': 'SM_Guloyim_Amulet'}
TEXSET = {'M_Lamellar': 'T_Lamellar', 'M_Trim': 'T_Trim', 'M_Armor': 'T_Armor', 'M_Cloth': 'T_Cloth',
          'M_Jewel': 'T_Jewel', 'M_Weapon': 'T_Weapon', 'M_Amulet': 'T_Amulet'}

for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name == 'GUL_Body':
        bpy.data.objects.remove(o)
parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.get('ue_group')]
scb = bpy.data.objects.get('GUL_Scabbard')
manifest = {'character': 'Guloyim (Gulayim) - costume + armour, LOD0',
            'units': 'metres in Blender, exported with unit scale -> centimetres in UE',
            'axes': 'Blender: +Z up, -Y front (same as the MetaHuman FBX round trip); default FBX axes',
            'pose': 'A-pose of her final MetaHuman body (%s, %.1f cm); body NOT included, not re-rigged' % (os.path.basename(LM.get('source', '?')), LM.get('height', 0) * 100),
            'normal_maps': 'DirectX (green down) - import in UE as-is',
            'orm': 'R=AO G=Roughness B=Metallic (linear)',
            'cloth_detail_normal': 'T_ClothWeave_Normal (tiling, DirectX) on M_Cloth (~64 mm weave tile), blend over T_Cloth_Normal',
            'chaos_cloth': 'GUL_Tunic_Skirt and GUL_Headscarf are single-layer quad grids (2-3 cm) for Chaos Cloth: paint max distance, two-sided material',
            'boot_soles': 'riding boots: 1.5 cm layered sole + 2.5 cm stacked heel; ground (sole bottom) at z = -1.5 cm below the MetaHuman foot: lift the root by 1.5 cm (heel seat is raised inside the boot)',
            'sabre': 'SM_Guloyim_Sabre pivot = grip centre, blade +Z, spine +Y (socket in hand_r). sheathed transform below',
            'sheath_matrix_world': [list(r) for r in scb['sheath_matrix']] if scb else None,
            'amulet': 'SM_Guloyim_Amulet: the ONE gold triangle pointing down (gamulet.py); pivot = bail ring centre; attach to spine_05 socket',
            'pieces': {}, 'groups': {}}
for o in parts:
    bn = o['ue_follow_bone']
    if o['ue_group'] == 'Weapon':
        piv = Vector((0, 0, 0))
    elif o['ue_group'] == 'Amulet':
        # exported in its own canonical space (bail at origin, -Y front); where it hangs on her chest:
        manifest['amulet_world_matrix'] = [list(r) for r in o.matrix_world]
        o.matrix_world = Matrix.Identity(4)
        piv = Vector((0, 0, 0))
    else:
        piv = Vector(LM['bones'][bn]['head']) if bn in LM['bones'] else Vector((0, 0, 0))
    o.data.transform(Matrix.Translation(-piv))
    o.matrix_world = Matrix.Translation(piv)
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    manifest['pieces'][o.name] = {'group': o['ue_group'], 'follow_bone': bn, 'pivot_cm': [round(c * 100, 2) for c in piv],
                                  'tris': tris, 'quads_only': all(len(p.vertices) == 4 for p in o.data.polygons),
                                  'material': o.data.materials[0].name, 'textures': TEXSET.get(o.data.materials[0].name),
                                  'chaos_cloth': bool(o.get('chaos_cloth'))}
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
json.dump(manifest, open(os.path.join(OUT, 'guloyim_costume_manifest.json'), 'w'), indent=1)
print('TOTAL TRIS', manifest['total_tris'])
