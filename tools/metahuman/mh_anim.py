# UE 5.8 (QQ_MetaHuman): MetaHuman Guloyim moving on her OWN MetaHuman rig.
# Steps (env QQ_STEPS, comma list):
#   geo      export_geometry of /Game/QQ/MHC_gulayim -> /Game/QQ/Geo_gulayim (Body = MetaHuman body with ABP_Body_PostProcess
#            + body DNA (RigLogic correctives), Head, FullBody = body+head one mesh) and save
#   headmat  face texture out/ft/head_basecolor.png -> M_QQ_Head on the head skin slot
#   retarget engine Quinn locomotion (template content, free) -> metahuman_base_skel via IK Retargeter (auto IK rigs)
#   export   FullBody + retargeted anims as FBX for Unity (untouched MetaHuman skeleton and skin weights)
#   scene    light studio level + level sequence (idle 3 s, walk 4 s, run 4 s; 3/4 front camera, then back camera)
#   render   Movie Render Queue (PIE) -> PNG frames in out/frames_<tag>; editor quits when done (needs the real editor, not -nullrhi)
# Log: out/mh_anim_log.txt
import unreal, os, json, traceback, math

ROOT = 'F:/qirq-qiz/tools/metahuman'; OUT = f'{ROOT}/out'
STEPS = os.environ.get('QQ_STEPS', 'geo,headmat,retarget,export').split(',')
TAG = os.environ.get('QQ_TAG', 'harakat')          # harakat = MetaHuman body only, kiyim = with costume
UNITY = os.environ.get('QQ_UNITY_DIR', 'F:/qirq-qiz-unity/Assets/QQ/Models/MH')
LOG = open(f'{OUT}/mh_anim_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQA ' + s)

AT = unreal.AssetToolsHelpers.get_asset_tools()
EAL = unreal.EditorAssetLibrary
CHAR = '/Game/QQ/MHC_gulayim'; GEO = '/Game/QQ/Geo_gulayim'
BODY = f'{GEO}/MHC_gulayim_Body'; HEAD = f'{GEO}/MHC_gulayim_Head'; FULL = f'{GEO}/MHC_gulayim_FullBody'
ANIMS = '/Game/QQ/Anims'
MANNY = '/Game/Characters/Mannequins'
SRC_ANIMS = {'idle': f'{MANNY}/Anims/Unarmed/MM_Idle', 'walk': f'{MANNY}/Anims/Unarmed/Walk/MF_Unarmed_Walk_Fwd', 'run': f'{MANNY}/Anims/Unarmed/Jog/MF_Unarmed_Jog_Fwd'}
def mh_anim(k): return f'{ANIMS}/' + SRC_ANIMS[k].split('/')[-1] + '_MH'

def load(p):
    a = unreal.load_asset(p)
    if a is None: raise RuntimeError('missing ' + p)
    return a

def make(name, path, cls, factory):
    p = f'{path}/{name}'
    if EAL.does_asset_exist(p): EAL.delete_asset(p)
    return AT.create_asset(name, path, cls, factory)

# ---------------------------------------------------------------- geo
def step_geo():
    mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
    c = load(CHAR)
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit character')
    try:
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = GEO
        g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = True; g.body_skeletal_mesh = True; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_directory(GEO, only_if_is_dirty=False, recursive=True)
    for ap in EAL.list_assets(GEO, recursive=True):
        a = unreal.load_asset(ap)
        if isinstance(a, unreal.SkeletalMesh):
            log('geo', ap, 'skel', a.skeleton.get_path_name(), 'pp', a.get_editor_property('post_process_anim_blueprint'),
                'slots', [str(m.material_slot_name) for m in a.materials])

# ---------------------------------------------------------------- head material
def step_headmat():
    t = unreal.AssetImportTask(); t.filename = f'{OUT}/ft/head_basecolor.png'; t.destination_path = '/Game/QQ/Tex'; t.destination_name = 'T_gulayim_head'
    t.automated = True; t.replace_existing = True; t.save = True; AT.import_asset_tasks([t])
    tex = load('/Game/QQ/Tex/T_gulayim_head')
    MEL = unreal.MaterialEditingLibrary
    m = make('M_QQ_Head', '/Game/QQ/Mat', unreal.Material, unreal.MaterialFactoryNew())
    ts = MEL.create_material_expression(m, unreal.MaterialExpressionTextureSample, -400, 0); ts.texture = tex
    MEL.connect_material_property(ts, 'RGB', unreal.MaterialProperty.MP_BASE_COLOR)
    r = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -400, 250); r.r = 0.55
    MEL.connect_material_property(r, '', unreal.MaterialProperty.MP_ROUGHNESS)
    sp = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -400, 350); sp.r = 0.35
    MEL.connect_material_property(sp, '', unreal.MaterialProperty.MP_SPECULAR)
    m.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_SUBSURFACE_PROFILE)
    MEL.recompile_material(m); EAL.save_asset(m.get_path_name())
    h = load(HEAD); mats = list(h.materials)
    for i, sm in enumerate(mats):
        n = str(sm.material_slot_name).lower()
        log('head slot', i, n, sm.material_interface.get_path_name() if sm.material_interface else None)
        if 'head' in n or 'skin' in n or i == 0 and len(mats) == 1:
            sm.material_interface = m; mats[i] = sm
    h.set_editor_property('materials', mats); EAL.save_asset(HEAD)

# ---------------------------------------------------------------- retarget
def auto_rig(name, mesh):
    rig = make(name, '/Game/QQ/Retarget', unreal.IKRigDefinition, unreal.IKRigDefinitionFactory())
    c = unreal.IKRigController.get_controller(rig); c.set_skeletal_mesh(mesh)
    ok = c.apply_auto_generated_retarget_definition()
    log('ikrig', name, 'auto', ok, 'root', c.get_retarget_root(), 'chains', [str(x.chain_name) for x in c.get_retarget_chains()])
    EAL.save_asset(rig.get_path_name()); return rig

def step_retarget():
    quinn = load(f'{MANNY}/Meshes/SKM_Quinn_Simple'); body = load(BODY)
    src = auto_rig('IK_Quinn', quinn); tgt = auto_rig('IK_MH_Gulayim', body)
    rtg = make('RTG_Quinn_to_MH', '/Game/QQ/Retarget', unreal.IKRetargeter, unreal.IKRetargetFactory())
    rc = unreal.IKRetargeterController.get_controller(rtg)
    rc.set_ik_rig(unreal.RetargetSourceOrTarget.SOURCE, src); rc.set_ik_rig(unreal.RetargetSourceOrTarget.TARGET, tgt)
    rc.set_preview_mesh(unreal.RetargetSourceOrTarget.SOURCE, quinn); rc.set_preview_mesh(unreal.RetargetSourceOrTarget.TARGET, body)
    if rc.get_num_retarget_ops() == 0: rc.add_default_ops()
    rc.assign_ik_rig_to_all_ops(unreal.RetargetSourceOrTarget.SOURCE, src); rc.assign_ik_rig_to_all_ops(unreal.RetargetSourceOrTarget.TARGET, tgt)
    rc.auto_map_chains(unreal.AutoMapChainType.EXACT, True)
    # both skeletons are in A-pose but with different arm angles: align target retarget pose to the source chains
    try: rc.auto_align_all_bones(unreal.RetargetSourceOrTarget.TARGET, unreal.RetargetAutoAlignMethod.CHAIN_TO_CHAIN)
    except Exception as e: log('auto align failed', e)
    log('rtg ops', [str(rc.get_op_name(i)) for i in range(rc.get_num_retarget_ops())])
    EAL.save_asset(rtg.get_path_name())
    inp = unreal.IKRetargetBatchOperationInputs()
    inp.assets_to_retarget = [unreal.EditorAssetLibrary.find_asset_data(p) for p in SRC_ANIMS.values()]
    inp.source_mesh = quinn; inp.target_mesh = body; inp.ik_retarget_asset = rtg
    inp.suffix = '_MH'; inp.target_path = ANIMS; inp.use_source_path = False; inp.include_referenced_assets = False; inp.overwrite_existing_files = True
    res = unreal.IKRetargetBatchOperation.run_batch_retarget(inp)
    log('retargeted', [str(r.package_name) for r in res])
    EAL.save_directory(ANIMS, only_if_is_dirty=False, recursive=True)
    for k in SRC_ANIMS:
        a = unreal.load_asset(mh_anim(k)); log('anim', k, mh_anim(k), a.get_play_length() if a else None, a.get_skeleton().get_path_name() if a else None)

# ---------------------------------------------------------------- export for Unity
def fbx_task(obj, fn, anim=False):
    t = unreal.AssetExportTask(); t.object = obj; t.filename = fn; t.automated = True; t.replace_identical = True; t.prompt = False
    t.exporter = unreal.AnimSequenceExporterFBX() if anim else unreal.SkeletalMeshExporterFBX()
    o = unreal.FbxExportOption(); o.collision = False; o.level_of_detail = False; o.export_morph_targets = True; o.export_preview_mesh = False
    o.fbx_export_compatibility = unreal.FbxExportCompatibility.FBX_2020; o.ascii = False; o.force_front_x_axis = False
    t.options = o
    ok = unreal.Exporter.run_asset_export_task(t); log('fbx', fn, ok); return ok

def step_export():
    os.makedirs(UNITY, exist_ok=True)
    fbx_task(load(FULL), f'{UNITY}/MH_gulayim_FullBody.fbx')
    for k in SRC_ANIMS: fbx_task(load(mh_anim(k)), f'{UNITY}/MH_gulayim@{k}.fbx', anim=True)
    if EAL.does_asset_exist('/Game/QQ/Costume/SKM_gulayim_costume'):
        fbx_task(load('/Game/QQ/Costume/SKM_gulayim_costume'), f'{UNITY}/MH_gulayim_Costume.fbx')

# ---------------------------------------------------------------- scene
LEVEL = '/Game/QQ/L_AnimStudio'; SEQ = '/Game/QQ/LS_Gulayim'
FPS = 30; SEG = [('idle', 3.0), ('walk', 4.0), ('run', 4.0)]

def flat_mat(name, rgb, unlit):
    MEL = unreal.MaterialEditingLibrary
    m = make(name, '/Game/QQ/Mat', unreal.Material, unreal.MaterialFactoryNew())
    c = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -300, 0); c.constant = unreal.LinearColor(*rgb, 1)
    if unlit:
        m.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT); m.set_editor_property('two_sided', True)
        MEL.connect_material_property(c, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    else:
        MEL.connect_material_property(c, '', unreal.MaterialProperty.MP_BASE_COLOR)
        r = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -300, 200); r.r = 0.9
        MEL.connect_material_property(r, '', unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.recompile_material(m); EAL.save_asset(m.get_path_name()); return m

def step_scene():
    les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    if EAL.does_asset_exist(SEQ): EAL.delete_asset(SEQ)
    if EAL.does_asset_exist(LEVEL):
        if not EAL.delete_asset(LEVEL): raise RuntimeError('cannot delete old level')
    if not les.new_level(LEVEL): raise RuntimeError('new_level failed')
    bg = flat_mat('M_QQ_Backdrop', (0.78, 0.79, 0.81), True); fl = flat_mat('M_QQ_Floor', (0.62, 0.63, 0.65), False)
    sphere = load('/Engine/BasicShapes/Sphere'); plane = load('/Engine/BasicShapes/Plane')
    dome = eas.spawn_actor_from_object(sphere, unreal.Vector(0, 0, 0)); dome.set_actor_scale3d(unreal.Vector(60, 60, 60))
    dome.static_mesh_component.set_material(0, bg); dome.static_mesh_component.set_cast_shadow(False)
    floor = eas.spawn_actor_from_object(plane, unreal.Vector(0, 0, 0)); floor.set_actor_scale3d(unreal.Vector(40, 40, 1))
    floor.static_mesh_component.set_material(0, fl)
    sun = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 500), unreal.Rotator(roll=0, pitch=-40, yaw=-125))
    sun.light_component.set_intensity(6.0)
    sky = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 300))
    sky.light_component.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
    try: sky.light_component.set_editor_property('cubemap', load('/Engine/MapTemplates/Sky/SunsetAmbientCubemap'))
    except Exception as e: log('cubemap', e)
    sky.light_component.set_intensity(1.2); sky.light_component.recapture_sky()
    pp = eas.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 0)); pp.unbound = True
    s = pp.settings; s.override_auto_exposure_method = True; s.auto_exposure_method = unreal.AutoExposureMethod.AEM_HISTOGRAM
    s.override_auto_exposure_bias = True; s.auto_exposure_bias = float(os.environ.get('QQ_EXPO', '1.3'))
    s.override_motion_blur_amount = True; s.motion_blur_amount = 0.0; pp.settings = s

    # character: MetaHuman body (its own post-process ABP + DNA correctives) + head copying the body pose (ABP_Face)
    body = eas.spawn_actor_from_object(load(BODY), unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0)); body.set_actor_label('MH_Body')
    head = eas.spawn_actor_from_object(load(HEAD), unreal.Vector(0, 0, 0)); head.set_actor_label('MH_Head')
    head.attach_to_actor(body, '', unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, False)
    hc = head.skeletal_mesh_component; hc.set_animation_mode(unreal.AnimationMode.ANIMATION_BLUEPRINT)
    hc.set_anim_instance_class(load('/MetaHumanCharacter/Face/ABP_Face').generated_class())
    hc.set_editor_property('use_attach_parent_bound', True)
    actors = [body, head]
    if TAG == 'kiyim' and EAL.does_asset_exist('/Game/QQ/Costume/SKM_gulayim_costume'):
        cos = eas.spawn_actor_from_object(load('/Game/QQ/Costume/SKM_gulayim_costume'), unreal.Vector(0, 0, 0)); cos.set_actor_label('MH_Costume')
        cos.attach_to_actor(body, '', unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, False)
        cc = cos.skeletal_mesh_component; cc.set_animation_mode(unreal.AnimationMode.ANIMATION_BLUEPRINT)
        cc.set_anim_instance_class(load('/MetaHumanCharacter/Face/ABP_Face').generated_class())   # same CopyPoseFromMesh(attach parent)
        cc.set_editor_property('use_attach_parent_bound', True)
    # cameras (character faces +X in UE for MetaHuman? MetaHuman faces +Y): 3/4 front and back
    def cam(label, loc, look):
        c = eas.spawn_actor_from_class(unreal.CineCameraActor, unreal.Vector(*loc)); c.set_actor_label(label)
        d = unreal.Vector(look[0] - loc[0], look[1] - loc[1], look[2] - loc[2])
        c.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(unreal.Vector(*loc), unreal.Vector(*look)), False)
        cc = c.get_cine_camera_component(); cc.set_editor_property('current_focal_length', 35.0)
        fs = cc.focus_settings; fs.focus_method = unreal.CameraFocusMethod.DISABLE; cc.focus_settings = fs
        fb = cc.filmback; fb.sensor_width = 24.89; fb.sensor_height = 14.0; cc.filmback = fb
        return c
    fy = float(os.environ.get('QQ_FACE_Y', '1'))   # +1: MetaHuman faces +Y
    cam_front = cam('Cam_34Front', (300, fy * 420, 110), (0, 0, 88))
    cam_back = cam('Cam_Back', (-90, -fy * 510, 115), (0, 0, 88))
    unreal.EditorLevelLibrary.save_current_level()

    # sequence: 2 passes of idle->walk->run, first from the 3/4 front, then from the back
    if EAL.does_asset_exist(SEQ): EAL.delete_asset(SEQ)
    seq = AT.create_asset('LS_Gulayim', '/Game/QQ', unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
    seq.set_display_rate(unreal.FrameRate(FPS, 1))
    total = sum(d for _, d in SEG); nf = int(round(total * FPS))
    seq.set_playback_start(0); seq.set_playback_end(nf * 2)
    bb = seq.add_possessable(body)
    tr = bb.add_track(unreal.MovieSceneSkeletalAnimationTrack)
    f0 = 0
    for p in range(2):
        for k, d in SEG:
            n = int(round(d * FPS)); a = load(mh_anim(k))
            sec = tr.add_section(); sec.set_range(f0, f0 + n)
            prm = sec.params; prm.animation = a; sec.params = prm
            f0 += n
    cut = seq.add_track(unreal.MovieSceneCameraCutTrack)
    for i, c in enumerate([cam_front, cam_back]):
        cb = seq.add_possessable(c)
        s = cut.add_section(); s.set_range(i * nf, (i + 1) * nf)
        s.set_camera_binding_id(seq.get_binding_id(cb))
    EAL.save_asset(SEQ)
    unreal.EditorLevelLibrary.save_current_level()
    log('scene ok', nf * 2, 'frames')

# ---------------------------------------------------------------- render
def step_render():
    les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); les.load_level(LEVEL)
    outdir = f'{OUT}/frames_{TAG}'; os.makedirs(outdir, exist_ok=True)
    for f in os.listdir(outdir): os.remove(os.path.join(outdir, f))
    qs = unreal.get_editor_subsystem(unreal.MoviePipelineQueueSubsystem); q = qs.get_queue()
    for j in list(q.get_jobs()): q.delete_job(j)
    job = q.allocate_new_job(unreal.MoviePipelineExecutorJob)
    job.sequence = unreal.SoftObjectPath(SEQ); job.map = unreal.SoftObjectPath(LEVEL); job.job_name = 'gulayim_' + TAG
    cfg = job.get_configuration()
    o = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
    o.output_directory = unreal.DirectoryPath(outdir); o.file_name_format = 'f_{frame_number}'
    o.output_resolution = unreal.IntPoint(1280, 720); o.zero_pad_frame_numbers = 4; o.use_custom_frame_rate = True; o.output_frame_rate = unreal.FrameRate(FPS, 1)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_PNG)
    aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
    aa.spatial_sample_count = 1; aa.temporal_sample_count = 1; aa.override_anti_aliasing = False
    aa.engine_warm_up_count = 16; aa.render_warm_up_count = 16
    global EXE
    EXE = qs.render_queue_with_executor(unreal.MoviePipelinePIEExecutor)
    def done(executor, ok):
        log('render finished', ok, len(os.listdir(outdir)), 'frames'); LOG.flush()
        unreal.SystemLibrary.quit_editor()
    EXE.on_executor_finished_delegate.add_callable(done)
    log('render started ->', outdir)

def step_mrqcfg():
    # saved MRQ config for a command-line render:  UnrealEditor-Cmd <proj> <LEVEL> -game -LevelSequence=<SEQ> -MoviePipelineConfig=<CFG>
    w, h = [int(x) for x in os.environ.get('QQ_RES', '1280x720').split('x')]
    seqp = os.environ.get('QQ_SEQ', SEQ); name = os.environ.get('QQ_CFG', 'MRQ_' + TAG)
    outdir = f'{OUT}/frames_{TAG}'; os.makedirs(outdir, exist_ok=True)
    for f in os.listdir(outdir): os.remove(os.path.join(outdir, f))
    cfg = make(name, '/Game/QQ', unreal.MoviePipelinePrimaryConfig, unreal.MoviePipelinePrimaryConfigFactory())
    o = cfg.find_or_add_setting_by_class(unreal.MoviePipelineOutputSetting)
    o.output_directory = unreal.DirectoryPath(outdir); o.file_name_format = 'f_{frame_number}'
    o.output_resolution = unreal.IntPoint(w, h); o.zero_pad_frame_numbers = 4
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineDeferredPassBase)
    cfg.find_or_add_setting_by_class(unreal.MoviePipelineImageSequenceOutput_PNG)
    aa = cfg.find_or_add_setting_by_class(unreal.MoviePipelineAntiAliasingSetting)
    aa.spatial_sample_count = int(os.environ.get('QQ_SPATIAL', '1')); aa.temporal_sample_count = int(os.environ.get('QQ_TEMPORAL', '1'))
    aa.override_anti_aliasing = False; aa.engine_warm_up_count = 32; aa.render_warm_up_count = 32
    cv = os.environ.get('QQ_CVARS', '')
    if cv:
        cs = cfg.find_or_add_setting_by_class(unreal.MoviePipelineConsoleVariableSetting)
        for kv in cv.split(';'):
            k, v = kv.split('='); cs.add_or_update_console_variable(k, float(v))
    EAL.save_asset(cfg.get_path_name()); log('mrq cfg', cfg.get_path_name(), w, h, '->', outdir)

QUIT = True
try:
    log('==== steps', STEPS, 'tag', TAG)
    if 'geo' in STEPS: step_geo()
    if 'headmat' in STEPS: step_headmat()
    if 'retarget' in STEPS: step_retarget()
    if 'export' in STEPS: step_export()
    if 'scene' in STEPS: step_scene()
    if 'mrqcfg' in STEPS: step_mrqcfg()
    if 'render' in STEPS: step_render(); QUIT = False
except Exception as e:
    log('ERROR', e); log(traceback.format_exc())
    QUIT = True
finally:
    if QUIT:
        LOG.close(); unreal.SystemLibrary.quit_editor()
