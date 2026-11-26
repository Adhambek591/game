# armor_C.blend (preview materials) -> armor_low.blend ready for the bakes, the export and the skinning:
# pipeline materials by piece (M_Lamellar = plate atlas, M_Trim = trim sheet, M_Armor / M_Cloth = unique 4K bakes),
# UE group + follow bone per piece, UVs for the pieces that have none.
# blender -b out/armor_C.blend --python finalize_c.py
import bpy, os, math
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
def M(name, col):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.diffuse_color = (*col, 1); return m
MATS = {'M_Lamellar': M('M_Lamellar', (0.36, 0.37, 0.40)), 'M_Trim': M('M_Trim', (0.16, 0.08, 0.04)), 'M_Armor': M('M_Armor', (0.25, 0.20, 0.16)), 'M_Cloth': M('M_Cloth', (0.20, 0.12, 0.07))}
def mat_of(n):
    if n.endswith('_Lamellar'): return 'M_Lamellar'
    if n.endswith(('_Trim', '_Lace')) or n in ('SUR_Coat_Border', 'SUR_Boot_Straps_L', 'SUR_Boot_Straps_R'): return 'M_Trim'
    if n in ('SUR_Robe_Torso', 'SUR_Coat', 'SUR_Trousers', 'SUR_Helmet_Plume'): return 'M_Cloth'
    return 'M_Armor'
def group_of(n):
    if n.startswith(('SUR_Helmet', 'SUR_Aventail')): return 'Head', 'head'
    if n.startswith(('SUR_Pauldron', 'SUR_Bracer')): return 'Arms', 'clavicle_l'
    if n.startswith(('SUR_Robe', 'SUR_Coat', 'SUR_Trousers')): return 'Cloth', 'pelvis'
    if n.startswith('SUR_Boot'): return 'Legs', 'calf_l'
    return 'Torso', 'spine_03'
n_uv = 0
for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('SUR_') and o.name != 'SUR_BodyProxy']:
    mn = mat_of(o.name); g, b = group_of(o.name)
    o.data.materials.clear(); o.data.materials.append(MATS[mn]); o['ue_group'] = g; o['ue_follow_bone'] = b
    for p in o.data.polygons: p.material_index = 0
    if not o.data.uv_layers or mn in ('M_Armor', 'M_Cloth') and not o.name.startswith(('SUR_Boot', 'SUR_Trousers', 'SUR_Coat', 'SUR_WaistGuard', 'SUR_Tassets_Backing', 'SUR_Aventail_Backing', 'SUR_Helmet_Bowl')):
        # islands for the unique bakes (the bake script re-unwraps them from these seams and packs them)
        for x in bpy.context.view_layer.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        if not o.data.uv_layers: o.data.uv_layers.new(name='UVMap')
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(72), island_margin=0.002); bpy.ops.object.mode_set(mode='OBJECT'); n_uv += 1
    print('PIECE %-26s %-10s %-6s verts %6d tris %6d' % (o.name, mn, g, len(o.data.vertices), sum(len(p.vertices) - 2 for p in o.data.polygons)))
print('FINALIZE: smart-unwrapped', n_uv, 'pieces; total tris', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('SUR_') and o.name != 'SUR_BodyProxy'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'armor_low.blend'))
