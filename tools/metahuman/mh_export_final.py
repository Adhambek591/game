# Export a final MetaHuman's geometry (A-pose, cm, same exporter/axes as the earlier FullBody round trip):
# FullBody (body+head, MetaHuman skeleton) + Head-only FBX, plus body measurements for comparison.
# Env: QQ_CHAR (MHC_gulayim_final), QQ_DIR (F:/qirq-qiz/tools/blender/guloyim_costume/body), QQ_BASE (SK_Guloyim_Final)
import unreal, os, json, traceback
OUT = 'F:/qirq-qiz/tools/metahuman/out'
NAME = os.environ.get('QQ_CHAR', 'MHC_gulayim_final'); D = os.environ.get('QQ_DIR', 'F:/qirq-qiz/tools/blender/guloyim_costume/body')
BASE = os.environ.get('QQ_BASE', 'SK_Guloyim_Final')
LOG = open(f'{OUT}/mh_export_final_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQE ' + s)
EAL = unreal.EditorAssetLibrary; mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
def fbx(obj, fn):
    t = unreal.AssetExportTask(); t.object = obj; t.filename = fn; t.automated = True; t.replace_identical = True; t.prompt = False
    t.exporter = unreal.SkeletalMeshExporterFBX()
    o = unreal.FbxExportOption(); o.collision = False; o.level_of_detail = False; o.export_morph_targets = True; o.fbx_export_compatibility = unreal.FbxExportCompatibility.FBX_2020
    t.options = o; ok = unreal.Exporter.run_asset_export_task(t); log('fbx', fn, ok)
try:
    os.makedirs(D, exist_ok=True)
    c = unreal.load_asset(f'/Game/QQ/{NAME}'); geo = f'/Game/QQ/Geo_{NAME}'
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        meas = {str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(c)}
        log('measurements', NAME, json.dumps(meas))
        json.dump(meas, open(f'{D}/{BASE}_measurements.json', 'w'), indent=1)
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = geo; g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = True; g.body_skeletal_mesh = False; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_directory(geo, only_if_is_dirty=False, recursive=True)
    fb = unreal.load_asset(f'{geo}/{NAME}_FullBody'); hd = unreal.load_asset(f'{geo}/{NAME}_Head')
    log('bounds full', fb.get_bounds())
    fbx(fb, f'{D}/{BASE}_FullBody.fbx'); fbx(hd, f'{D}/{BASE}_Head.fbx')
    # the old body (MHC_gulayim = MH_gulayim_FullBody.fbx in Unity) for comparison
    o = unreal.load_asset('/Game/QQ/MHC_gulayim')
    if o and mhs.try_add_object_to_edit(o):
        try: log('measurements old', json.dumps({str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(o)}))
        finally: mhs.remove_object_to_edit(o)
except Exception as e:
    log('ERROR', e, traceback.format_exc())
finally:
    LOG.close(); unreal.SystemLibrary.quit_editor()
