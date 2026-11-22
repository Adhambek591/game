# UE 5.8: import Surtaysha's armour (Blender agent output) -> textures, PBR materials, one static mesh per piece.
# Pieces are rigidly attached to their follow bones on the MetaHuman body at render time (mh_film.py, QQ_ARMOUR=1).
import unreal, os, json, traceback
SRC = os.environ.get('QQ_ARM_SRC', 'F:/qirq-qiz/tools/blender/surtaysha/out'); DST = os.environ.get('QQ_ARM_DST', '/Game/QQ/Surt')
OUT = 'F:/qirq-qiz/tools/metahuman/out'
LOG = open(f'{OUT}/mh_armour_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQR ' + s)
AT = unreal.AssetToolsHelpers.get_asset_tools(); EAL = unreal.EditorAssetLibrary; MEL = unreal.MaterialEditingLibrary
MAN = json.load(open(f"{SRC}/{os.environ.get('QQ_ARM_MANIFEST', 'surtaysha_manifest.json')}"))
PREFIX = os.environ.get('QQ_ARM_PREFIX', 'Surt'); PJSON = os.environ.get('QQ_ARM_OUT', f'{OUT}/surt_pieces.json')
TINT = json.loads(os.environ.get('QQ_ARM_TINT', 'null')) or {}
IRON = json.loads(os.environ.get('QQ_ARM_IRON', 'null')) or {'Armor': (0.8, 1.12), 'Lamellar': (0.8, 1.12), 'Helmet': (0.88, 1.06)}   # author: darker, a bit rougher plate iron

def imp_tex():
    tasks = []
    for f in sorted(os.listdir(f'{SRC}/textures')):
        if not f.endswith('.png'): continue
        t = unreal.AssetImportTask(); t.filename = f'{SRC}/textures/{f}'; t.destination_path = f'{DST}/Tex'; t.automated = True; t.replace_existing = True; t.save = False
        tasks.append(t)
    AT.import_asset_tasks(tasks)
    for t in tasks:
        n = os.path.splitext(os.path.basename(t.filename))[0]; tex = unreal.load_asset(f'{DST}/Tex/{n}')
        if tex is None: log('tex missing', n); continue
        if n.endswith('_Normal'):
            tex.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_NORMALMAP); tex.set_editor_property('srgb', False)
            tex.set_editor_property('flip_green_channel', False)
        elif n.endswith('_ORM') or n.endswith('_Curvature'):
            tex.set_editor_property('compression_settings', unreal.TextureCompressionSettings.TC_MASKS); tex.set_editor_property('srgb', False)
        EAL.save_asset(tex.get_path_name())
    log('textures', len(tasks))

def tex(n): return unreal.load_asset(f'{DST}/Tex/{n}')

def make_mat(setname):
    name = f'M_{PREFIX}_{setname}'; p = f'{DST}/Mat/{name}'
    if EAL.does_asset_exist(p): EAL.delete_asset(p)
    m = AT.create_asset(name, f'{DST}/Mat', unreal.Material, unreal.MaterialFactoryNew())
    bc, nm, orm = tex(f'T_{setname}_BaseColor'), tex(f'T_{setname}_Normal'), tex(f'T_{setname}_ORM')
    dark, rough = IRON.get(setname, (1.0, 1.0))
    if setname == 'Plume':
        m.set_editor_property('blend_mode', unreal.BlendMode.BLEND_MASKED); m.set_editor_property('two_sided', True)
    s_bc = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -900, -200); s_bc.texture = bc
    mul = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -600, -200)
    MEL.connect_material_expressions(s_bc, 'RGB', mul, 'A')
    if setname in TINT:
        tc3 = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -800, -350); tc3.constant = unreal.LinearColor(*TINT[setname][:3], 1)
        MEL.connect_material_expressions(tc3, '', mul, 'B'); rough = TINT[setname][3] if len(TINT[setname]) > 3 else rough
    else: mul.set_editor_property('const_b', dark)
    CALM = os.environ.get('QQ_ARM_CALM', '').split(',')
    if setname in CALM:
        # neat dark iron: pull the albedo halfway to a flat dark iron colour (less rust / fleck contrast)
        iron = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -600, -380); iron.constant = unreal.LinearColor(0.055, 0.055, 0.06, 1)
        lp = MEL.create_material_expression(m, unreal.MaterialExpressionLinearInterpolate, -450, -250); lp.set_editor_property('const_alpha', 0.55)
        MEL.connect_material_expressions(mul, '', lp, 'A'); MEL.connect_material_expressions(iron, '', lp, 'B')
        MEL.connect_material_property(lp, '', unreal.MaterialProperty.MP_BASE_COLOR)
    else: MEL.connect_material_property(mul, '', unreal.MaterialProperty.MP_BASE_COLOR)
    if setname == 'Plume': MEL.connect_material_property(s_bc, 'A', unreal.MaterialProperty.MP_OPACITY_MASK)
    if nm:
        s_n = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -900, 100); s_n.texture = nm; s_n.sampler_type = unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL
        if setname == 'Cloth' and tex('T_ClothWeave_Normal'):
            # fine weave detail over the cloth normal (UV x 38)
            tc = MEL.create_material_expression(m, unreal.MaterialExpressionTextureCoordinate, -1200, 300); tc.set_editor_property('u_tiling', 38.0); tc.set_editor_property('v_tiling', 38.0)
            s_w = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -900, 300); s_w.texture = tex('T_ClothWeave_Normal'); s_w.sampler_type = unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL
            MEL.connect_material_expressions(tc, '', s_w, 'UVs')
            bl = MEL.create_material_expression(m, unreal.MaterialExpressionAdd, -600, 150)
            MEL.connect_material_expressions(s_n, 'RGB', bl, 'A'); MEL.connect_material_expressions(s_w, 'RGB', bl, 'B')
            nn = MEL.create_material_expression(m, unreal.MaterialExpressionNormalize, -450, 150); MEL.connect_material_expressions(bl, '', nn, '')
            MEL.connect_material_property(nn, '', unreal.MaterialProperty.MP_NORMAL)
        else:
            MEL.connect_material_property(s_n, 'RGB', unreal.MaterialProperty.MP_NORMAL)
    if orm:
        s_o = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -900, 500); s_o.texture = orm; s_o.sampler_type = unreal.MaterialSamplerType.SAMPLERTYPE_MASKS
        MEL.connect_material_property(s_o, 'R', unreal.MaterialProperty.MP_AMBIENT_OCCLUSION)
        rm = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -600, 550); rm.set_editor_property('const_b', rough)
        MEL.connect_material_expressions(s_o, 'G', rm, 'A')
        if setname in os.environ.get('QQ_ARM_CALM', '').split(','):
            rl = MEL.create_material_expression(m, unreal.MaterialExpressionLinearInterpolate, -450, 550); rl.set_editor_property('const_alpha', 0.6); rl.set_editor_property('const_b', 0.42)
            MEL.connect_material_expressions(rm, '', rl, 'A'); MEL.connect_material_property(rl, '', unreal.MaterialProperty.MP_ROUGHNESS)
        else: MEL.connect_material_property(rm, '', unreal.MaterialProperty.MP_ROUGHNESS)
        MEL.connect_material_property(s_o, 'B', unreal.MaterialProperty.MP_METALLIC)
    MEL.recompile_material(m); EAL.save_asset(p); return m

def imp_meshes(mats):
    out = {}
    for g, gd in MAN['groups'].items():
        t = unreal.AssetImportTask(); t.filename = f"{SRC}/{gd['file']}"; t.destination_path = f'{DST}/Mesh/{g}'; t.automated = True; t.replace_existing = True; t.save = False
        ui = unreal.FbxImportUI(); ui.import_mesh = True; ui.import_as_skeletal = False; ui.import_materials = False; ui.import_textures = False; ui.import_animations = False
        sd = ui.static_mesh_import_data; sd.combine_meshes = False; sd.set_editor_property('transform_vertex_to_absolute', True); sd.auto_generate_collision = False; sd.generate_lightmap_u_vs = False
        sd.set_editor_property('normal_import_method', unreal.FBXNormalImportMethod.FBXNIM_IMPORT_NORMALS_AND_TANGENTS)
        t.options = ui; AT.import_asset_tasks([t])
        for ap in EAL.list_assets(f'{DST}/Mesh/{g}', recursive=False):
            sm = unreal.load_asset(ap)
            if not isinstance(sm, unreal.StaticMesh): continue
            piece = next((pn for pn in gd['pieces'] if sm.get_name().endswith(pn) or sm.get_name() == pn), None)
            if piece is None: log('unmatched mesh', sm.get_name()); continue
            pd = MAN['pieces'][piece]; mset = pd['material'].replace('M_', '')
            for i in range(len(sm.static_materials)): sm.set_material(i, mats[mset])
            EAL.save_asset(sm.get_path_name()); out[piece] = {'asset': sm.get_path_name(), 'bone': pd['follow_bone'], 'group': pd['group']}
            b = sm.get_bounding_box(); c = (b.min + b.max) * 0.5
            mx = MAN.get('sheath_matrix_world') if pd['group'] == 'Weapon' else (MAN.get('amulet_world_matrix') if pd['group'] == 'Amulet' else None)
            if mx and c.length() < 20: out[piece]['matrix'] = mx   # modelled at its pivot -> place with the manifest's world matrix
    json.dump(out, open(PJSON, 'w'), indent=1); log('pieces', len(out), PJSON)

try:
    imp_tex()
    sets = sorted({p['material'].replace('M_', '') for p in MAN['pieces'].values()})
    mats = {s: make_mat(s) for s in sets}
    imp_meshes(mats)
except Exception as e:
    log('ERROR', e, traceback.format_exc())
finally:
    LOG.close()
    if os.environ.get('QQ_NOQUIT') != '1': unreal.SystemLibrary.quit_editor()
