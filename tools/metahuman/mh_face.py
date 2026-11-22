# UE 5.8: Guloyim face done the MetaHuman way (no painted texture, no sculpt / vertex edits).
# Steps (env QQ_STEPS):
#   revert   old head back to MetaHuman's own material: re-export Geo_gulayim, delete M_QQ_Head + T_gulayim_head
#   conform  NEW character /Game/QQ/MHC_gulayim_id: Creator conform (head+body) to the smoothed HF face/body targets
#            + face landmarks tracked on the HF front portrait, with stronger model regularization / patch smoothness
#            so the PCA face model, not the lumpy scan surface, decides the shape (the old MHC_gulayim is kept)
#   geo      export_geometry of the new character -> /Game/QQ/Geo_gulayim_id
#   shots    front / 3/4 / side face stills (1024 px, even light) of the new and old heads -> F:/qirq-qiz-unity/Builds/guloyim_id_yuz_*.png
# Tunables (env): QQ_REG (ModelRegularization, default 30), QQ_PATCH (PatchSmoothness, 4), QQ_FICP (FaceIcpWeight, 15)
import unreal, os, json, traceback, math

ROOT = 'F:/qirq-qiz/tools/metahuman'; OUT = f'{ROOT}/out'; BUILDS = 'F:/qirq-qiz-unity/Builds'
STEPS = os.environ.get('QQ_STEPS', 'revert,conform,geo,shots').split(',')
NEW = os.environ.get('QQ_NEW', 'MHC_gulayim_id')
LOG = open(f'{OUT}/mh_face_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQF ' + s)
EAL = unreal.EditorAssetLibrary; AT = unreal.AssetToolsHelpers.get_asset_tools()
mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)

def export_geo(char_path, geo_path):
    c = unreal.load_asset(char_path)
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit ' + char_path)
    try:
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = geo_path
        g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = True; g.body_skeletal_mesh = True; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_directory(geo_path, only_if_is_dirty=False, recursive=True)
    h = unreal.load_asset(f'{geo_path}/{c.get_name()}_Head')
    log('geo', geo_path, 'head slot0', h.materials[0].material_interface.get_path_name())

def step_revert():
    export_geo('/Game/QQ/MHC_gulayim', '/Game/QQ/Geo_gulayim')
    for p in ('/Game/QQ/Mat/M_QQ_Head', '/Game/QQ/Tex/T_gulayim_head'):
        if EAL.does_asset_exist(p): log('delete', p, EAL.delete_asset(p))

def step_conform():
    P = '/Game/QQ'; path = f'{P}/{NEW}'
    if EAL.does_asset_exist(path): EAL.delete_asset(path)
    c = AT.create_asset(asset_name=NEW, package_path=P, asset_class=unreal.MetaHumanCharacter, factory=unreal.new_object(type=unreal.MetaHumanCharacterFactoryNew))
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit new character')
    try:
        bt = unreal.load_asset(f'{P}/Targets/gulayim_body'); ft = unreal.load_asset(f'{P}/Targets/gulayim_face')
        bv, bi, *_ = mhs.get_mesh_data_for_conforming(bt); fv, fi, *_ = mhs.get_mesh_data_for_conforming(ft)
        p = unreal.ConformTargetParams()
        tm = p.conform_target_mesh; tm.target_parts_type = unreal.TargetPartsType.HEAD_AND_BODY
        tm.body_vertices = bv; tm.body_vertex_indices = bi; tm.head_vertices = fv; tm.head_vertex_indices = fi; p.conform_target_mesh = tm
        p.estimate_body_joints_from_mesh = True; p.auto_solve = os.environ.get('QQ_AUTO', '0') == '1'   # manual = model fits only, no per-vertex Refine stage (that stage copied the scan lumps)
        s = p.body_conform_solve_settings; s.pipeline_name = 'head_body'
        def ws(v): w = unreal.WeightSchedule(); w.start = v; w.end = v; return w
        s.model_regularization = ws(float(os.environ.get('QQ_REG', '30')))
        s.patch_smoothness = ws(float(os.environ.get('QQ_PATCH', '4')))
        s.face_icp_weight = ws(float(os.environ.get('QQ_FICP', '15')))
        s.iterations = 13; s.face_iterations = int(os.environ.get('QQ_FIT', '10'))
        s.face_landmark2d_weight = ws(float(os.environ.get('QQ_LM', '0.5')))
        p.body_conform_solve_settings = s
        cam = json.load(open(f'{ROOT}/targets/gulayim_cam.json'))
        size, pixels = unreal.PromotedFrameUtils.get_promoted_frame_as_pixel_array_from_disk(f'{ROOT}/targets/gulayim_portrait.png')
        tr = mhs.track_face_landmarks_from_image(pixels, size.x, size.y)
        if isinstance(tr, tuple) and len(tr) == 1: tr = tr[0]
        vi = unreal.MinimalViewInfo(); vi.location = unreal.Vector(*cam['location']); vi.rotation = unreal.Rotator(pitch=0.0, yaw=float(cam['rotation']['yaw']), roll=0.0)
        vi.fov = float(cam['fov']); vi.aspect_ratio = float(size.x) / float(size.y); vi.projection_mode = unreal.CameraProjectionMode.PERSPECTIVE
        p.curve_tracking_points = tr; p.camera_view_info = vi; p.image_size = size
        key = unreal.MetaHumanCharacterTargetMeshKey(); key.body_mesh = bt; key.head_mesh = ft
        ok = mhs.conform_to_target_meshes(c, key, p)
        log('conform', NEW, ok, 'curves', len(tr) if tr else 0, 'reg', s.model_regularization.start, 'patch', s.patch_smoothness.start, 'ficp', s.face_icp_weight.start)
        if ok:
            try: mhs.commit_posed_state_as_a_pose(c, key)
            except Exception as e: log('commit pose skipped', e)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    EAL.save_asset(path, only_if_is_dirty=False)

def step_geo():
    export_geo(f'/Game/QQ/{NEW}', f'/Game/QQ/Geo_{NEW}')

def step_shots():
    les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem); eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    sky = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 300))
    sc = sky.light_component; sc.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
    sc.set_editor_property('cubemap', unreal.load_asset('/Engine/MapTemplates/Sky/SunsetAmbientCubemap')); sc.set_intensity(1.0); sc.set_editor_property('lower_hemisphere_is_black', False)
    for yaw, inten in ((-60, 2.0), (-120, 2.0), (-90, 1.2)):      # soft key L/R + fill, all from the face side (+Y)
        d = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 300), unreal.Rotator(roll=0, pitch=-20, yaw=yaw))
        d.light_component.set_intensity(inten); d.light_component.set_editor_property('light_source_angle', 20.0); d.light_component.set_cast_shadows(False)
    sc.recapture_sky()
    rt = unreal.RenderingLibrary.create_render_target2d(world, 1024, 1024, unreal.TextureRenderTargetFormat.RTF_RGBA8)
    cap = eas.spawn_actor_from_class(unreal.SceneCapture2D, unreal.Vector(0, 0, 0)); cc = cap.capture_component2d
    cc.texture_target = rt; cc.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR; cc.capture_every_frame = False; cc.fov_angle = 18.0
    pps = cc.post_process_settings; pps.override_auto_exposure_method = True; pps.auto_exposure_method = unreal.AutoExposureMethod.AEM_MANUAL
    pps.override_auto_exposure_apply_physical_camera_exposure = True; pps.auto_exposure_apply_physical_camera_exposure = False
    pps.override_auto_exposure_bias = True; pps.auto_exposure_bias = float(os.environ.get('QQ_SHOT_EXPO', '0.0'))
    pps.override_vignette_intensity = True; pps.vignette_intensity = 0.0
    cc.post_process_settings = pps; cc.post_process_blend_weight = 1.0
    # scene captures in the editor are deferred to the next rendered frame: drive the shots from a tick callback
    heads = [(f'/Game/QQ/Geo_{NEW}/{NEW}_Head', os.environ.get('QQ_SHOT_TAG', 'id'))] + ([('/Game/QQ/Geo_gulayim/MHC_gulayim_Head', 'eski')] if os.environ.get('QQ_OLD', '1') == '1' else [])
    jobs = []
    for ap, tag in heads:
        m = unreal.load_asset(ap)
        if m is None: log('missing', ap); continue
        b = m.get_bounds(); o = b.origin; top = o.z + b.box_extent.z; eye = unreal.Vector(o.x, o.y + 2.0, top - 13.0)
        for nm, ang in (('old', 0), ('34', 40), ('yon', 90)):
            r = 95.0; t = math.radians(90 - ang)       # face looks +Y; rotate the camera around Z towards +X
            loc = unreal.Vector(eye.x + r * math.cos(t), eye.y + r * math.sin(t), eye.z)
            jobs.append((m, tag, nm, loc, eye))
    st = {'i': 0, 'wait': 0, 'actor': None, 'mesh': None, 'warm': 40}
    def tick(dt):
        try:
            if st['warm'] > 0: st['warm'] -= 1; return
            if st['i'] >= len(jobs):
                unreal.unregister_slate_post_tick_callback(st['h']); log('shots done'); LOG.close(); unreal.SystemLibrary.quit_editor(); return
            m, tag, nm, loc, eye = jobs[st['i']]
            if st['mesh'] is not m:
                if st['actor']: st['actor'].destroy_actor()
                st['actor'] = eas.spawn_actor_from_object(m, unreal.Vector(0, 0, 0)); st['mesh'] = m; st['warm'] = 60; return
            if st['wait'] == 0:
                cap.set_actor_location(loc, False, False); cap.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc, eye), False)
                cc.capture_scene(); st['wait'] = 1; return
            if st['wait'] < 4:
                cc.capture_scene(); st['wait'] += 1; return
            fn = f'guloyim_id_yuz_{tag}_{nm}.png'
            unreal.RenderingLibrary.export_render_target(world, rt, BUILDS, fn); log('shot', fn)
            st['wait'] = 0; st['i'] += 1
        except Exception as e:
            log('tick ERROR', e, traceback.format_exc()); unreal.SystemLibrary.quit_editor()
    unreal.EditorPythonScripting.set_keep_python_script_alive(True)   # else -ExecutePythonScript quits right after the script
    st['h'] = unreal.register_slate_post_tick_callback(tick)
    global KEEP
    KEEP = True

KEEP = False
try:
    log('==== steps', STEPS, NEW)
    if 'revert' in STEPS: step_revert()
    if 'conform' in STEPS: step_conform()
    if 'geo' in STEPS: step_geo()
    if 'shots' in STEPS: step_shots()
except Exception as e:
    log('ERROR', e); log(traceback.format_exc())
    KEEP = False
finally:
    if not KEEP: LOG.close(); unreal.SystemLibrary.quit_editor()
