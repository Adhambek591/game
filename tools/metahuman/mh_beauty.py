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
        inst = c.internal_collection.default_instance
        if not getattr(add_groom, 'slots', False):
            add_groom.slots = True; log('slot names', [str(s) for s in c.internal_collection.get_slot_names()])
        if not getattr(add_groom, 'dumped', False):
            add_groom.dumped = True; log('instance api', [m for m in dir(inst) if not m.startswith('_')]); log('collection api', [m for m in dir(c.internal_collection) if not m.startswith('_')])
        # a slot that already holds a groom (preset hair, earlier run) keeps the old one: drop existing selections first
        try:
            sels = list(inst.get_editor_property('slot_selections')) if hasattr(inst, 'get_editor_property') else []
        except Exception: sels = []
        for s in sels:
            try:
                if str(s.slot_name) == slot:
                    r = inst.try_remove_slot_selection(s) if hasattr(inst, 'try_remove_slot_selection') else None
                    log('removed old selection', slot, r)
            except Exception as e: log('remove sel fail', e)
        key = c.internal_collection.try_add_item_from_wardrobe_item(slot, wi)
        try: ok = ('single', inst.set_single_slot_selection(slot, key))   # replaces whatever the slot held (preset hair etc.)
        except Exception as e:
            log('single sel fail', e); ok = inst.try_add_slot_selection(unreal.MetaHumanPipelineSlotSelection(slot_name=slot, selected_item=key))
        log('groom', slot, wi_path.split('.')[-1], 'key', key, 'sel', ok); return key
    except Exception as e:
        log('groom FAIL', slot, wi_path, e); return None

PRESET_COEFFS = {}
def preset_coeffs(name):
    if name not in PRESET_COEFFS:
        pr = unreal.load_asset(f'{OPT}/Presets/{name}')
        if not mhs.try_add_object_to_edit(pr): raise RuntimeError('cannot open preset ' + name)
        try: PRESET_COEFFS[name] = list(mhs.get_face_model_coefficients(pr))
        finally: mhs.remove_object_to_edit(pr)
    return PRESET_COEFFS[name]

def step_look():
    pr = os.environ.get('QQ_PRESET', 'Tuya'); bl = float(os.environ.get('QQ_BLEND', '0'))
    make_look(NAME, {'presets': [(pr, bl)] if bl > 0 else [], 'tex': int(os.environ.get('QQ_FACE_TEX', '0')),
                     'u': float(os.environ.get('QQ_SKIN_U', '0.42')), 'v': float(os.environ.get('QQ_SKIN_V', '0.55')),
                     'hair': os.environ.get('QQ_HAIR', 'WI_Hair_S_LowPonytail')})

# 6 candidates for the author: lighter / less red tone, clean young face textures (no wrinkles/stubble/marks in
# texture_attributes.json), stronger blends toward attractive presets (narrower jaw, finer nose come from the presets)
VARIANTS = (json.load(open(os.environ['QQ_VARIANTS_FILE'])) if os.environ.get('QQ_VARIANTS_FILE') else None) or [
    {'name': 'MHC_gv1', 'presets': [['Tuya', 0.55]], 'tex': 16, 'u': 0.20, 'v': 0.85},
    {'name': 'MHC_gv2', 'presets': [['Aoi', 0.55]], 'tex': 7, 'u': 0.18, 'v': 0.85},
    {'name': 'MHC_gv3', 'presets': [['Aera', 0.55]], 'tex': 17, 'u': 0.20, 'v': 0.80},
    {'name': 'MHC_gv4', 'presets': [['Tuya', 0.35], ['Aoi', 0.35]], 'tex': 18, 'u': 0.22, 'v': 0.85},
    {'name': 'MHC_gv5', 'presets': [['Lani', 0.5]], 'tex': 33, 'u': 0.24, 'v': 0.80},
    {'name': 'MHC_gv6', 'presets': [['Aera', 0.35], ['Vivian', 0.3]], 'tex': 35, 'u': 0.20, 'v': 0.85},
]
def step_variants():
    for v in VARIANTS:
        try: make_look(v['name'], dict(v, hair=v.get('hair', 'WI_Hair_S_LowPonytail')))
        except Exception as e: log('variant FAIL', v['name'], e, traceback.format_exc())

def make_look(name, cfg):
    char = f'/Game/QQ/{name}'
    if EAL.does_asset_exist(char): EAL.delete_asset(char)
    c = EAL.duplicate_asset(cfg.get('src', SRC), char); log('dup', cfg.get('src', SRC), '->', char, cfg)
    pres = [(p, float(w)) for p, w in cfg.get('presets', [])]
    pcs = {p: preset_coeffs(p) for p, _ in pres}
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        if pres:
            a = list(mhs.get_face_model_coefficients(c)); tw = sum(w for _, w in pres)
            mix = [x * (1 - tw) for x in a]
            for p, w in pres:
                mix = [m + w * y for m, y in zip(mix, pcs[p])]
            mhs.set_face_model_coefficients(c, mix); mhs.commit_face_state(c); log('face blend', pres)
        # skin: MetaHuman texture synthesis (local model in Optional/TextureSynthesis)
        sp = unreal.MetaHumanCharacterSkinProperties()
        sp.u = float(cfg['u']); sp.v = float(cfg['v'])
        sp.show_top_underwear = True; sp.face_texture_index = int(cfg['tex']); sp.body_texture_index = sp.face_texture_index
        sp.roughness = float(os.environ.get('QQ_ROUGH', '0.95'))
        fr = unreal.MetaHumanCharacterFrecklesProperties(); fr.density = 0.0; fr.strength = 0.0
        acc = unreal.MetaHumanCharacterAccentRegions()
        def ar(l, r, s): x = unreal.MetaHumanCharacterAccentRegionProperties(); x.lightness = l; x.redness = r; x.saturation = s; return x
        acc.cheeks = ar(0.5, 0.53, 0.5); acc.lips = ar(float(cfg.get('lip_light', 0.5)), float(cfg.get('lip_red', 0.56)), float(cfg.get('lip_sat', 0.55))); acc.nose = ar(0.5, 0.52, 0.5); acc.under_eye = ar(0.55, 0.45, 0.45)
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
            ir.primary_color_u = float(os.environ.get('QQ_IRIS_U', '0.8')); ir.primary_color_v = float(os.environ.get('QQ_IRIS_V', '0.15'))
            ir.secondary_color_u = ir.primary_color_u; ir.secondary_color_v = ir.primary_color_v * 0.8; ir.global_saturation = 1.0
            e.iris = ir; setattr(es, side, e)
        mhs.commit_eyes_settings(c, es); log('eyes committed')
        # light makeup
        mk = c.makeup_settings
        bl = mk.blush; bl.type = unreal.MetaHumanCharacterBlushMakeupType.APPLE; bl.intensity = 0.18; bl.roughness = 0.6; bl.color = unreal.LinearColor(0.45, 0.08, 0.07, 1); mk.blush = bl
        ey = mk.eyes; ey.type = unreal.MetaHumanCharacterEyeMakeupType.THIN_LINER; ey.opacity = 0.55; ey.primary_color = unreal.LinearColor(0.02, 0.012, 0.01, 1); ey.roughness = 0.6; mk.eyes = ey
        lp = mk.lips; lp.type = unreal.MetaHumanCharacterLipsMakeupType.NATURAL; lp.opacity = float(cfg.get('lip_op', 0.18)); lp.roughness = 0.4; lp.color = unreal.LinearColor(*cfg.get('lip_col', [0.30, 0.08, 0.07]), 1); mk.lips = lp
        mhs.commit_makeup_settings(c, mk); log('makeup committed')
        # head model: groom lashes on, dark
        hm = c.head_model_settings; el = hm.eyelashes; el.enable_grooms = True; el.melanin = 0.95; hm.eyelashes = el
        try: mhs.commit_head_model_settings(c, hm); log('head model committed')
        except Exception as e: log('head model FAIL', e)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    G = f'{OPT}/Grooms/Bindings'
    hair = cfg.get('hair', 'WI_Hair_S_LowPonytail')
    keys = {
        'Hair': add_groom(c, 'Hair', f'{G}/Hair/{hair}.{hair}'),
        'Eyebrows': add_groom(c, 'Eyebrows', f"{G}/Eyebrows/{cfg.get('brows', 'WI_Eyebrows_M_SlightArch')}.{cfg.get('brows', 'WI_Eyebrows_M_SlightArch')}"),
        'Eyelashes': add_groom(c, 'Eyelashes', f'{G}/Eyelashes/WI_Eyelashes_L_SlightCurl.WI_Eyelashes_L_SlightCurl'),
        'Peachfuzz': add_groom(c, 'Peachfuzz', f'{G}/Peachfuzz/WI_Peachfuzz_M_Thin.WI_Peachfuzz_M_Thin'),
        **{slot: add_groom(c, slot, f'{G}/{folder}/{wi}.{wi}') for slot, folder, wi in cfg.get('grooms', [])},
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
    EAL.save_asset(char, only_if_is_dirty=False); log('look saved', char)

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

PHOTO = f'{ROOT}/targets/xotin_1400.png'
def step_track():
    size, pix = unreal.PromotedFrameUtils.get_promoted_frame_as_pixel_array_from_disk(PHOTO)
    tr = mhs.track_face_landmarks_from_image(pix, size.x, size.y)
    if isinstance(tr, tuple) and len(tr) == 1: tr = tr[0]
    d = {str(k): [[p.x, p.y] for p in v.tracking_points] for k, v in tr.items()}
    json.dump({'size': [size.x, size.y], 'curves': d}, open(f'{OUT}/xotin_curves.json', 'w')); log('tracked', len(d), list(d.keys()))

def eye_sockets(head_mesh):
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    a = eas.spawn_actor_from_object(head_mesh, unreal.Vector(0, 0, 0)); c = a.skeletal_mesh_component
    l = c.get_socket_location('FACIAL_L_Eye'); r = c.get_socket_location('FACIAL_R_Eye'); a.destroy_actor(); return l, r

def step_fitphoto():
    """Photo landmarks (model-only, no Refine): target mesh = the base character's own head (weak ICP prior), the photo decides via 2D curves"""
    base = os.environ.get('QQ_FIT_BASE', 'MHC_gv1'); name = os.environ.get('QQ_FIT_NAME', 'MHC_gv6'); char = f'/Game/QQ/{name}'
    geo = f'/Game/QQ/Geo_{base}'
    bc = unreal.load_asset(f'/Game/QQ/{base}')
    if not mhs.try_add_object_to_edit(bc): raise RuntimeError('cannot edit base')
    try:
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = geo; g.head_skeletal_mesh = True; g.full_body_skeletal_mesh = False; g.body_skeletal_mesh = False; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(bc, g)
    finally: mhs.remove_object_to_edit(bc)
    head = unreal.load_asset(f'{geo}/{base}_Head')
    le, re_ = eye_sockets(head); log('eyes', le, re_)
    cd = json.load(open(f'{OUT}/xotin_curves.json')); W, H = cd['size']; cv = cd['curves']
    def ctr(keys):
        pts = [p for k, v in cv.items() if all(s in k for s in keys) for p in v]
        return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    # eye centres from the eyelid curves (image right = her left eye)
    ea = ctr(['eye', '_l']) if any('eye' in k and '_l' in k for k in cv) else None
    eb = ctr(['eye', '_r']) if any('eye' in k and '_r' in k for k in cv) else None
    log('eye px', ea, eb)
    ipd_px = math.hypot(ea[0] - eb[0], ea[1] - eb[1]); mx, my = (ea[0] + eb[0]) / 2, (ea[1] + eb[1]) / 2
    ipd = math.dist([le.x, le.y, le.z], [re_.x, re_.y, re_.z])
    fov = float(os.environ.get('QQ_PHOTO_FOV', '16')); f = (W / 2) / math.tan(math.radians(fov / 2)); dist = f * ipd / ipd_px
    em = unreal.Vector((le.x + re_.x) / 2, (le.y + re_.y) / 2, (le.z + re_.z) / 2)
    cam = unreal.Vector(em.x - (mx - W / 2) / f * dist, em.y + dist, em.z + (my - H / 2) / f * dist)
    log('photo cam', cam, 'dist', dist, 'ipd', ipd, ipd_px)
    if EAL.does_asset_exist(char): EAL.delete_asset(char)
    c = EAL.duplicate_asset(f'/Game/QQ/{base}', char)
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit fit')
    try:
        a0 = list(mhs.get_face_model_coefficients(c))
        hv, hi, *_ = mhs.get_mesh_data_for_conforming(head)
        p = unreal.ConformTargetParams(); tm = p.conform_target_mesh; tm.target_parts_type = unreal.TargetPartsType.HEAD_ONLY
        tm.head_vertices = hv; tm.head_vertex_indices = hi; p.conform_target_mesh = tm; p.auto_solve = False
        s = p.body_conform_solve_settings
        def ws(v): w = unreal.WeightSchedule(); w.start = v; w.end = v; return w
        s.iterations = 0; s.face_iterations = 12
        s.face_icp_weight = ws(float(os.environ.get('QQ_FICP', '2'))); s.face_landmark2d_weight = ws(float(os.environ.get('QQ_LM', '3')))
        s.model_regularization = ws(float(os.environ.get('QQ_REG', '8'))); s.patch_smoothness = ws(float(os.environ.get('QQ_PATCH', '2')))
        p.body_conform_solve_settings = s
        size, pix = unreal.PromotedFrameUtils.get_promoted_frame_as_pixel_array_from_disk(PHOTO)
        tr = mhs.track_face_landmarks_from_image(pix, size.x, size.y)
        if isinstance(tr, tuple) and len(tr) == 1: tr = tr[0]
        vi = unreal.MinimalViewInfo(); vi.location = cam; vi.rotation = unreal.Rotator(pitch=0.0, yaw=-90.0, roll=0.0)
        vi.fov = fov; vi.aspect_ratio = float(W) / float(H); vi.projection_mode = unreal.CameraProjectionMode.PERSPECTIVE
        p.curve_tracking_points = tr; p.camera_view_info = vi; p.image_size = size
        key = unreal.MetaHumanCharacterTargetMeshKey(); key.head_mesh = head
        ok = mhs.conform_to_target_meshes(c, key, p); log('photo fit', name, ok)
        # 50/50 with the pretty base (author: ~50-60% resemblance)
        mixw = float(os.environ.get('QQ_PHOTO_MIX', '0.5'))
        if ok and mixw < 1.0:
            a1 = list(mhs.get_face_model_coefficients(c))
            mhs.set_face_model_coefficients(c, [x * (1 - mixw) + y * mixw for x, y in zip(a0, a1)]); mhs.commit_face_state(c); log('photo mix', mixw)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_asset(char, only_if_is_dirty=False)

def attach_armour(actor, pj, lift, bind_mesh=None):
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    # the costume was fitted to the exported FullBody in ITS bind pose: take each follow bone's transform there and attach the piece
    # with that relative transform, so it follows the bone in whatever reference pose the assembled body actually uses
    bind = None
    if bind_mesh:
        bm = unreal.load_asset(bind_mesh)
        if bm: bind = eas.spawn_actor_from_object(bm, unreal.Vector(0, 0, 0)); bind.set_actor_label('BIND_REF'); log('bind ref', bind_mesh)
    comps = actor.get_components_by_class(unreal.SkeletalMeshComponent)
    body = next((x for x in comps if x.does_socket_exist('head') and 'body' in x.get_name().lower()), None) or next(x for x in comps if x.does_socket_exist('head'))
    n = 0; skip = set(os.environ.get('QQ_ARMOUR_SKIP', 'SUR_Coat_Sim').split(','))
    for piece, d in json.load(open(pj)).items():
        if piece in skip: continue
        sm = unreal.load_asset(d['asset'])
        if sm is None: continue
        a = eas.spawn_actor_from_object(sm, unreal.Vector(0, 0, 0)); bone = d['bone']
        if 'matrix' in d:
            m = d['matrix']; xa = unreal.Vector(m[0][0], -m[1][0], m[2][0]); za = unreal.Vector(m[0][2], -m[1][2], m[2][2])
            a.set_actor_location(unreal.Vector(m[0][3] * 100, -m[1][3] * 100, m[2][3] * 100), False, False); a.set_actor_rotation(unreal.MathLibrary.make_rot_from_xz(xa, za), False)
            if d['group'] == 'Weapon': bone = 'pelvis'
        if bind is not None:
            bt = bind.skeletal_mesh_component.get_socket_transform(bone, unreal.RelativeTransformSpace.RTS_WORLD)
            rel = a.get_actor_transform().make_relative(bt)
            a.attach_to_component(body, bone, unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.KEEP_RELATIVE, False)
            a.root_component.set_relative_transform(rel, False, False)
        else:
            a.attach_to_component(body, bone, unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD, False)
        n += 1
    if bind is not None:
        try:
            log('bounds bind', bind.skeletal_mesh_component.bounds.box_extent, bind.skeletal_mesh_component.bounds.origin, 'bp body', body.bounds.box_extent, body.bounds.origin)
            for bn in ('head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'foot_l'):
                b1 = bind.skeletal_mesh_component.get_socket_location(bn); b2 = body.get_socket_location(bn); log('bone check', bn, 'bind', b1, 'bp', b2)
        except Exception as e: log('bone check fail', e)
        bind.destroy_actor()
    if lift: actor.set_actor_location(unreal.Vector(0, 0, lift), False, False)
    log('armour attached', n, pj)

def set_body(name, targets):
    c = unreal.load_asset(f'/Game/QQ/{name}')
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit ' + name)
    try:
        f0 = list(mhs.get_face_model_coefficients(c))
        cons = list(mhs.get_body_constraints(c))
        for k in cons:
            n = str(k.name).lower().replace(' ', '_')
            if n in targets: k.is_active = True; k.target_measurement = max(k.min_measurement, min(k.max_measurement, float(targets[n])))
        mhs.set_body_constraints(c, cons); mhs.commit_body_state(c)
        f1 = list(mhs.get_face_model_coefficients(c))
        log('body set', name, json.dumps({str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(c)}), 'face diff', max(abs(a - b) for a, b in zip(f0, f1)) if f0 else 'n/a')
    finally: mhs.remove_object_to_edit(c)
    EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)

def clear_outfit(name):
    c = unreal.load_asset(f'/Game/QQ/{name}'); inst = c.internal_collection.default_instance
    for slot in ('Outfits', 'Top Garment', 'Bottom Garment'):
        try: r = inst.set_single_slot_selection(slot, unreal.MetaHumanPaletteItemKey()); log('cleared slot', name, slot, r)
        except Exception as e: log('clear slot fail', slot, e)
    if mhs.try_add_object_to_edit(c):
        try:
            ss = c.skin_settings; sk = ss.skin; sk.show_top_underwear = True; ss.skin = sk; mhs.commit_skin_settings(c, ss)
        finally: mhs.remove_object_to_edit(c)
    EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)

FEMALE_PRESETS = ['Ada', 'Aera', 'Aoi', 'Asha', 'Bo', 'Cameron', 'Celeste', 'Etta', 'Grace', 'Jelena', 'Lani', 'Sook-ja', 'Sunita', 'Tuya', 'Vivian', 'Zuri']
def step_multishots(items, light):
    """items: [(character asset path, out png stem, [view names])] -> one preview actor at a time, 3/4 etc. in a neutral light"""
    import time
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem); les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    aes = unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    if light == 'daylight':
        # neutral daylight studio: sky + soft key/fill/rim, light-grey backdrop, no warm tint
        sky = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 300)); sl = sky.light_component
        sl.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
        sl.set_editor_property('cubemap', unreal.load_asset('/Engine/MapTemplates/Sky/DaylightAmbientCubemap') or unreal.load_asset('/Engine/MapTemplates/Sky/SunsetAmbientCubemap'))
        sl.set_intensity(float(os.environ.get('QQ_SKY', '1.0'))); sl.set_editor_property('lower_hemisphere_is_black', False)
        for yaw, pitch, inten, col in ((-120, -22, float(os.environ.get('QQ_KEY', '5.0')), (1.0, 0.98, 0.95)), (-60, -8, float(os.environ.get('QQ_FILL', '2.6')), (1.0, 0.93, 0.85)), (75, -30, 2.0, (1, 1, 1)), (-90, 25, 0.8, (1.0, 0.95, 0.9))):
            d = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 300), unreal.Rotator(roll=0, pitch=pitch, yaw=yaw))
            lc = d.light_component; lc.set_intensity(inten); lc.set_light_color(unreal.LinearColor(*col, 1)); lc.set_editor_property('light_source_angle', 12.0)
        if os.environ.get('QQ_ALLROUND'):
            for yw in (0, 90, 180, 270):
                d = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 300), unreal.Rotator(roll=0, pitch=-25, yaw=yw))
                lc = d.light_component; lc.set_intensity(float(os.environ['QQ_ALLROUND'])); lc.set_editor_property('light_source_angle', 20.0); lc.set_cast_shadows(False)
            log('all-round fill', os.environ['QQ_ALLROUND'])
        sl.recapture_sky()
        bgm = unreal.load_asset('/Game/QQ/Mat/M_QQ_Backdrop')
        if os.environ.get('QQ_BG_WHITE'):
            wv = float(os.environ['QQ_BG_WHITE']); wn = '/Game/QQ/Mat/M_QQ_White'
            if EAL.does_asset_exist(wn): EAL.delete_asset(wn)
            MEL = unreal.MaterialEditingLibrary
            wm = unreal.AssetToolsHelpers.get_asset_tools().create_asset('M_QQ_White', '/Game/QQ/Mat', unreal.Material, unreal.MaterialFactoryNew())
            cc3 = MEL.create_material_expression(wm, unreal.MaterialExpressionConstant3Vector, -300, 0); cc3.constant = unreal.LinearColor(wv, wv, wv, 1)
            wm.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT); wm.set_editor_property('two_sided', True)
            MEL.connect_material_property(cc3, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR); MEL.recompile_material(wm); EAL.save_asset(wn); bgm = wm; log('white backdrop', wv)
        dome = eas.spawn_actor_from_object(unreal.load_asset('/Engine/BasicShapes/Sphere'), unreal.Vector(0, 0, 150)); dome.set_actor_scale3d(unreal.Vector(30, 30, 30))
        if bgm: dome.static_mesh_component.set_material(0, bgm)
        dome.static_mesh_component.set_cast_shadow(False)
    else:
        les.load_level('/MetaHumanCharacter/LightingEnvironments/' + light)   # read-only, never saved
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    for cv in os.environ.get('QQ_CVARS', 'r.TextureStreaming 0;r.Streaming.FullyLoadUsedTextures 1').split(';'):
        if cv.strip(): unreal.SystemLibrary.execute_console_command(world, cv.strip()); log('cvar', cv)
    W = int(os.environ.get('QQ_RES', '1024'))
    HH = int(os.environ.get('QQ_RES_H', str(W)))
    rt = unreal.RenderingLibrary.create_render_target2d(world, W, HH, unreal.TextureRenderTargetFormat.RTF_RGBA8)
    cap = eas.spawn_actor_from_class(unreal.SceneCapture2D, unreal.Vector(0, 0, 0)); cc = cap.capture_component2d
    cc.texture_target = rt; cc.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR; cc.capture_every_frame = False
    cc.fov_angle = float(os.environ.get('QQ_FOV', '16'))
    pps = cc.post_process_settings; pps.override_vignette_intensity = True; pps.vignette_intensity = 0.0; cc.post_process_settings = pps
    ANG = {'old': 0, '34': 38, 'yon': 88, 'orqa': 180, 'q34': 38, 'yuz': 0, 'yuz34': 38}
    pps = cc.post_process_settings; pps.override_auto_exposure_bias = True; pps.auto_exposure_bias = float(os.environ.get('QQ_SHOT_EXPO', '1.0')); cc.post_process_settings = pps
    st = {'k': -1, 'phase': 'next', 't': time.time(), 'c': None, 'actor': None, 'jobs': [], 'w': 0, 'first': True}
    def tick(dt):
        if st.get('busy'): return          # open_editor / spawn pump nested Slate ticks: no re-entry
        st['busy'] = True
        try:
            now = time.time()
            if st['phase'] == 'next':
                if st['c'] is not None and st['k'] + 1 < len(items):
                    try: aes.close_all_editors_for_asset(st['c'])
                    except Exception as e: log('close fail', e)
                st['k'] += 1
                if st['k'] >= len(items):
                    unreal.unregister_slate_post_tick_callback(st['h']); log('multishots done'); LOG.close(); unreal.SystemLibrary.quit_editor(); return
                path, stem, views = items[st['k']][:3]
                extra0 = items[st['k']][3] if len(items[st['k']]) > 3 else {}
                if extra0.get('bp'):
                    # assembled MetaHuman blueprint (rigged face, grooms, real materials)
                    bpc = unreal.EditorAssetLibrary.load_blueprint_class(extra0['bp'])
                    st['c'] = None; st['actor'] = eas.spawn_actor_from_class(bpc, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0))
                    log('spawned bp', extra0['bp'], st['actor'])
                    # grey-face fix: keep every texture of the assembled MetaHuman fully resident before capturing
                    for mc in st['actor'].get_components_by_class(unreal.MeshComponent):
                        try: mc.prestream_textures(120.0, True)
                        except Exception as e: log('prestream fail', mc.get_name(), e)
                        try:
                            for mi in mc.get_materials():
                                if mi is None: continue
                                for tx in unreal.MaterialEditingLibrary.get_used_textures(mi) if hasattr(unreal.MaterialEditingLibrary, 'get_used_textures') else []:
                                    try: tx.set_force_mip_levels_to_be_resident(120.0, 0)
                                    except Exception: pass
                        except Exception as e: log('resident fail', e)
                    if extra0.get('armour'): attach_armour(st['actor'], extra0['armour'], extra0.get('lift', 0), extra0.get('bind'))
                    st['phase'] = 'warm'; st['t'] = now; return
                st['c'] = unreal.load_asset(path)
                if st['c'] is None: log('missing', path); return
                aes.open_editor_for_assets([st['c']])
                log('opened', path)
                st['actor'] = mhs.spawn_meta_human_actor(character=st['c'])
                log('spawned', st['actor'])
                extra = items[st['k']][3] if len(items[st['k']]) > 3 else {}
                if extra.get('armour'): attach_armour(st['actor'], extra['armour'], extra.get('lift', 0), extra.get('bind'))
                if extra.get('body'):
                    try:
                        nb = unreal.load_asset(extra['body'])
                        for sk in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent):
                            if sk.does_socket_exist('thigh_l') and 'body' in sk.get_name().lower():
                                mats = [sk.get_material(i) for i in range(sk.get_num_materials())]
                                st['h0'] = sk.get_socket_location('head'); log('head before swap', st['h0'])
                                sk.set_skeletal_mesh_asset(nb)
                                for i, mt in enumerate(mats[:sk.get_num_materials()]): sk.set_material(i, mt)
                                if extra.get('head_scale'):
                                    pass
                                log('body swapped', sk.get_name(), extra['body'], 'mats', len(mats), '->', sk.get_num_materials())
                    except Exception as e: log('body swap fail', e)
                for sp in extra.get('static', []):
                    try:
                        body_c = next(x for x in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent) if x.does_socket_exist('thigh_l') and 'body' in x.get_name().lower())
                        M = sp['m']; S = lambda v: unreal.Vector(v[0], -v[1], v[2])
                        xa, za = S([M[0][0], M[1][0], M[2][0]]), S([M[0][2], M[1][2], M[2][2]])
                        loc = unreal.Vector(M[0][3] * 100, -M[1][3] * 100, M[2][3] * 100)
                        if sp.get('fwd_cm'):
                            fv = body_c.get_right_vector(); loc = unreal.Vector(loc.x + fv.x * sp['fwd_cm'], loc.y + fv.y * sp['fwd_cm'], loc.z)
                        if sp.get('scale'): pass
                        sa = eas.spawn_actor_from_object(unreal.load_asset(sp['mesh']), loc, unreal.MathLibrary.make_rot_from_xz(xa, za))
                        sa.static_mesh_component.set_mobility(unreal.ComponentMobility.MOVABLE)
                        if sp.get('scale'): sa.set_actor_scale3d(unreal.Vector(sp['scale'], sp['scale'], sp['scale']))
                        sa.root_component.attach_to_component(body_c, sp['bone'], unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD, False); log('static placed', sp['mesh'], sp['bone'])
                    except Exception as e: log('static fail', sp.get('mesh'), e)
                if extra.get('lift'):
                    st['actor'].set_actor_location(unreal.Vector(0, 0, float(extra['lift'])), False, False)
                for cp in extra.get('costume', []):
                    try:
                        body_c = next(x for x in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent) if x.does_socket_exist('thigh_l') and 'body' in x.get_name().lower())
                        a = unreal.load_asset(cp)
                        if isinstance(a, unreal.SkeletalMesh):
                            ka = eas.spawn_actor_from_object(a, body_c.get_world_location(), body_c.get_world_rotation()); sc = ka.skeletal_mesh_component
                            sc.set_mobility(unreal.ComponentMobility.MOVABLE)
                            ka.root_component.attach_to_component(body_c, '', unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, False)
                            off = extra.get('costume_offset', {}).get(cp.split('/')[-1])
                            if off:
                                ka.root_component.set_relative_location(unreal.Vector(*off[:3]), False, False)
                                if len(off) > 3: ka.root_component.set_relative_scale3d(unreal.Vector(off[3], off[3], off[3]))
                            sc.set_leader_pose_component(body_c); sc.set_update_animation_in_editor(True); log('costume skinned', cp, off)
                        else:
                            log('costume skipped (static in costume list)', cp)
                    except Exception as e: log('costume fail', cp, e)
                if extra.get('pose'):
                    try:
                        pa = unreal.load_asset(extra['pose'])
                        for sk in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent):
                            if sk.does_socket_exist('thigh_l') or (extra.get('pose_all') and sk.does_socket_exist('head')):
                                sk.set_animation_mode(unreal.AnimationMode.ANIMATION_SINGLE_NODE); sk.set_animation(pa)
                                sk.set_update_animation_in_editor(True); sk.set_play_rate(0.0); sk.set_position(0.0, False); log('pose on', sk.get_name(), extra['pose'])
                    except Exception as e: log('pose fail', e)
                st['phase'] = 'warm'; st['t'] = now; log('preview', path); return
            if st['phase'] == 'warm':
                need = float(os.environ.get('QQ_WARM_S', '420')) if st['first'] else float(os.environ.get('QQ_WARM_EACH', '90'))
                if now - st['t'] < need: return
                st['first'] = False
                path, stem, views = items[st['k']][:3]
                exg = items[st['k']][3] if len(items[st['k']]) > 3 else {}
                if exg.get('groom_color') and st.get('gc') != st['k']:
                    # groom instance parameters exist only once the preview is assembled (make_look saw an empty list, so every
                    # groom stayed on the default melanin 0.16 = blond): set them here, save, and warm once more before shooting
                    st['gc'] = st['k']
                    try:
                        inst = st['c'].internal_collection.default_instance; n_set = 0
                        for ip in inst.get_instance_parameter_item_paths():
                            prm = inst.get_instance_parameters(item_path=ip)
                            if not st.get('gc_logged'): log('instance params', [str(p.name) for p in prm])
                            for p in prm:
                                v = exg['groom_color'].get(str(p.name))
                                if v is None: continue
                                r = p.set_bool(value=bool(v)) if isinstance(v, bool) else p.set_float(value=float(v)); n_set += 1 if r is not False else 0
                        st['gc_logged'] = True
                        EAL.save_asset(st['c'].get_path_name(), only_if_is_dirty=False); log('groom colour set', path, n_set, exg['groom_color'])
                    except Exception as e: log('groom colour fail', e, traceback.format_exc())
                    st['t'] = now; return
                if exg.get('rebind'):
                    try:
                        log('groom api', [x for x in dir(unreal) if 'groom' in x.lower() or 'hairstrand' in x.lower()])
                        face = next((x for x in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent) if 'face' in x.get_name().lower()), None)
                        fm = face.skeletal_mesh_asset if face else None; log('face comp', face.get_name() if face else None, fm.get_path_name() if fm else None)
                        lib = getattr(unreal, 'GroomLibrary', None); log('GroomLibrary fns', [m for m in dir(lib) if not m.startswith('_')] if lib else None)
                        for g in st['actor'].get_components_by_class(unreal.GroomComponent):
                            ga = g.groom_asset; ob = g.binding_asset
                            log('groom comp', g.get_name(), ga.get_path_name() if ga else None, 'binding', ob.get_path_name() if ob else None, 'bind target', ob.target_skeletal_mesh.get_path_name() if ob and ob.target_skeletal_mesh else None)
                            if not (ga and fm and lib): continue
                            nb = None
                            for fn in ('create_new_groom_binding_asset_from_skeletal_mesh', 'create_new_groom_binding_asset'):
                                if hasattr(lib, fn):
                                    try:
                                        nb = getattr(lib, fn)(f'/Game/QQ/GroomBind/GB_{g.get_name()}', ga, fm, 2 if 'from' in fn else fm, None) if False else None
                                    except Exception as e: log('bind fn fail', fn, e)
                            log('binding probe only', g.get_name())
                    except Exception as e: log('rebind fail', e, traceback.format_exc())
                if exg.get('groom_follow') and st.get('h0') is not None:
                    try:
                        bodyc = next(x for x in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent) if x.does_socket_exist('thigh_l'))
                        H1 = bodyc.get_socket_location('head'); H0 = st['h0']; d = unreal.Vector(H1.x - H0.x, H1.y - H0.y, H1.z - H0.z); log('head after swap', H1, 'delta', d)
                        for g in st['actor'].get_components_by_class(unreal.GroomComponent):
                            L0 = g.get_world_location(); g.set_world_location(unreal.Vector(L0.x + d.x, L0.y + d.y, L0.z + d.z), False, False); log('groom moved', g.get_name())
                    except Exception as e: log('groom follow fail', e)
                if exg.get('groom_scale'):
                    try:
                        gs = float(exg['groom_scale']); bodyc = next(x for x in st['actor'].get_components_by_class(unreal.SkeletalMeshComponent) if x.does_socket_exist('thigh_l'))
                        H = bodyc.get_socket_location('head')
                        for g in st['actor'].get_components_by_class(unreal.GroomComponent):
                            L0 = g.get_world_location(); s0 = g.get_world_scale()
                            g.set_world_scale3d(unreal.Vector(s0.x * gs, s0.y * gs, s0.z * gs))
                            g.set_world_location(unreal.Vector(H.x + gs * (L0.x - H.x), H.y + gs * (L0.y - H.y), H.z + gs * (L0.z - H.z)), False, False)
                            log('groom scaled', g.get_name(), gs)
                    except Exception as e: log('groom scale fail', e)
                comps = st['actor'].get_components_by_class(unreal.SkeletalMeshComponent)
                body = next((x for x in comps if x.does_socket_exist('head') and 'body' in x.get_name().lower()), None) or next(x for x in comps if x.does_socket_exist('head'))
                head = body.get_socket_location('head'); fwd = body.get_right_vector()
                eye = unreal.Vector(head.x + fwd.x * 8, head.y + fwd.y * 8, head.z + 5); ex = items[st['k']][3] if len(items[st['k']]) > 3 else {}; r = float(ex.get('dist', os.environ.get('QQ_DIST', '95')))
                st['jobs'] = []
                Hb = head.z + 25; ctr = unreal.Vector(head.x, head.y, Hb * 0.5); vf = 2 * math.degrees(math.atan(math.tan(math.radians(cc.fov_angle / 2)) * HH / W)); rb = (Hb * 0.56) / math.tan(math.radians(vf / 2))
                if os.environ.get('QQ_SAVE_MAP') and not st.get('map_saved'):
                    # viewing level: same lights/backdrop + the assembled character + a camera framing her
                    try:
                        rbv = (Hb * 0.56) / math.tan(math.radians(vf / 2)); camloc = unreal.Vector(ctr.x + fwd.x * rbv, ctr.y + fwd.y * rbv, ctr.z + 10)
                        cam = eas.spawn_actor_from_class(unreal.CineCameraActor, camloc, unreal.MathLibrary.find_look_at_rotation(camloc, ctr))
                        cam.set_actor_label('QQ_View_Camera')
                        try:
                            ccc = cam.get_cine_camera_component(); fb = ccc.filmback; fb.sensor_width = 36.0; fb.sensor_height = 20.25; ccc.filmback = fb
                        except Exception as e: log('filmback', e)
                        try: cam.get_cine_camera_component().set_editor_property('current_focal_length', 36.0 / (2 * math.tan(math.radians(cc.fov_angle / 2))))
                        except Exception as e: log('cam lens', e)
                        try: cam.get_cine_camera_component().focus_settings.manual_focus_distance = rbv
                        except Exception: pass
                        ok = unreal.EditorLoadingAndSavingUtils.save_map(world, os.environ['QQ_SAVE_MAP']); log('view map saved', os.environ['QQ_SAVE_MAP'], ok)
                    except Exception as e: log('view map fail', e, traceback.format_exc())
                    st['map_saved'] = True
                for nm in views:
                    if nm in ('tt360', 'face360'):
                        fps = 24; n = int(fps * float(os.environ.get('QQ_TT_S' if nm == 'tt360' else 'QQ_FACE_S', '12' if nm == 'tt360' else '6')))
                        os.makedirs(f'{OUT}/tt_{stem}', exist_ok=True)
                        base = 0 if nm == 'tt360' else int(fps * float(os.environ.get('QQ_TT_S', '12')))
                        for i in range(n):
                            a = math.radians(360.0 * i / n) if nm == 'tt360' else math.radians(-60 + 120.0 * (0.5 - 0.5 * math.cos(math.pi * i / max(1, n - 1))))
                            dx, dy = fwd.x * math.cos(a) - fwd.y * math.sin(a), fwd.x * math.sin(a) + fwd.y * math.cos(a)
                            if nm == 'tt360':
                                rbv = (Hb * 0.54) / math.tan(math.radians(vf / 2)); tg = unreal.Vector(ctr.x, ctr.y, ctr.z)
                                st['jobs'].append((f'tt_{stem}/f_{base + i:04d}.png', unreal.Vector(tg.x + dx * rbv, tg.y + dy * rbv, tg.z + 10), tg))
                            else:
                                rf = 32.0 / math.tan(math.radians(vf / 2)) * 0.5; tg = unreal.Vector(eye.x, eye.y, eye.z - 4)
                                st['jobs'].append((f'tt_{stem}/f_{base + i:04d}.png', unreal.Vector(tg.x + dx * rf, tg.y + dy * rf, tg.z + 2), tg))
                        continue
                    if nm == 'oyoq':   # crotch / inner-thigh close-up from the front
                        tg = unreal.Vector(head.x, head.y, Hb * 0.44); dd = unreal.Vector(fwd.x, fwd.y, 0)
                        st['jobs'].append((f'{stem}_oyoq.png', unreal.Vector(tg.x + dd.x * rb * 0.33, tg.y + dd.y * rb * 0.33, tg.z), tg)); continue
                    full = nm.startswith('b_'); key = nm[2:] if full else nm
                    ca, sa = math.cos(math.radians(ANG[key])), math.sin(math.radians(ANG[key]))
                    d = unreal.Vector(fwd.x * ca - fwd.y * sa, fwd.x * sa + fwd.y * ca, 0)
                    if full: st['jobs'].append((f'{stem}_{key}.png', unreal.Vector(ctr.x + d.x * rb, ctr.y + d.y * rb, ctr.z + 10), ctr))
                    else: st['jobs'].append((f'{stem}_{nm}.png', unreal.Vector(eye.x + d.x * r, eye.y + d.y * r, eye.z + 3), eye))
                st['phase'] = 'shoot'; st['w'] = 0; return
            if st['phase'] == 'shoot':
                if not st['jobs']: st['phase'] = 'next'; return
                fn, loc, eye = st['jobs'][0]
                if st['w'] == 0: cap.set_actor_location(loc, False, False); cap.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc, eye), False)
                tt = fn.startswith('tt_')
                if st['w'] < (int(os.environ.get('QQ_TT_CAPS', '3')) if tt and not fn.endswith('f_0000.png') else 8): cc.capture_scene(); st['w'] += 1; return
                if tt:
                    d0, f0 = fn.split('/'); unreal.RenderingLibrary.export_render_target(world, rt, f'{OUT}/{d0}', f0)
                    if f0.endswith('0.png'): log('tt frame', fn)
                else: unreal.RenderingLibrary.export_render_target(world, rt, os.environ.get('QQ_SHOT_DIR', f'{OUT}/shots'), fn); log('shot', fn)
                st['jobs'].pop(0); st['w'] = 0
        except Exception as e:
            unreal.log_error('QQB tick ERROR ' + repr(e)); log('tick ERROR', repr(e), traceback.format_exc()); st['phase'] = 'next'
        finally:
            st['busy'] = False
    unreal.EditorPythonScripting.set_keep_python_script_alive(True)
    st['h'] = unreal.register_slate_post_tick_callback(tick)
    global KEEP
    KEEP = True

KEEP = False
try:
    if 'gallery' in STEPS:
        os.makedirs(f'{OUT}/shots', exist_ok=True)
        step_multishots([(f'{OPT}/Presets/{p}', f'preset_{p}', ['34', 'old']) for p in (os.environ['QQ_PRESETS'].split(',') if os.environ.get('QQ_PRESETS') else FEMALE_PRESETS)], os.environ.get('QQ_LIGHT', 'Studio'))
    if 'track' in STEPS: step_track()
    if 'variants' in STEPS: step_variants()
    if 'fitphoto' in STEPS: step_fitphoto()
    def run_armour(env):
        for k, v in env.items(): os.environ[k] = v
        os.environ['QQ_NOQUIT'] = '1'
        exec(open('F:/qirq-qiz/tools/metahuman/mh_armour.py', encoding='utf-8').read(), {'__name__': 'armour'}); log('armour import ran', env.get('QQ_ARM_PREFIX'))
    if 'armour_g' in STEPS:
        run_armour({'QQ_ARM_SRC': 'F:/qirq-qiz/tools/blender/guloyim_costume/out', 'QQ_ARM_DST': '/Game/QQ/Gul', 'QQ_ARM_MANIFEST': 'guloyim_costume_manifest.json', 'QQ_ARM_PREFIX': 'Gul',
                    'QQ_ARM_OUT': f'{OUT}/gul_pieces.json', 'QQ_ARM_TINT': json.dumps({'Cloth': [0.42, 0.45, 0.62, 1.0]}), 'QQ_ARM_IRON': json.dumps({'Armor': [0.85, 1.08], 'Lamellar': [0.8, 1.1]}), 'QQ_ARM_CALM': 'Lamellar', 'QQ_ARM_TWOSIDED': '1'})
    if 'armour_s' in STEPS:
        run_armour({'QQ_ARM_SRC': 'F:/qirq-qiz/tools/blender/surtaysha/out', 'QQ_ARM_DST': '/Game/QQ/Surt', 'QQ_ARM_MANIFEST': 'surtaysha_manifest.json', 'QQ_ARM_PREFIX': 'Surt',
                    'QQ_ARM_OUT': f'{OUT}/surt_pieces.json', 'QQ_ARM_TINT': json.dumps({'Trim': [0.78, 0.66, 0.5, 1.12]}), 'QQ_ARM_IRON': 'null', 'QQ_ARM_CALM': 'Lamellar', 'QQ_ARM_TWOSIDED': '0'})
    if 'measure' in STEPS:
        for nm in ('MHC_surtaysha', 'MHC_surtaysha_k', 'MHC_gulayim_final'):
            c = unreal.load_asset(f'/Game/QQ/{nm}')
            if c and mhs.try_add_object_to_edit(c):
                try: log('constraints', nm, json.dumps({str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(c)}))
                finally: mhs.remove_object_to_edit(c)
    if 'step1b' in STEPS:
        # Surtaysha: harsher face (more Aoi, less Bo), shaved cheeks + pointed goatee + long moustache, muscular body
        make_look('MHC_surtaysha_k', {'src': '/Game/QQ/MHC_surtaysha', 'presets': [['Aoi', 0.65], ['Bo', 0.15]], 'tex': int(os.environ.get('QQ_S_TEX', '20')), 'u': 0.48, 'v': 0.62, 'lip_red': 0.5, 'lip_op': 0.0,
                                      'hair': 'WI_Hair_S_SlickBack', 'brows': 'WI_Eyebrows_M_Thick', 'grooms': [['Beard', 'Beards', 'WI_Goatee_M_Pointed'], ['Mustache', 'Mustaches', 'WI_Mustache_L_Full']]})
        set_body('MHC_surtaysha_k', {'height': 185, 'chest': 128, 'bicep': 45, 'forearm': 36, 'across_shoulder': 50, 'neck': 47, 'neck_base': 52, 'thigh': 60, 'hip': 102, 'high_hip': 98, 'waist': 94, 'underbust': 112, 'fat': -0.2, 'muscularity': 2.2, 'masculine/feminine': -1.8})
        set_body('MHC_gulayim_final', {'height': 171, 'across_shoulder': 34, 'chest': 90, 'underbust': 72, 'waist': 69, 'hip': 91, 'high_hip': 86, 'inseam': 77, 'thigh': 54, 'muscularity': 0.5, 'fat': -0.8, 'bicep': 27, 'forearm': 23, 'neck': 32, 'neck_base': 34.5})
        clear_outfit('MHC_gulayim_final')
    if 'export_final' in STEPS:
        # final body -> full-body skeletal mesh (A-pose, cm) exported as FBX for the costume refit
        nm = os.environ.get('QQ_DCHAR', 'MHC_surtaysha_k'); geo = f'/Game/QQ/Geo_{nm}'; fn = os.environ['QQ_FINAL_FBX']
        c = unreal.load_asset(f'/Game/QQ/{nm}')
        if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
        try:
            g = unreal.MetaHumanGeometryExportParams(); g.project_path = geo; g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = False; g.body_skeletal_mesh = False; g.overwrite_existing_assets = True
            unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
        finally: mhs.remove_object_to_edit(c)
        EAL.save_directory(geo, only_if_is_dirty=False, recursive=True)
        fb = unreal.load_asset(f'{geo}/{nm}_FullBody'); log('final bounds', nm, fb.get_bounds() if fb else None)
        tk = unreal.AssetExportTask(); tk.object = fb; tk.filename = fn; tk.automated = True; tk.replace_identical = True; tk.prompt = False
        tk.exporter = unreal.SkeletalMeshExporterFBX(); o = unreal.FbxExportOption(); o.collision = False; o.level_of_detail = False; o.export_morph_targets = False
        o.fbx_export_compatibility = unreal.FbxExportCompatibility.FBX_2020; tk.options = o; log('final fbx', fn, unreal.Exporter.run_asset_export_task(tk), os.path.exists(fn))
    if 'import_direct' in STEPS:
        # skinned body meshes built in Blender from the wraps (MH vertex order + weights) -> skeletal meshes on the MetaHuman body skeleton
        ref = unreal.load_asset('/Game/MetaHumans/MHC_gulayim_final/Body/SKM_MHC_gulayim_final_BodyMesh'); skel = ref.skeleton
        log('mh body skeleton', skel.get_path_name() if skel else None)
        for src, name in [x.split('=') for x in os.environ.get('QQ_DIRECT_FBX', '').split(';') if '=' in x]:
            if not os.path.exists(src): log('missing', src); continue
            ui = unreal.FbxImportUI(); ui.import_as_skeletal = True; ui.import_mesh = True; ui.import_materials = False; ui.import_textures = False; ui.import_animations = False
            ui.skeleton = skel; ui.mesh_type_to_import = unreal.FBXImportType.FBXIT_SKELETAL_MESH
            sd = ui.skeletal_mesh_import_data
            for k_, v_ in (('import_morph_targets', False), ('use_t0_as_ref_pose', False), ('preserve_smoothing_groups', True)):
                try: sd.set_editor_property(k_, v_)
                except Exception: pass
            try: sd.set_editor_property('normal_import_method', unreal.FBXNormalImportMethod.FBXNIM_IMPORT_NORMALS)
            except Exception: pass
            tk = unreal.AssetImportTask(); tk.filename = src; tk.destination_path = '/Game/QQ/BodyDirect'; tk.destination_name = name
            tk.automated = True; tk.replace_existing = True; tk.save = True; tk.options = ui
            unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([tk]); m = unreal.load_asset(f'/Game/QQ/BodyDirect/{name}')
            log('imported', name, m, m.skeleton.get_path_name() if m and m.skeleton else None, m.get_bounds() if m else None)
    if 'sregroom' in STEPS:
        # rebuild Surtaysha's groom bindings on the current head: clear each slot, then add the same grooms again
        c = unreal.load_asset('/Game/QQ/MHC_surtaysha_k'); G = f'{OPT}/Grooms/Bindings'; inst = c.internal_collection.default_instance
        for slot in ('Hair', 'Eyebrows', 'Beard', 'Mustache', 'Eyelashes'):
            try: inst.set_single_slot_selection(slot, unreal.MetaHumanPaletteItemKey())
            except Exception as e: log('clear', slot, e)
        EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
        for slot, sub, wi in (('Hair', 'Hair', 'WI_Hair_S_SlickBack'), ('Eyebrows', 'Eyebrows', 'WI_Eyebrows_M_Thick'), ('Beard', 'Beards', 'WI_Goatee_M_Pointed'), ('Mustache', 'Mustaches', 'WI_Mustache_L_Full'), ('Eyelashes', 'Eyelashes', 'WI_Eyelashes_L_SlightCurl')):
            k = add_groom(c, slot, f'{G}/{sub}/{wi}.{wi}')
            if k is None and sub != slot: add_groom(c, slot, f'{G}/{slot}/{wi}.{wi}')
        EAL.save_asset(c.get_path_name(), only_if_is_dirty=False); log('surtaysha grooms re-added')
    if 'snew' in STEPS:
        # clean Surtaysha: same face recipe as step1b on the unconformed source, standard body (the BodyOnly swap replaces the body at render)
        make_look('MHC_surtaysha_f', {'src': '/Game/QQ/MHC_surtaysha', 'presets': [['Aoi', 0.65], ['Bo', 0.15]], 'tex': int(os.environ.get('QQ_S_TEX', '20')), 'u': 0.48, 'v': 0.62, 'lip_red': 0.5, 'lip_op': 0.0,
                                      'hair': 'WI_Hair_S_SlickBack', 'brows': 'WI_Eyebrows_M_Thick', 'grooms': [['Beard', 'Beards', 'WI_Goatee_M_Pointed'], ['Mustache', 'Mustaches', 'WI_Mustache_L_Full']]})
        log('MHC_surtaysha_f made')
    if 'sbrow' in STEPS:
        # alternative brow / moustache grooms on MHC_surtaysha_f (QQ_BROW / QQ_MUST; 'none' clears the slot)
        c = unreal.load_asset('/Game/QQ/MHC_surtaysha_f'); G = f'{OPT}/Grooms/Bindings'; inst = c.internal_collection.default_instance
        for slot, sub, wi in (('Eyebrows', 'Eyebrows', os.environ.get('QQ_BROW', 'WI_Eyebrows_M_FlatThick')), ('Mustache', 'Mustaches', os.environ.get('QQ_MUST', 'WI_Mustache_M_Gunslinger'))):
            if wi == 'none':
                try: inst.set_single_slot_selection(slot, unreal.MetaHumanPaletteItemKey()); log('slot cleared', slot)
                except Exception as e: log('clear fail', slot, e)
            else: add_groom(c, slot, f'{G}/{sub}/{wi}.{wi}')
        EAL.save_asset(c.get_path_name(), only_if_is_dirty=False); log('sbrow done')
    if 'ghair' in STEPS:
        c = unreal.load_asset('/Game/QQ/MHC_gulayim_final'); add_groom(c, 'Hair', f'{OPT}/Grooms/Bindings/Hair/WI_Hair_L_Straight.WI_Hair_L_Straight'); EAL.save_asset(c.get_path_name(), only_if_is_dirty=False); log('guloyim hair re-added')
    if 'import_costume' in STEPS:
        # skinned costume groups (BodyOnly armature) -> skeletal meshes on the MH body skeleton, Gul materials by slot keyword
        skel = unreal.load_asset('/Game/MetaHumans/MHC_gulayim_final/Body/SKM_MHC_gulayim_final_BodyMesh').skeleton
        cdir = os.environ.get('QQ_COSTUME_DIR'); pref = os.environ.get('QQ_COSTUME_MAT', '/Game/QQ/Gul/Mat/M_Gul_')
        keys = os.environ.get('QQ_COSTUME_KEYS', 'Amulet,Lamellar,Cloth,Jewel,Trim,Weapon,Armor').split(',')
        for f in sorted(os.listdir(cdir)):
            if not f.lower().endswith('.fbx'): continue
            name = f[:-4]; ui = unreal.FbxImportUI(); ui.import_as_skeletal = True; ui.import_mesh = True; ui.import_materials = False; ui.import_textures = False; ui.import_animations = False
            ui.skeleton = skel; ui.mesh_type_to_import = unreal.FBXImportType.FBXIT_SKELETAL_MESH
            tk = unreal.AssetImportTask(); tk.filename = f'{cdir}/{f}'; tk.destination_path = '/Game/QQ/Costume'; tk.destination_name = name
            tk.automated = True; tk.replace_existing = True; tk.save = True; tk.options = ui
            unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([tk]); m = unreal.load_asset(f'/Game/QQ/Costume/{name}')
            if not m: log('costume import fail', f); continue
            mats = m.materials; out = []
            for sm in mats:
                sn = str(sm.material_slot_name); k = next((k for k in keys if k.lower() in sn.lower()), 'Armor')
                mi = unreal.load_asset(pref + k); sm.material_interface = mi or sm.material_interface; out.append(sm); log('slot', name, sn, '->', k, bool(mi))
            m.materials = out; EAL.save_asset(m.get_path_name(), only_if_is_dirty=False); log('costume imported', name, m.skeleton.get_name())
        for f in [x for x in os.environ.get('QQ_STATIC_FBX', '').split(';') if x]:
            name = os.path.basename(f)[:-4]; ui = unreal.FbxImportUI(); ui.import_as_skeletal = False; ui.import_mesh = True; ui.import_materials = False; ui.import_textures = False
            ui.mesh_type_to_import = unreal.FBXImportType.FBXIT_STATIC_MESH
            try: ui.static_mesh_import_data.set_editor_property('combine_meshes', True)
            except Exception: pass
            tk = unreal.AssetImportTask(); tk.filename = f; tk.destination_path = '/Game/QQ/Costume'; tk.destination_name = name; tk.automated = True; tk.replace_existing = True; tk.save = True; tk.options = ui
            unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([tk]); sm_ = unreal.load_asset(f'/Game/QQ/Costume/{name}')
            if sm_:
                k = 'Amulet' if 'mulet' in name else 'Weapon'; mi = unreal.load_asset(pref + k)
                for i in range(len(sm_.static_materials)): sm_.set_material(i, mi)
                EAL.save_asset(sm_.get_path_name(), only_if_is_dirty=False); log('static imported', name, k)
    if 'giris' in STEPS:
        # Guloyim: dark warm brown iris, visible, normal size (logs the eye settings fields to find the right ones)
        c = unreal.load_asset('/Game/QQ/MHC_gulayim_final')
        if mhs.try_add_object_to_edit(c):
            try:
                es = c.eyes_settings
                def fields(o): return [m for m in dir(o) if not m.startswith('_') and not callable(getattr(o, m, None))]
                log('eyes fields', fields(es))
                for side in [m for m in fields(es) if 'eye' in m.lower()] or ['']:
                    e = getattr(es, side) if side else es; log('eye side', side, {m: str(getattr(e, m))[:80] for m in fields(e)})
                    for sub in [m for m in fields(e) if 'iris' in m.lower()]:
                        ir = getattr(e, sub); log('iris', side, sub, {m: str(getattr(ir, m))[:80] for m in fields(ir)})
                        for m in fields(ir):
                            v = getattr(ir, m)
                            if isinstance(v, unreal.LinearColor) and ('primary' in m.lower() or 'color' in m.lower()): setattr(ir, m, unreal.LinearColor(0.16, 0.085, 0.04, 1.0))
                            if 'size' in m.lower() and isinstance(v, float): setattr(ir, m, float(os.environ.get('QQ_IRIS_SIZE', str(v))))
                            if m == 'global_tint': setattr(ir, m, unreal.LinearColor(0.9, 0.85, 0.8, 1.0))
                        setattr(e, sub, ir)
                    if side: setattr(es, side, e)
                mhs.commit_eyes_settings(c, es); log('iris set')
            except Exception as ex: log('iris fail', ex, traceback.format_exc())
            finally: mhs.remove_object_to_edit(c)
            EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
    if 'gfix' in STEPS:
        # Guloyim: no MH top underwear, card/mesh eyelashes instead of the lash groom (the groom drifted onto the cheeks after the body swap)
        c = unreal.load_asset('/Game/QQ/' + os.environ.get('QQ_FIXCHAR', 'MHC_gulayim_final'))
        if mhs.try_add_object_to_edit(c):
            try:
                ss = c.skin_settings; sk = ss.skin; sk.show_top_underwear = False; ss.skin = sk; mhs.commit_skin_settings(c, ss)
                hm = c.head_model_settings; el = hm.eyelashes; el.enable_grooms = os.environ.get('QQ_LASH_GROOM', '0') == '1'; hm.eyelashes = el; mhs.commit_head_model_settings(c, hm)
                log('gfix: top underwear off, lash grooms', el.enable_grooms)
            finally: mhs.remove_object_to_edit(c)
            EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
    if 'mkhead' in STEPS:
        # single-frame anim: only the head bone scaled (QQ_HEAD_S), everything else reference pose
        hsc = float(os.environ.get('QQ_HEAD_S', '1.07')); dst = '/Game/QQ/Anims/MM_HeadScale'
        idle = unreal.load_asset('/Game/QQ/Anims/MM_Idle_MH'); skel = idle.get_editor_property('skeleton')
        if EAL.does_asset_exist(dst): EAL.delete_asset(dst)
        fac = unreal.AnimSequenceFactory(); fac.set_editor_property('target_skeleton', skel)
        seq = unreal.AssetToolsHelpers.get_asset_tools().create_asset('MM_HeadScale', '/Game/QQ/Anims', unreal.AnimSequence, fac)
        ref = unreal.AnimPoseExtensions.get_reference_pose(skel); hl = unreal.AnimPoseExtensions.get_bone_pose(ref, 'head', unreal.AnimPoseSpaces.LOCAL)
        ctrl = seq.controller; ctrl.open_bracket(unreal.Text('head scale'))
        try: ctrl.set_frame_rate(unreal.FrameRate(30, 1))
        except Exception as e: log('framerate', e)
        ctrl.set_number_of_frames(unreal.FrameNumber(1))
        try: ctrl.add_bone_curve('head')
        except Exception: ctrl.add_bone_track('head')
        ctrl.set_bone_track_keys('head', [hl.translation] * 2, [hl.rotation] * 2, [unreal.Vector(hsc, hsc, hsc)] * 2)
        ctrl.close_bracket(); EAL.save_asset(dst, only_if_is_dirty=False); log('head scale anim saved', hsc)
    if 'mkpose' in STEPS:
        ang = math.radians(float(os.environ.get('QQ_ABD', '12'))); dst = '/Game/QQ/Anims/MM_WideStance'
        idle = unreal.load_asset('/Game/QQ/Anims/MM_Idle_MH'); skel = idle.get_editor_property('skeleton')
        if EAL.does_asset_exist(dst): EAL.delete_asset(dst)
        fac = unreal.AnimSequenceFactory(); fac.set_editor_property('target_skeleton', skel)
        seq = unreal.AssetToolsHelpers.get_asset_tools().create_asset('MM_WideStance', '/Game/QQ/Anims', unreal.AnimSequence, fac)
        ref = unreal.AnimPoseExtensions.get_reference_pose(skel); W, Lc = unreal.AnimPoseSpaces.WORLD, unreal.AnimPoseSpaces.LOCAL
        g = lambda b, sp: unreal.AnimPoseExtensions.get_bone_pose(ref, b, sp)
        tl, tr = g('thigh_l', W).translation, g('thigh_r', W).translation
        lat = unreal.Vector(tl.x - tr.x, tl.y - tr.y, 0); n = math.hypot(lat.x, lat.y); lat = unreal.Vector(lat.x / n, lat.y / n, 0)
        fwd = unreal.Vector(-lat.y, lat.x, 0)   # horizontal axis perpendicular to the hips line
        def qaxis(ax, a): s = math.sin(a / 2); return unreal.Quat(ax.x * s, ax.y * s, ax.z * s, math.cos(a / 2))
        ctrl = seq.controller; ctrl.open_bracket(unreal.Text('wide stance'))
        try: ctrl.set_frame_rate(unreal.FrameRate(30, 1))
        except Exception as e: log('framerate', e)
        ctrl.set_number_of_frames(unreal.FrameNumber(1))
        for side, sgn in (('l', 1), ('r', -1)):
            b = f'thigh_{side}'; tw = g(b, W); fw = g(f'foot_{side}', W).translation; pw = g('pelvis', W)
            off = unreal.Vector(fw.x - tw.translation.x, fw.y - tw.translation.y, fw.z - tw.translation.z)
            best = None
            for s in (1, -1):
                q = qaxis(fwd, s * ang); f2 = q.rotate_vector(off)
                d = (tw.translation.x + f2.x - (tl.x + tr.x) / 2) * lat.x + (tw.translation.y + f2.y - (tl.y + tr.y) / 2) * lat.y
                if best is None or d * sgn > best[0]: best = (d * sgn, q)
            nw = best[1] * tw.rotation; loc = pw.rotation.inverse() * nw; tl0 = g(b, Lc)
            try: ctrl.add_bone_curve(b)
            except Exception: ctrl.add_bone_track(b)
            ctrl.set_bone_track_keys(b, [tl0.translation] * 2, [loc] * 2, [tl0.scale3d] * 2)
            # keep the feet flat: counter-rotate the foot by the same angle
            fb = f'foot_{side}'; fl = g(fb, Lc); cw = g(f'calf_{side}', W); fwr = g(fb, W)
            fnew = cw.rotation.inverse() * (best[1] * cw.rotation)  # not used: calf follows thigh, foot inherits; flatten foot in world
            fl_new = (best[1] * cw.rotation).inverse() * fwr.rotation
            try: ctrl.add_bone_curve(fb)
            except Exception: ctrl.add_bone_track(fb)
            ctrl.set_bone_track_keys(fb, [fl.translation] * 2, [fl_new] * 2, [fl.scale3d] * 2)
            log('pose bone', b, 'spread', round(best[0], 1))
        ctrl.close_bracket(); EAL.save_asset(dst, only_if_is_dirty=False); log('pose saved', dst, math.degrees(ang))
    if 'skinlist' in STEPS:
        c = unreal.load_asset('/Game/QQ/MHC_gulayim_final'); sk = c.skin_settings.skin
        log('skin fields', {m: str(getattr(sk, m)) for m in dir(sk) if not m.startswith('_') and not callable(getattr(sk, m))})
        try: log('underwear enums', [x for x in dir(unreal) if 'nderwear' in x])
        except Exception as e: log('enum list', e)
    if 'srestore' in STEPS:
        # put the pre-conform parametric Surtaysha back (backup made before the HF3D conform)
        k, b = '/Game/QQ/MHC_surtaysha_k', '/Game/QQ/MHC_surtaysha_k_param'
        if EAL.does_asset_exist(b):
            if EAL.does_asset_exist('/Game/QQ/MHC_surtaysha_k_hf3d'): EAL.delete_asset('/Game/QQ/MHC_surtaysha_k_hf3d')
            ok = EAL.rename_asset(k, '/Game/QQ/MHC_surtaysha_k_hf3d'); log('conformed kept as MHC_surtaysha_k_hf3d', ok)
            d = EAL.duplicate_asset(b, k); log('restored', k, 'from', b, d)
            c = unreal.load_asset(k)
            if mhs.try_add_object_to_edit(c):
                try: log('restored constraints', json.dumps({str(x.name): round(x.target_measurement, 1) for x in mhs.get_body_constraints(c)}))
                finally: mhs.remove_object_to_edit(c)
    if 'sdirect' in STEPS:
        # wrap mesh has the MetaHuman body topology: apply it as-is (no parametric auto-solve), restore from the on-disk backup first
        k = '/Game/QQ/' + os.environ.get('QQ_DCHAR', 'MHC_surtaysha_k'); bk = k + '_bak'
        if not EAL.does_asset_exist(bk):
            EAL.duplicate_asset(k, bk); EAL.save_asset(bk, only_if_is_dirty=False)
            bf = 'F:/UnrealProjects/QQ_MetaHuman/Content' + bk[len('/Game'):] + '.uasset'
            log('backup', bk, 'on disk', os.path.exists(bf))
            if not os.path.exists(bf): raise RuntimeError('backup not on disk')
        elif os.environ.get('QQ_FROM_BAK', '1') == '1':
            EAL.delete_asset(k); EAL.duplicate_asset(bk, k); EAL.save_asset(k, only_if_is_dirty=False); log('restored from', bk)
        for fn in ('conform_to_target_meshes', 'set_body_mesh', 'set_body_joints', 'get_joints_for_body_conforming', 'get_mesh_for_body_conforming', 'conform_body', 'conform_body_to_target'):
            try: log('doc', fn, (getattr(mhs, fn).__doc__ or '').replace(chr(10), ' ')[:600])
            except Exception as e: log('doc fail', fn, e)
        src = os.environ.get('QQ_STGT') or 'F:/qirq-qiz/tools/blender/surtaysha/body/SK_Surtaysha_MHwrap.fbx'; task = unreal.AssetImportTask(); task.filename = src; task.destination_path = '/Game/QQ/Targets'; task.destination_name = 'SK_Target_Direct'
        task.automated = True; task.replace_existing = True; task.save = True; unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
        tgt = unreal.load_asset('/Game/QQ/Targets/SK_Target_Direct'); c = unreal.load_asset(k)
        if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
        try:
            verts, idx, *_ = mhs.get_mesh_data_for_conforming(tgt); f0 = list(mhs.get_face_model_coefficients(c))
            mode = os.environ.get('QQ_DIRECT', 'noauto')
            # optional reshaping of the target before the solve: overall height scale + shorter, thicker neck
            hs = float(os.environ.get('QQ_HSCALE', '1.0')); nk = float(os.environ.get('QQ_NECK', '1.0')); nt = float(os.environ.get('QQ_NECK_THICK', '1.0'))
            if hs != 1.0 or nk != 1.0 or nt != 1.0:
                H = max(v.z for v in verts); z0, z1 = H * float(os.environ.get('QQ_NECK_Z0', '0.82')), H * float(os.environ.get('QQ_NECK_Z1', '0.92'))
                nv = [v for v in verts if z0 < v.z < z1 and abs(v.x) < 14]; cy = sum(v.y for v in nv) / max(1, len(nv))
                out = []; VT = type(verts[0])
                for v in verts:
                    x, y, z = v.x, v.y, v.z
                    if z > z0:
                        zz = z0 + (min(z, z1) - z0) * nk + max(0.0, z - z1)
                        if z < z1 and abs(x) < 16:
                            w = 1.0 - abs((z - z0) / (z1 - z0) - 0.35) * 1.2; w = max(0.0, min(1.0, w)); s = 1.0 + (nt - 1.0) * w
                            x, y = x * s, cy + (y - cy) * s
                        z = zz
                    out.append(VT(x * hs, y * hs, z * hs))
                # limb mass compensation (the noauto solve thins limbs ~12-18%) + wider leg gap
                fl, fa, fd, gap = float(os.environ.get('QQ_LEG_F', '1.0')), float(os.environ.get('QQ_ARM_F', '1.0')), float(os.environ.get('QQ_DELT_F', '1.0')), float(os.environ.get('QQ_GAP_CM', '0'))
                if fl != 1.0 or fa != 1.0 or fd != 1.0 or gap:
                    H2 = max(v.z for v in out); zc = H2 * 0.47
                    def bins(sel, key):
                        d = {}
                        for i in sel:
                            b = int(key(out[i]) // 4); s = d.setdefault(b, [0.0, 0.0, 0.0, 0]); s[0] += out[i].x; s[1] += out[i].y; s[2] += out[i].z; s[3] += 1
                        return {b: (s[0] / s[3], s[1] / s[3], s[2] / s[3]) for b, s in d.items()}
                    new = list(out)
                    for side in (1, -1):
                        legs = [i for i, v in enumerate(out) if v.z < zc + 4 and v.x * side > 0]; cl = bins(legs, lambda v: v.z)
                        for i in legs:
                            v = out[i]; cx, cy, _ = cl[int(v.z // 4)]; w = 1.0 if v.z < zc - 4 else max(0.0, (zc + 4 - v.z) / 8)
                            s = 1 + (fl - 1) * w; sh = gap * side * w * (1.0 if v.z > H2 * 0.08 else v.z / (H2 * 0.08))
                            new[i] = VT(cx + (v.x - cx) * s + sh, cy + (v.y - cy) * s, v.z)
                        arms = [i for i, v in enumerate(out) if v.x * side > 21 and v.z > H2 * 0.45]; ca = bins(arms, lambda v: abs(v.x))
                        for i in arms:
                            v = out[i]; _, cy, cz = ca[int(abs(v.x) // 4)]; w = min(1.0, (abs(v.x) - 21) / 6)
                            s = 1 + (fa - 1) * w; new[i] = VT(v.x, cy + (v.y - cy) * s, cz + (v.z - cz) * s)
                        for i, v in enumerate(out):
                            if 14 < v.x * side < 30 and H2 * 0.76 < v.z < H2 * 0.88:
                                w = 1.0 - abs((v.z / H2 - 0.82) / 0.06); new[i] = VT(new[i].x * (1 + (fd - 1) * max(0.0, w)), new[i].y, new[i].z)
                    out = new; log('limbs: leg', fl, 'arm', fa, 'delt', fd, 'gap cm', gap)
                log('target reshaped: height', round(H, 1), '->', round(max(v.z for v in out), 1), 'neck', nk, 'thick', nt, 'neck verts', len(nv))
                verts = unreal.Array(VT); [verts.append(o) for o in out]
            if mode == 'restore': log('restore only, no conform')
            elif mode == 'noauto':
                p = unreal.ConformTargetParams(); p.conform_target_mesh.target_parts_type = unreal.TargetPartsType.BODY_ONLY
                p.conform_target_mesh.body_vertices = verts; p.conform_target_mesh.body_vertex_indices = idx
                p.estimate_body_joints_from_mesh = True; p.auto_solve = False
                try: p.body_conform_solve_settings.pipeline_name = 'body_only'
                except Exception: pass
                key = unreal.MetaHumanCharacterTargetMeshKey(); key.body_mesh = tgt
                ok = mhs.conform_to_target_meshes(c, key, p); log('direct conform noauto', ok, len(verts))
                if ok:
                    try: mhs.commit_posed_state_as_a_pose(c, key)
                    except Exception as e: log('commit pose skipped', e)
            elif mode == 'cbt':
                v3 = [unreal.Vector3f(v.x, v.y, v.z) for v in verts]
                ok = mhs.conform_body_to_target(c, v3, [], True, True); log('conform_body_to_target', ok, len(v3))
                try: mhs.commit_body_state(c)
                except Exception as e: log('commit body', e)
            elif mode == 'mesh':
                v3 = [unreal.Vector3f(v.x, v.y, v.z) for v in verts]
                ok = mhs.set_body_mesh(c, v3, True); log('set_body_mesh', ok, len(v3))
            else:
                try: j = mhs.get_joints_for_body_conforming(c, tgt); log('joints', type(j), len(j) if hasattr(j, '__len__') else '')
                except Exception as e: j = None; log('joints fail', e)
                try: ok = mhs.set_body_mesh(c, verts); log('set_body_mesh', ok)
                except Exception as e: log('set_body_mesh fail', e)
                if j is not None:
                    try: log('set_body_joints', mhs.set_body_joints(c, j))
                    except Exception as e: log('set_body_joints fail', e)
                try: mhs.commit_body_state(c)
                except Exception as e: log('commit body', e)
            f1 = list(mhs.get_face_model_coefficients(c)); d = max(abs(a - b) for a, b in zip(f0, f1)) if f0 else 0; log('face diff', d)
            if d > 1e-4: mhs.set_face_model_coefficients(c, f0); mhs.commit_face_state(c); log('face restored')
            log('constraints after', json.dumps({str(x.name): round(x.target_measurement, 1) for x in mhs.get_body_constraints(c)}))
        finally: mhs.remove_object_to_edit(c)
        EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
    if 'sconform' in STEPS:
        # Surtaysha body = conform (BODY_ONLY) to the Higgsfield 3D model of the approved turnaround; the face stays MetaHuman
        src = os.environ.get('QQ_STGT', 'F:/qirq-qiz/tools/blender/surtaysha/body/SK_Surtaysha_HF3D.fbx')
        task = unreal.AssetImportTask(); task.filename = src; task.destination_path = '/Game/QQ/Targets'; task.destination_name = 'SK_Surtaysha_HF3D'
        task.automated = True; task.replace_existing = True; task.save = True; unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
        tgt = unreal.load_asset('/Game/QQ/Targets/SK_Surtaysha_HF3D'); log('target asset', tgt, task.imported_object_paths)
        bk = os.environ.get('QQ_SBACKUP', '/Game/QQ/MHC_surtaysha_k_bak')
        if not EAL.does_asset_exist(bk): EAL.duplicate_asset('/Game/QQ/MHC_surtaysha_k', bk)
        EAL.save_asset(bk, only_if_is_dirty=False)
        bf = 'F:/UnrealProjects/QQ_MetaHuman/Content' + bk[len('/Game'):] + '.uasset'
        log('backup', bk, 'on disk', os.path.exists(bf), os.path.getsize(bf) if os.path.exists(bf) else 0)
        if not os.path.exists(bf): raise RuntimeError('backup not on disk - not conforming')
        c = unreal.load_asset('/Game/QQ/MHC_surtaysha_k')
        if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
        try:
            verts, idx, *_ = mhs.get_mesh_data_for_conforming(tgt)
            xs, ys, zs = [v.x for v in verts], [v.y for v in verts], [v.z for v in verts]
            log('target verts', len(verts), 'x %.1f..%.1f y %.1f..%.1f z %.1f..%.1f' % (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
            # nose direction check: the head's most forward vertices (z > 160) tell which way the model faces
            hy = [v.y for v in verts if v.z > 160]; log('head y range', round(min(hy), 1), round(max(hy), 1))
            f0 = list(mhs.get_face_model_coefficients(c))
            p = unreal.ConformTargetParams()
            p.conform_target_mesh.target_parts_type = unreal.TargetPartsType.BODY_ONLY
            p.conform_target_mesh.body_vertices = verts; p.conform_target_mesh.body_vertex_indices = idx
            p.estimate_body_joints_from_mesh = True; p.auto_solve = True
            p.body_conform_solve_settings.pipeline_name = 'body_only'
            key = unreal.MetaHumanCharacterTargetMeshKey(); key.body_mesh = tgt
            ok = mhs.conform_to_target_meshes(c, key, p); log('surt body conform', ok)
            if ok:
                try: mhs.commit_posed_state_as_a_pose(c, key)
                except Exception as e: log('commit pose skipped', e)
            f1 = list(mhs.get_face_model_coefficients(c)); d = max(abs(a - b) for a, b in zip(f0, f1)) if f0 else 0
            log('face diff after conform', d)
            if d > 1e-4:
                try: mhs.set_face_model_coefficients(c, f0); mhs.commit_face_state(c); log('face restored')
                except Exception as e: log('face restore fail', e)
            log('constraints after', json.dumps({str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(c)}))
        finally: mhs.remove_object_to_edit(c)
        EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
    if 'clist' in STEPS:
        c = unreal.load_asset('/Game/QQ/MHC_surtaysha_k')
        if mhs.try_add_object_to_edit(c):
            try:
                for k in mhs.get_body_constraints(c):
                    log('constraint', str(k.name), 'active', k.is_active, 'target', round(k.target_measurement, 2), 'min', round(k.min_measurement, 2), 'max', round(k.max_measurement, 2))
                log('body api', [m for m in dir(mhs) if 'body' in m.lower() or 'pose' in m.lower() or 'anim' in m.lower()])
                log('char props', [m for m in dir(c) if not m.startswith('_')])
            finally: mhs.remove_object_to_edit(c)
    if 'step1d' in STEPS:
        # Surtaysha: match the approved bare-body turnaround (ref/surtaysha_body_turn.png) at 185 cm, very muscular, low fat, face unchanged
        set_body('MHC_surtaysha_k', json.loads(os.environ.get('QQ_S_BODY', 'null')) or {'height': 185, 'across_shoulder': 58, 'chest': 150, 'underbust': 130, 'waist': 108, 'high_hip': 108, 'hip': 112,
                 'thigh': 70, 'knee': 46, 'calf': 50, 'bicep': 58, 'elbow': 36, 'forearm': 44, 'wrist': 22, 'neck': 54, 'neck_base': 60, 'hand_circumference': 27, 'muscularity': 2.5, 'fat': -0.4, 'masculine/feminine': -2.0})
    if 'step1e' in STEPS:
        # Guloyim: match the approved bare-body turnaround (ref/guloyim_body_turn.png) at 171 cm: slim athletic, natural bust/waist/hips, gap between thighs, face unchanged
        set_body('MHC_gulayim_final', json.loads(os.environ.get('QQ_G_BODY', 'null')) or {'height': 171, 'across_shoulder': 37, 'chest': 86, 'underbust': 73, 'waist': 67, 'high_hip': 83, 'hip': 92, 'inseam': 79,
                 'thigh': 53, 'knee': 35, 'calf': 35, 'bicep': 27, 'forearm': 23, 'neck': 31.5, 'neck_base': 34.5, 'muscularity': 0.9, 'fat': -0.8})
        c = unreal.load_asset('/Game/QQ/MHC_gulayim_final'); add_groom(c, 'Hair', f'{OPT}/Grooms/Bindings/Hair/WI_Hair_L_Straight.WI_Hair_L_Straight'); EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
    if 'notop' in STEPS:
        for nm in os.environ.get('QQ_NOTOP', 'MHC_gulayim_final,MHC_surtaysha_k').split(','):
            c = unreal.load_asset(f'/Game/QQ/{nm}')
            if mhs.try_add_object_to_edit(c):
                try:
                    ss = c.skin_settings; sk = ss.skin; sk.show_top_underwear = os.environ.get('QQ_TOP', '0') == '1'; ss.skin = sk; mhs.commit_skin_settings(c, ss); log('top underwear', sk.show_top_underwear, nm)
                finally: mhs.remove_object_to_edit(c)
                EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
    if 'pure' in STEPS:
        # PURE MetaHuman (author, 26 Nov): no body swap, no head scale. Each character keeps its own parametric body, so neck,
        # grooms, underwear and rig are native. Guloyim = approved parametric body; Surtaysha (MHC_surtaysha_f, run 'snew' first
        # for a clean copy) = as burly as the parametric limits allow. QQ_PURE=g,s selects characters.
        def native(nm, top, lash=True):
            c = unreal.load_asset(f'/Game/QQ/{nm}')
            if mhs.try_add_object_to_edit(c):
                try:
                    ss = c.skin_settings; sk = ss.skin; sk.show_top_underwear = top; ss.skin = sk; mhs.commit_skin_settings(c, ss)
                    hm = c.head_model_settings; el = hm.eyelashes; el.enable_grooms = lash; hm.eyelashes = el; mhs.commit_head_model_settings(c, hm)
                    log('pure native', nm, 'top underwear', top, 'lash grooms', lash)
                    log('pure constraints', nm, json.dumps({str(k.name): round(k.target_measurement, 1) for k in mhs.get_body_constraints(c)}))
                    try: log('pure selections', nm, [(str(s.slot_name), str(c.internal_collection.get_item_display_name(s.selected_item))) for s in c.internal_collection.default_instance.get_editor_property('slot_selections')])
                    except Exception as e: log('selections n/a', e)
                finally: mhs.remove_object_to_edit(c)
            EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
        who = os.environ.get('QQ_PURE', 'g,s').split(',')
        if 'g' in who:
            set_body('MHC_gulayim_final', json.loads(os.environ.get('QQ_G_BODY', 'null')) or {'height': 171, 'across_shoulder': 37, 'chest': 86, 'underbust': 73, 'waist': 67, 'high_hip': 83, 'hip': 92, 'inseam': 79,
                     'thigh': 53, 'knee': 35, 'calf': 35, 'bicep': 27, 'forearm': 23, 'neck': 31.5, 'neck_base': 34.5, 'muscularity': 0.9, 'fat': -0.8})
            c = unreal.load_asset('/Game/QQ/MHC_gulayim_final'); add_groom(c, 'Hair', f'{OPT}/Grooms/Bindings/Hair/WI_Hair_L_Straight.WI_Hair_L_Straight'); EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
            native('MHC_gulayim_final', True)
        if 's' in who:
            set_body('MHC_surtaysha_f', json.loads(os.environ.get('QQ_S_BODY', 'null')) or {'height': 185, 'across_shoulder': 54, 'chest': 150, 'underbust': 130, 'waist': 108, 'high_hip': 108, 'hip': 112,
                     'thigh': 70, 'knee': 46, 'calf': 50, 'bicep': 58, 'elbow': 36, 'forearm': 44, 'wrist': 22, 'neck': 54, 'neck_base': 60, 'hand_circumference': 27, 'muscularity': 2.5, 'fat': -0.4, 'masculine/feminine': -2.0})
            if os.environ.get('QQ_S_HAIR'):   # e.g. WI_Hair_S_BuzzCut (the body ref has cropped hair)
                c = unreal.load_asset('/Game/QQ/MHC_surtaysha_f'); h = os.environ['QQ_S_HAIR']; add_groom(c, 'Hair', f'{OPT}/Grooms/Bindings/Hair/{h}.{h}'); EAL.save_asset(c.get_path_name(), only_if_is_dirty=False)
            native('MHC_surtaysha_f', False)
    if 'turn' in STEPS:
        os.makedirs(f'{OUT}/shots', exist_ok=True)
        step_multishots(json.load(open(os.environ['QQ_TURN_FILE'])), os.environ.get('QQ_LIGHT', 'daylight'))
    if 'vshots' in STEPS:
        os.makedirs(f'{OUT}/shots', exist_ok=True)
        step_multishots([(f"/Game/QQ/{n}", n, os.environ.get('QQ_VIEWS', '34').split(',')) for n in [v['name'] for v in VARIANTS] + [x for x in os.environ.get('QQ_EXTRA', '').split(',') if x]], os.environ.get('QQ_LIGHT', 'Studio'))
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
