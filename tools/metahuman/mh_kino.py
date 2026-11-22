# UE 5.8 overnight cinematics for Guloyim / Surtaysha.
# Steps (env QQ_STEPS): rig (cloud auto-rig, blocking) -> build (assembled Cinematic MetaHuman) ; surtface (male face look on MHC_surtaysha)
import unreal, os, json, traceback, time
OUT = 'F:/qirq-qiz/tools/metahuman/out'
STEPS = os.environ.get('QQ_STEPS', 'rig').split(',')
CHARS = os.environ.get('QQ_CHARS', 'MHC_gulayim_final').split(',')
LOG = open(f'{OUT}/mh_kino_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQK ' + s)
EAL = unreal.EditorAssetLibrary; mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)

def step_rig(name):
    c = unreal.load_asset(f'/Game/QQ/{name}')
    log('rig types', [x for x in dir(unreal.MetaHumanRigType) if x.isupper()])
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        log('can build before', mhs.can_build_meta_human(c))
        r = unreal.MetaHumanCharacterAutoRiggingRequestParams(); r.blocking = True; r.report_progress = False
        rt = os.environ.get('QQ_RIGTYPE', 'JOINTS_AND_BLENDSHAPES')
        r.rig_type = getattr(unreal.MetaHumanRigType, rt, unreal.MetaHumanRigType.JOINTS_ONLY)
        t0 = time.time(); res = mhs.request_auto_rigging(c, r)
        log('auto rig returned', res, 'in', round(time.time() - t0, 1), 's; can build after', mhs.can_build_meta_human(c))
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)

def step_build(name):
    c = unreal.load_asset(f'/Game/QQ/{name}')
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        if not mhs.can_build_meta_human(c): log('build skipped: not ready (rig missing)', name); return
        bp = unreal.MetaHumanCharacterEditorBuildParameters(); bp.pipeline_type = unreal.MetaHumanDefaultPipelineType.CINEMATIC
        bp.absolute_build_path = '/Game/MetaHumans'; bp.common_folder_path = '/Game/MetaHumans/Common'; bp.enable_wardrobe_item_validation = False
        mhs.build_meta_human(character=c, params=bp)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    log('built', name, [a for a in EAL.list_assets(f'/Game/MetaHumans/{name}', recursive=False)][:10])

try:
    log('==== steps', STEPS, CHARS)
    for n in CHARS:
        try:
            if 'rig' in STEPS: step_rig(n)
            if 'build' in STEPS: step_build(n)
        except Exception as e: log('ERROR', n, e, traceback.format_exc())
finally:
    LOG.close(); unreal.SystemLibrary.quit_editor()
