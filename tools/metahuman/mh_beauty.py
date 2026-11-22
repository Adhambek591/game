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
            ir.primary_color_u = float(os.environ.get('QQ_IRIS_U', '0.8')); ir.primary_color_v = float(os.environ.get('QQ_IRIS_V', '0.15'))
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
    hair = cfg.get('hair', 'WI_Hair_S_LowPonytail')
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
        for yaw, pitch, inten, col in ((-125, -25, 3.2, (1.0, 0.98, 0.95)), (-55, -10, 1.3, (0.95, 0.97, 1.0)), (75, -30, 2.0, (1, 1, 1))):
            d = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 300), unreal.Rotator(roll=0, pitch=pitch, yaw=yaw))
            lc = d.light_component; lc.set_intensity(inten); lc.set_light_color(unreal.LinearColor(*col, 1)); lc.set_editor_property('light_source_angle', 12.0)
        sl.recapture_sky()
        bgm = unreal.load_asset('/Game/QQ/Mat/M_QQ_Backdrop')
        dome = eas.spawn_actor_from_object(unreal.load_asset('/Engine/BasicShapes/Sphere'), unreal.Vector(0, 0, 150)); dome.set_actor_scale3d(unreal.Vector(12, 12, 12))
        if bgm: dome.static_mesh_component.set_material(0, bgm)
        dome.static_mesh_component.set_cast_shadow(False)
    else:
        les.load_level('/MetaHumanCharacter/LightingEnvironments/' + light)   # read-only, never saved
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    W = int(os.environ.get('QQ_RES', '1024'))
    rt = unreal.RenderingLibrary.create_render_target2d(world, W, W, unreal.TextureRenderTargetFormat.RTF_RGBA8)
    cap = eas.spawn_actor_from_class(unreal.SceneCapture2D, unreal.Vector(0, 0, 0)); cc = cap.capture_component2d
    cc.texture_target = rt; cc.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR; cc.capture_every_frame = False
    cc.fov_angle = float(os.environ.get('QQ_FOV', '16'))
    pps = cc.post_process_settings; pps.override_vignette_intensity = True; pps.vignette_intensity = 0.0; cc.post_process_settings = pps
    ANG = {'old': 0, '34': 38, 'yon': 88}
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
                path, stem, views = items[st['k']]
                st['c'] = unreal.load_asset(path)
                if st['c'] is None: log('missing', path); return
                aes.open_editor_for_assets([st['c']])
                log('opened', path)
                st['actor'] = mhs.spawn_meta_human_actor(character=st['c'])
                log('spawned', st['actor'])
                st['phase'] = 'warm'; st['t'] = now; log('preview', path); return
            if st['phase'] == 'warm':
                need = float(os.environ.get('QQ_WARM_S', '420')) if st['first'] else float(os.environ.get('QQ_WARM_EACH', '90'))
                if now - st['t'] < need: return
                st['first'] = False
                path, stem, views = items[st['k']]
                comps = st['actor'].get_components_by_class(unreal.SkeletalMeshComponent)
                body = next((x for x in comps if x.does_socket_exist('head') and 'body' in x.get_name().lower()), None) or next(x for x in comps if x.does_socket_exist('head'))
                head = body.get_socket_location('head'); fwd = body.get_right_vector()
                eye = unreal.Vector(head.x + fwd.x * 8, head.y + fwd.y * 8, head.z + 5); r = float(os.environ.get('QQ_DIST', '95'))
                st['jobs'] = []
                for nm in views:
                    ca, sa = math.cos(math.radians(ANG[nm])), math.sin(math.radians(ANG[nm]))
                    d = unreal.Vector(fwd.x * ca - fwd.y * sa, fwd.x * sa + fwd.y * ca, 0)
                    st['jobs'].append((f'{stem}_{nm}.png', unreal.Vector(eye.x + d.x * r, eye.y + d.y * r, eye.z + 3), eye))
                st['phase'] = 'shoot'; st['w'] = 0; return
            if st['phase'] == 'shoot':
                if not st['jobs']: st['phase'] = 'next'; return
                fn, loc, eye = st['jobs'][0]
                if st['w'] == 0: cap.set_actor_location(loc, False, False); cap.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc, eye), False)
                if st['w'] < 8: cc.capture_scene(); st['w'] += 1; return
                unreal.RenderingLibrary.export_render_target(world, rt, os.environ.get('QQ_SHOT_DIR', f'{OUT}/shots'), fn); log('shot', fn)
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
