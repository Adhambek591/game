# UE 5.8: Guloyim "beauty" look on MetaHuman's own systems (no sculpt, no painted texture).
# Steps (env QQ_STEPS):
#   look    MHC_gulayim_id2 (smooth model-only conform) -> duplicate MHC_gulayim_beauty; optional face blend toward a preset
#           (face model coefficients interpolation), texture-synthesis skin, eyes, makeup, strand grooms (hair/brows/lashes/peachfuzz)
#   build   build_meta_human (Cinematic) -> /Game/MetaHumans/MHC_gulayim_beauty
#   scene   portrait studio level (copy of MetaHuman's Portrait lighting environment) + built BP + 3 cine cameras + sequence
#   (render with ue_run.ps1 mrq /Game/QQ/L_Portrait /Game/QQ/LS_Portrait /Game/QQ/MRQ_portrait)
# Env: QQ_PRESET (Tuya), QQ_BLEND (0.0..1), QQ_HAIR (WI_Hair_M_TwistedBraids), QQ_SKIN_U/QQ_SKIN_V, QQ_FACE_TEX
import unreal, os, json, traceback, math
ROOT = 'F:/qirq-qiz/tools/metahuman'; OUT = f'{ROOT}/out'
STEPS = os.environ.get('QQ_STEPS', 'look,build,scene').split(',')
SRC = os.environ.get('QQ_SRC', '/Game/QQ/MHC_gulayim_id2'); NAME = os.environ.get('QQ_NAME', 'MHC_gulayim_beauty'); CHAR = f'/Game/QQ/{NAME}'
LOG = open(f'{OUT}/mh_beauty_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQB ' + s)
EAL = unreal.EditorAssetLibrary; AT = unreal.AssetToolsHelpers.get_asset_tools()
mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
OPT = '/MetaHumanCharacter/Optional'

def add_groom(c, slot, wi_path):
    wi = unreal.load_asset(wi_path)
    if wi is None: log('groom missing', wi_path); return None
    try:
        key = c.internal_collection.try_add_item_from_wardrobe_item(slot, wi)
        ok = c.internal_collection.default_instance.try_add_slot_selection(unreal.MetaHumanPipelineSlotSelection(slot_name=slot, selected_item=key))
        log('groom', slot, wi_path.split('.')[-1], 'key', key, 'sel', ok); return key
    except Exception as e:
        log('groom FAIL', slot, wi_path, e); return None

def step_look():
    if EAL.does_asset_exist(CHAR): EAL.delete_asset(CHAR)
    c = EAL.duplicate_asset(SRC, CHAR); log('dup', SRC, '->', CHAR, c)
    preset_name = os.environ.get('QQ_PRESET', 'Tuya'); blend = float(os.environ.get('QQ_BLEND', '0'))
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        if blend > 0:
            pr = unreal.load_asset(f'{OPT}/Presets/{preset_name}')
            if mhs.try_add_object_to_edit(pr):
                try:
                    a = list(mhs.get_face_model_coefficients(c)); b = list(mhs.get_face_model_coefficients(pr))
                    log('coeffs', len(a), len(b))
                    if len(a) == len(b) and a:
                        mhs.set_face_model_coefficients(c, [x * (1 - blend) + y * blend for x, y in zip(a, b)]); mhs.commit_face_state(c)
                        log('face blend', preset_name, blend)
                finally: mhs.remove_object_to_edit(pr)
        # skin: MetaHuman texture synthesis (local model in Optional/TextureSynthesis)
        sp = unreal.MetaHumanCharacterSkinProperties()
        sp.u = float(os.environ.get('QQ_SKIN_U', '0.42')); sp.v = float(os.environ.get('QQ_SKIN_V', '0.55'))
        sp.show_top_underwear = True; sp.face_texture_index = int(os.environ.get('QQ_FACE_TEX', '0')); sp.body_texture_index = sp.face_texture_index
        sp.roughness = float(os.environ.get('QQ_ROUGH', '0.95'))
        fr = unreal.MetaHumanCharacterFrecklesProperties(); fr.density = 0.0; fr.strength = 0.0
        acc = unreal.MetaHumanCharacterAccentRegions()
        def ar(l, r, s): x = unreal.MetaHumanCharacterAccentRegionProperties(); x.lightness = l; x.redness = r; x.saturation = s; return x
        acc.cheeks = ar(0.5, 0.53, 0.5); acc.lips = ar(0.45, 0.56, 0.55); acc.nose = ar(0.5, 0.52, 0.5); acc.under_eye = ar(0.55, 0.45, 0.45)
        acc.forehead = ar(0.5, 0.5, 0.5); acc.chin = ar(0.5, 0.5, 0.5); acc.ears = ar(0.5, 0.55, 0.5); acc.scalp = ar(0.5, 0.5, 0.5)
        ss = unreal.MetaHumanCharacterSkinSettings(); ss.skin = sp; ss.freckles = fr; ss.accents = acc
        try: ss.texture_material_overrides.enable_texture_overrides = False
        except Exception: pass
        c.preview_material_type = unreal.MetaHumanCharacterSkinPreviewMaterial.EDITABLE
        mhs.commit_skin_settings(c, ss); log('skin committed', sp.u, sp.v, sp.face_texture_index)
        # eyes dark brown
        es = c.eyes_settings
        for side in ('eye_left', 'eye_right'):
            e = getattr(es, side); ir = e.iris
            ir.primary_color_u = float(os.environ.get('QQ_IRIS_U', '0.12')); ir.primary_color_v = float(os.environ.get('QQ_IRIS_V', '0.35'))
            ir.secondary_color_u = ir.primary_color_u; ir.secondary_color_v = ir.primary_color_v * 0.8; ir.global_saturation = 1.0
            e.iris = ir; setattr(es, side, e)
        mhs.commit_eyes_settings(c, es); log('eyes committed')
        # light makeup
        mk = c.makeup_settings
        bl = mk.blush; bl.type = unreal.MetaHumanCharacterBlushMakeupType.APPLE; bl.intensity = 0.18; bl.roughness = 0.6; bl.color = unreal.LinearColor(0.45, 0.08, 0.07, 1); mk.blush = bl
        ey = mk.eyes; ey.type = unreal.MetaHumanCharacterEyeMakeupType.THIN_LINER; ey.opacity = 0.55; ey.primary_color = unreal.LinearColor(0.02, 0.012, 0.01, 1); ey.roughness = 0.6; mk.eyes = ey
        lp = mk.lips; lp.type = unreal.MetaHumanCharacterLipsMakeupType.NATURAL; lp.opacity = 0.18; lp.roughness = 0.4; lp.color = unreal.LinearColor(0.30, 0.08, 0.07, 1); mk.lips = lp
        mhs.commit_makeup_settings(c, mk); log('makeup committed')
        # head model: groom lashes on, dark
        hm = c.head_model_settings; el = hm.eyelashes; el.enable_grooms = True; el.melanin = 0.95; hm.eyelashes = el
        try: mhs.commit_head_model_settings(c, hm); log('head model committed')
        except Exception as e: log('head model FAIL', e)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    G = f'{OPT}/Grooms/Bindings'
    hair = os.environ.get('QQ_HAIR', 'WI_Hair_M_TwistedBraids')
    keys = {
        'Hair': add_groom(c, 'Hair', f'{G}/Hair/{hair}.{hair}'),
        'Eyebrows': add_groom(c, 'Eyebrows', f'{G}/Eyebrows/WI_Eyebrows_M_SlightArch.WI_Eyebrows_M_SlightArch'),
        'Eyelashes': add_groom(c, 'Eyelashes', f'{G}/Eyelashes/WI_Eyelashes_L_SlightCurl.WI_Eyelashes_L_SlightCurl'),
        'Peachfuzz': add_groom(c, 'Peachfuzz', f'{G}/Peachfuzz/WI_Peachfuzz_M_Thin.WI_Peachfuzz_M_Thin'),
    }
    if mhs.try_add_object_to_edit(c):
        try:
            mhs.assemble_for_preview(character=c)
            for slot, key in keys.items():
                if key is None: continue
                prm = c.internal_collection.default_instance.get_instance_parameters(item_path=unreal.MetaHumanPaletteItemPath(item_key=key))
                names = [p.name for p in prm]; log('params', slot, names[:30])
                for p in prm:
                    if p.name == 'Melanin': p.set_float(value=0.97)
                    if p.name == 'Redness': p.set_float(value=0.15)
                    if p.name == 'Roughness' and slot == 'Hair': p.set_float(value=0.45)
        except Exception as e: log('assemble/params FAIL', e, traceback.format_exc())
        finally: mhs.remove_object_to_edit(c)
    EAL.save_asset(CHAR, only_if_is_dirty=False); log('look saved')

def step_build():
    c = unreal.load_asset(CHAR)
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        bp = unreal.MetaHumanCharacterEditorBuildParameters()
        bp.pipeline_type = unreal.MetaHumanDefaultPipelineType.CINEMATIC; bp.pipeline_quality = unreal.MetaHumanQualityLevel.HIGH if hasattr(unreal.MetaHumanQualityLevel, 'HIGH') else bp.pipeline_quality
        bp.absolute_build_path = '/Game/MetaHumans'; bp.common_folder_path = '/Game/MetaHumans/Common'; bp.enable_wardrobe_item_validation = False
        log('can build', mhs.can_build_meta_human(c) if hasattr(mhs, 'can_build_meta_human') else '?')
        mhs.build_meta_human(character=c, params=bp)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    assets = EAL.list_assets(f'/Game/MetaHumans/{NAME}', recursive=True)
    log('built', len(assets), [a for a in assets if '/BP_' in a or a.split('/')[-1].startswith('BP')][:5])
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)

LEVEL = '/Game/QQ/L_Portrait'; SEQ = '/Game/QQ/LS_Portrait'
def step_scene():
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem); les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    for p in (SEQ, LEVEL):
        if EAL.does_asset_exist(p): EAL.delete_asset(p)
    EAL.duplicate_asset('/MetaHumanCharacter/LightingEnvironments/Portrait', LEVEL)
    les.load_level(LEVEL)
    for a in eas.get_all_level_actors(): log('env actor', a.get_actor_label(), a.get_class().get_name(), a.get_actor_location())
    bps = [a for a in EAL.list_assets(f'/Game/MetaHumans/{NAME}', recursive=False) if a.split('/')[-1].split('.')[0].startswith('BP_')]
    log('bp', bps)
    bpc = unreal.EditorAssetLibrary.load_blueprint_class(bps[0].split('.')[0])
    actor = eas.spawn_actor_from_class(bpc, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0)); actor.set_actor_label('Gulayim')
    comps = actor.get_components_by_class(unreal.SkeletalMeshComponent)
    body = next((x for x in comps if 'body' in x.get_name().lower()), comps[0])
    face = next((x for x in comps if 'face' in x.get_name().lower()), body)
    log('comps', [x.get_name() for x in comps])
    head = body.get_socket_location('head'); fwd = body.get_right_vector()   # MetaHuman meshes face their local +Y
    log('head', head, 'fwd', fwd)
    eye = unreal.Vector(head.x + fwd.x * 9, head.y + fwd.y * 9, head.z + 6)
    def cam(label, ang, dist, fl):
        f2 = unreal.Vector(fwd.x * math.cos(math.radians(ang)) - fwd.y * math.sin(math.radians(ang)), fwd.x * math.sin(math.radians(ang)) + fwd.y * math.cos(math.radians(ang)), 0)
        loc = unreal.Vector(eye.x + f2.x * dist, eye.y + f2.y * dist, eye.z + 2)
        c = eas.spawn_actor_from_class(unreal.CineCameraActor, loc); c.set_actor_label(label)
        c.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc, eye), False)
        cc = c.get_cine_camera_component(); cc.set_editor_property('current_focal_length', fl); cc.set_editor_property('current_aperture', 4.0)
        fs = cc.focus_settings; fs.focus_method = unreal.CameraFocusMethod.MANUAL; fs.manual_focus_distance = dist; cc.focus_settings = fs
        fb = cc.filmback; fb.sensor_width = 24.0; fb.sensor_height = 24.0; cc.filmback = fb
        return c
    cams = [cam('Cam_Front', 0, 75, 85), cam('Cam_34', 38, 75, 85), cam('Cam_Side', 88, 75, 85)]
    unreal.EditorLevelLibrary.save_current_level()
    seq = AT.create_asset('LS_Portrait', '/Game/QQ', unreal.LevelSequence, unreal.LevelSequenceFactoryNew())
    seq.set_display_rate(unreal.FrameRate(24, 1)); N = 10
    seq.set_playback_start(0); seq.set_playback_end(N * len(cams))
    cut = seq.add_track(unreal.MovieSceneCameraCutTrack)
    for i, c in enumerate(cams):
        b = seq.add_possessable(c); s = cut.add_section(); s.set_range(i * N, (i + 1) * N); s.set_camera_binding_id(seq.get_binding_id(b))
    EAL.save_asset(SEQ); unreal.EditorLevelLibrary.save_current_level(); log('scene ok')

def step_shots():
    # assembly needs the auto-rig (cloud) -> stills from the Creator's own preview actor, in MetaHuman's Portrait lighting
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem); les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    les.load_level('/MetaHumanCharacter/LightingEnvironments/' + os.environ.get('QQ_LIGHT', 'Portrait'))   # used read-only, never saved
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    for a in eas.get_all_level_actors(): log('env', a.get_actor_label(), a.get_class().get_name(), a.get_actor_location(), a.get_actor_rotation())
    c = unreal.load_asset(CHAR)
    unreal.get_editor_subsystem(unreal.AssetEditorSubsystem).open_editor_for_assets([c])
    actor = mhs.spawn_meta_human_actor(character=c); log('preview actor', actor)
    W = int(os.environ.get('QQ_RES', '1024'))
    rt = unreal.RenderingLibrary.create_render_target2d(world, W, W, unreal.TextureRenderTargetFormat.RTF_RGBA8)
    cap = eas.spawn_actor_from_class(unreal.SceneCapture2D, unreal.Vector(0, 0, 0)); cc = cap.capture_component2d
    cc.texture_target = rt; cc.capture_source = unreal.SceneCaptureSource.SCS_FINAL_TONE_CURVE_HDR if hasattr(unreal.SceneCaptureSource, 'SCS_FINAL_TONE_CURVE_HDR') else unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR
    cc.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR; cc.capture_every_frame = False; cc.fov_angle = float(os.environ.get('QQ_FOV', '16'))
    pps = cc.post_process_settings; pps.override_vignette_intensity = True; pps.vignette_intensity = 0.0
    if os.environ.get('QQ_SHOT_EXPO'):
        pps.override_auto_exposure_method = True; pps.auto_exposure_method = unreal.AutoExposureMethod.AEM_MANUAL
        pps.override_auto_exposure_apply_physical_camera_exposure = True; pps.auto_exposure_apply_physical_camera_exposure = False
        pps.override_auto_exposure_bias = True; pps.auto_exposure_bias = float(os.environ['QQ_SHOT_EXPO'])
    cc.post_process_settings = pps
    st = {'n': 0, 'i': 0, 'w': 0, 'jobs': None}
    def setup_jobs():
        comps = actor.get_components_by_class(unreal.SkeletalMeshComponent)
        log('comps', [(x.get_name(), x.skeletal_mesh_asset.get_name() if x.skeletal_mesh_asset else None) for x in comps])
        body = next((x for x in comps if x.does_socket_exist('head') and 'body' in x.get_name().lower()), None) or next(x for x in comps if x.does_socket_exist('head'))
        head = body.get_socket_location('head'); fwd = body.get_right_vector(); log('head', head, 'fwd', fwd, 'rot', body.get_world_rotation())
        if os.environ.get('QQ_FWD'): fwd = unreal.Vector(*[float(v) for v in os.environ['QQ_FWD'].split(',')])
        eye = unreal.Vector(head.x + fwd.x * 8, head.y + fwd.y * 8, head.z + 5)
        J = []
        for nm, ang in (('old', 0), ('34', 38), ('yon', 88)):
            ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
            d = unreal.Vector(fwd.x * ca - fwd.y * sa, fwd.x * sa + fwd.y * ca, 0); r = float(os.environ.get('QQ_DIST', '95'))
            J.append((nm, unreal.Vector(eye.x + d.x * r, eye.y + d.y * r, eye.z + 3), eye))
        return J
    def tick(dt):
        try:
            st['n'] += 1
            import time
            if 't0' not in st: st['t0'] = time.time()
            if time.time() - st['t0'] < float(os.environ.get('QQ_WARM_S', '600')) or st['n'] < 240: return     # texture synthesis, groom builds and shader compiles finish first
            if st['jobs'] is None: st['jobs'] = setup_jobs()
            if st['i'] >= len(st['jobs']):
                unreal.unregister_slate_post_tick_callback(st['h']); log('shots done'); LOG.close(); unreal.SystemLibrary.quit_editor(); return
            nm, loc, eye = st['jobs'][st['i']]
            if st['w'] == 0:
                cap.set_actor_location(loc, False, False); cap.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc, eye), False)
            if st['w'] < 8: cc.capture_scene(); st['w'] += 1; return
            fn = f"guloyim_{os.environ.get('QQ_SHOT_TAG', 'gozal')}_{nm}.png"
            unreal.RenderingLibrary.export_render_target(world, rt, 'F:/qirq-qiz-unity/Builds', fn); log('shot', fn)
            st['w'] = 0; st['i'] += 1
        except Exception as e:
            log('tick ERROR', e, traceback.format_exc()); unreal.SystemLibrary.quit_editor()
    unreal.EditorPythonScripting.set_keep_python_script_alive(True)
    st['h'] = unreal.register_slate_post_tick_callback(tick)
    global KEEP
    KEEP = True

KEEP = False
try:
    log('==== steps', STEPS, NAME)
    if 'look' in STEPS: step_look()
    if 'build' in STEPS: step_build()
    if 'scene' in STEPS: step_scene()
    if 'shots' in STEPS: step_shots()
except Exception as e:
    log('ERROR', e); log(traceback.format_exc())
    KEEP = False
finally:
    if not KEEP: LOG.close(); unreal.SystemLibrary.quit_editor()
