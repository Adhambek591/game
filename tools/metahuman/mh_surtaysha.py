# UE 5.8: Surtaysha's MetaHuman body (burly khan, ~185 cm) on MetaHuman's own parametric body, own rig untouched.
# Male preset head (face comes later) -> /Game/QQ/MHC_surtaysha -> parametric body constraints -> commit
# -> export_geometry FullBody -> FBX F:/qirq-qiz/tools/blender/surtaysha/body/SK_Surtaysha_MHBody.fbx
# Env: QQ_PRESET (Victor), QQ_FRAC_JSON (override fractions per constraint keyword)
import unreal, os, json, traceback
OUT = 'F:/qirq-qiz/tools/metahuman/out'; FBX_DIR = 'F:/qirq-qiz/tools/blender/surtaysha/body'
LOG = open(f'{OUT}/mh_surtaysha_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQS ' + s)
EAL = unreal.EditorAssetLibrary; mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
CHAR = '/Game/QQ/MHC_surtaysha'; GEO = '/Game/QQ/Geo_MHC_surtaysha'
# fraction of each measurement's range (0 = min, 1 = max): broad shoulders, deep chest, thick arms/neck, heavy (not fat) waist
FRAC = json.loads(os.environ.get('QQ_FRAC_JSON', 'null')) or {
    'chest': 0.92, 'shoulder': 0.95, 'bicep': 0.95, 'upper_arm_circ': 0.95, 'forearm': 0.9, 'neck': 0.95,
    'waist': 0.72, 'hip': 0.62, 'thigh': 0.78, 'calf': 0.72, 'wrist': 0.85, 'underbust': 0.85,
}
try:
    if EAL.does_asset_exist(CHAR): EAL.delete_asset(CHAR)
    pre = os.environ.get('QQ_PRESET', 'Victor')
    # presets carry a FIXED body (constraints are ignored) -> a new character keeps the parametric body
    if os.environ.get('QQ_FROM_PRESET'): c = EAL.duplicate_asset(f'/MetaHumanCharacter/Optional/Presets/{pre}', CHAR)
    else: c = unreal.AssetToolsHelpers.get_asset_tools().create_asset(asset_name='MHC_surtaysha', package_path='/Game/QQ', asset_class=unreal.MetaHumanCharacter, factory=unreal.new_object(type=unreal.MetaHumanCharacterFactoryNew))
    log('created', c)
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        cons = list(mhs.get_body_constraints(c))   # python list: iterating an unreal.Array yields copies
        for k in cons: log('constraint', k.name, 'active', k.is_active, 'target', round(k.target_measurement, 1), 'range', round(k.min_measurement, 1), round(k.max_measurement, 1))
        ABS = json.loads(os.environ.get('QQ_ABS_JSON', 'null')) or {'height': 185, 'masculine/feminine': -1.8, 'muscularity': 2.0, 'fat': 0.4, 'chest': 128, 'underbust': 118, 'waist': 102, 'hip': 108, 'high_hip': 104,
               'neck_base': 52, 'neck': 47, 'bicep': 45, 'forearm': 36, 'wrist': 20.5, 'elbow': 32, 'across_shoulder': 50, 'thigh': 66, 'knee': 42, 'calf': 44, 'hand_circumference': 25}
        for k in cons:
            n = str(k.name).lower().replace(' ', '_')
            if n in ABS: k.is_active = True; k.target_measurement = max(k.min_measurement, min(k.max_measurement, float(ABS[n]))); continue
            if True: continue
            for key, fr in FRAC.items():
                if key in n:
                    k.is_active = True; k.target_measurement = k.min_measurement + fr * (k.max_measurement - k.min_measurement); break
        mhs.set_body_constraints(c, list(cons))
        mhs.commit_body_state(c)
        for k in mhs.get_body_constraints(c): log('result', k.name, 'active', k.is_active, 'target', round(k.target_measurement, 1), 'now', round(getattr(k, 'measurement', -1), 1) if hasattr(k, 'measurement') else '')
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = GEO; g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = False; g.body_skeletal_mesh = True; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_asset(CHAR, only_if_is_dirty=False); EAL.save_directory(GEO, only_if_is_dirty=False, recursive=True)
    os.makedirs(FBX_DIR, exist_ok=True)
    m = unreal.load_asset(f'{GEO}/MHC_surtaysha_FullBody'); log('fullbody', m, m.get_bounds() if m else None)
    t = unreal.AssetExportTask(); t.object = m; t.filename = f'{FBX_DIR}/SK_Surtaysha_MHBody.fbx'; t.automated = True; t.replace_identical = True; t.prompt = False
    t.exporter = unreal.SkeletalMeshExporterFBX()
    o = unreal.FbxExportOption(); o.collision = False; o.level_of_detail = False; o.export_morph_targets = True; o.fbx_export_compatibility = unreal.FbxExportCompatibility.FBX_2020
    t.options = o
    log('fbx', t.filename, unreal.Exporter.run_asset_export_task(t))
except Exception as e:
    log('ERROR', e); log(traceback.format_exc())
finally:
    LOG.close(); unreal.SystemLibrary.quit_editor()
