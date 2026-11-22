# Give MHC_gulayim_final the tall athletic body (old proportions) on the parametric body, face untouched; re-export.
import unreal, os, json, traceback
OUT = 'F:/qirq-qiz/tools/metahuman/out'; D = 'F:/qirq-qiz/tools/blender/guloyim_costume/body'; BASE = 'SK_Guloyim_Final'
LOG = open(f'{OUT}/mh_body_fix_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQB ' + s)
EAL = unreal.EditorAssetLibrary; mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
NAME = 'MHC_gulayim_final'; CH = f'/Game/QQ/{NAME}'; GEO = f'/Game/QQ/Geo_{NAME}'
TARGET = json.loads(os.environ.get('QQ_BODY_JSON', 'null')) or {'height': 171, 'across_shoulder': 32, 'waist': 63, 'chest': 86, 'hip': 88, 'inseam': 78,
          'muscularity': 0.3, 'bicep': 26, 'forearm': 22.5, 'neck': 32, 'neck_base': 34.5, 'shoulder_height': 147.5}
def fbx(obj, fn):
    t = unreal.AssetExportTask(); t.object = obj; t.filename = fn; t.automated = True; t.replace_identical = True; t.prompt = False
    t.exporter = unreal.SkeletalMeshExporterFBX(); o = unreal.FbxExportOption(); o.collision = False; o.level_of_detail = False; o.export_morph_targets = True
    o.fbx_export_compatibility = unreal.FbxExportCompatibility.FBX_2020; t.options = o; log('fbx', fn, unreal.Exporter.run_asset_export_task(t))
try:
    bak = f'/Game/QQ/{NAME}_presetbody'
    if not EAL.does_asset_exist(bak): EAL.duplicate_asset(CH, bak); log('backup', bak)
    c = unreal.load_asset(CH)
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        f0 = list(mhs.get_face_model_coefficients(c))
        cons = list(mhs.get_body_constraints(c))
        for k in cons:
            n = str(k.name).lower().replace(' ', '_')
            if n in TARGET: k.is_active = True; k.target_measurement = max(k.min_measurement, min(k.max_measurement, float(TARGET[n])))
        mhs.set_body_constraints(c, cons); mhs.commit_body_state(c)
        meas = {str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(c)}
        f1 = list(mhs.get_face_model_coefficients(c))
        log('measurements after', json.dumps(meas))
        log('face coefficient max diff', max(abs(a - b) for a, b in zip(f0, f1)) if f0 and len(f0) == len(f1) else 'n/a')
        json.dump(meas, open(f'{D}/{BASE}_measurements.json', 'w'), indent=1)
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = GEO; g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = True; g.body_skeletal_mesh = False; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_asset(CH, only_if_is_dirty=False); EAL.save_directory(GEO, only_if_is_dirty=False, recursive=True)
    fb = unreal.load_asset(f'{GEO}/{NAME}_FullBody'); hd = unreal.load_asset(f'{GEO}/{NAME}_Head')
    log('bounds full', fb.get_bounds())
    fbx(fb, f'{D}/{BASE}_FullBody.fbx'); fbx(hd, f'{D}/{BASE}_Head.fbx')
except Exception as e:
    log('ERROR', e, traceback.format_exc())
finally:
    LOG.close(); unreal.SystemLibrary.quit_editor()
