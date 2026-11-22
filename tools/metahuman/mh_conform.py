# Unreal 5.8 (QQ_MetaHuman project): build a MetaHuman whose head is conformed to the author's Higgsfield character.
# Steps are chosen with env QQ_MH_STEPS (comma list): import,conform,rig,textures,export  (default: import,conform)
# Every step logs to F:/qirq-qiz/tools/metahuman/out/<name>_log.txt; the editor quits at the end.
import unreal, os, json, traceback

NAME = os.environ.get('QQ_MH_NAME', 'gulayim')
STEPS = os.environ.get('QQ_MH_STEPS', 'import,conform').split(',')
ROOT = 'F:/qirq-qiz/tools/metahuman'
OUT = f'{ROOT}/out'; os.makedirs(OUT, exist_ok=True)
LOG = open(f'{OUT}/{NAME}_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQMH ' + s)

mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
PKG = '/Game/QQ'; ASSET = os.environ.get('QQ_MH_ASSET', f'MHC_{NAME}'); CHAR = f'{PKG}/{ASSET}'; TGT = f'{PKG}/Targets/{NAME}_face'

def import_target():
    task = unreal.AssetImportTask()
    task.filename = f'{ROOT}/targets/{NAME}_face.fbx'; task.destination_path = f'{PKG}/Targets'; task.destination_name = f'{NAME}_face'
    task.automated = True; task.replace_existing = True; task.save = True
    asset_tools.import_asset_tasks([task])
    log('import', task.imported_object_paths)

def get_char():
    c = unreal.load_asset(CHAR)
    if c is None:
        c = asset_tools.create_asset(asset_name=ASSET, package_path=PKG, asset_class=unreal.MetaHumanCharacter, factory=unreal.new_object(type=unreal.MetaHumanCharacterFactoryNew))
        log('created', CHAR)
    return c

def body(c):
    # body: conform to the standard female body already fitted (size + A-pose) to the author's Higgsfield model
    task = unreal.AssetImportTask(); task.filename = f'{ROOT}/targets/{NAME}_body.fbx'; task.destination_path = f'{PKG}/Targets'; task.destination_name = f'{NAME}_body'
    task.automated = True; task.replace_existing = True; task.save = True; asset_tools.import_asset_tasks([task])
    tgt = unreal.load_asset(f'{PKG}/Targets/{NAME}_body')
    verts, idx, *_ = mhs.get_mesh_data_for_conforming(tgt)
    zs = [v.z for v in verts]; log('body target', len(verts), 'verts z %.1f..%.1f' % (min(zs), max(zs)))
    p = unreal.ConformTargetParams()
    p.conform_target_mesh.target_parts_type = unreal.TargetPartsType.BODY_ONLY
    p.conform_target_mesh.body_vertices = verts; p.conform_target_mesh.body_vertex_indices = idx
    p.estimate_body_joints_from_mesh = True; p.auto_solve = True
    p.body_conform_solve_settings.pipeline_name = 'body_only'
    key = unreal.MetaHumanCharacterTargetMeshKey(); key.body_mesh = tgt
    ok = mhs.conform_to_target_meshes(c, key, p); log('body conform', ok)
    if ok:
        try: mhs.commit_posed_state_as_a_pose(c, key)
        except Exception as e: log('body commit pose skipped', e)

def both(c):
    # one solve for head AND body (separate conforms overwrite each other): slim body target + face target + portrait landmarks
    bt = unreal.load_asset(f'{PKG}/Targets/{NAME}_body'); ft = unreal.load_asset(TGT)
    bv, bi, *_ = mhs.get_mesh_data_for_conforming(bt); fv, fi, *_ = mhs.get_mesh_data_for_conforming(ft)
    p = unreal.ConformTargetParams()
    p.conform_target_mesh.target_parts_type = unreal.TargetPartsType.HEAD_AND_BODY
    p.conform_target_mesh.body_vertices = bv; p.conform_target_mesh.body_vertex_indices = bi
    p.conform_target_mesh.head_vertices = fv; p.conform_target_mesh.head_vertex_indices = fi
    p.estimate_body_joints_from_mesh = True; p.auto_solve = True
    p.body_conform_solve_settings.pipeline_name = 'head_body'
    cam = json.load(open(f'{ROOT}/targets/{NAME}_cam.json'))
    size, pixels = unreal.PromotedFrameUtils.get_promoted_frame_as_pixel_array_from_disk(f'{ROOT}/targets/{NAME}_portrait.png')
    tr = mhs.track_face_landmarks_from_image(pixels, size.x, size.y)
    if isinstance(tr, tuple) and len(tr) == 1: tr = tr[0]
    if tr and hasattr(tr, 'items'):
        vi = unreal.MinimalViewInfo(); vi.location = unreal.Vector(*cam['location']); vi.rotation = unreal.Rotator(pitch=0.0, yaw=float(cam['rotation']['yaw']), roll=0.0)
        vi.fov = float(cam['fov']); vi.aspect_ratio = float(size.x) / float(size.y); vi.projection_mode = unreal.CameraProjectionMode.PERSPECTIVE
        p.curve_tracking_points = tr; p.camera_view_info = vi; p.image_size = size
    key = unreal.MetaHumanCharacterTargetMeshKey(); key.body_mesh = bt; key.head_mesh = ft
    ok = mhs.conform_to_target_meshes(c, key, p); log('head+body conform', ok, 'body', len(bv), 'face', len(fv), 'curves', len(tr) if tr else 0)
    if ok:
        try: mhs.commit_posed_state_as_a_pose(c, key)
        except Exception as e: log('commit pose skipped', e)

def conform(c):
    tgt = unreal.load_asset(TGT)
    verts, idx, *_ = mhs.get_mesh_data_for_conforming(tgt)
    log('target', len(verts), 'verts', len(idx) // 3, 'tris')
    xs = [v.x for v in verts]; ys = [v.y for v in verts]; zs = [v.z for v in verts]
    log('bounds x %.1f..%.1f y %.1f..%.1f z %.1f..%.1f' % (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)))
    p = unreal.ConformTargetParams()
    p.conform_target_mesh.target_parts_type = unreal.TargetPartsType.HEAD_ONLY
    p.body_conform_solve_settings.pipeline_name = 'head_only'
    # 2D face landmarks from the front portrait rendered in Blender with a known camera
    cam = json.load(open(f'{ROOT}/targets/{NAME}_cam.json'))
    size, pixels = unreal.PromotedFrameUtils.get_promoted_frame_as_pixel_array_from_disk(f'{ROOT}/targets/{NAME}_portrait.png')
    tr = mhs.track_face_landmarks_from_image(pixels, size.x, size.y)
    if isinstance(tr, tuple) and len(tr) == 1: tr = tr[0]
    if tr and hasattr(tr, 'items'):
        vi = unreal.MinimalViewInfo(); vi.location = unreal.Vector(*cam['location']); vi.rotation = unreal.Rotator(pitch=0.0, yaw=float(cam['rotation']['yaw']), roll=0.0)
        vi.fov = float(cam['fov']); vi.aspect_ratio = float(size.x) / float(size.y); vi.projection_mode = unreal.CameraProjectionMode.PERSPECTIVE
        p.curve_tracking_points = tr; p.camera_view_info = vi; p.image_size = size
        log('landmark curves', len(tr))
    else: log('no landmarks found')
    p.conform_target_mesh.head_vertices = verts
    p.conform_target_mesh.head_vertex_indices = idx
    p.auto_solve = True
    key = unreal.MetaHumanCharacterTargetMeshKey(); key.head_mesh = tgt
    ok = mhs.conform_to_target_meshes(c, key, p)
    log('conform', ok)
    if ok:
        try: mhs.commit_posed_state_as_a_pose(c, key)
        except Exception as e: log('commit pose skipped', e)

def rig(c):
    r = unreal.MetaHumanCharacterAutoRiggingRequestParams(); r.blocking = True; r.report_progress = False; r.rig_type = unreal.MetaHumanRigType.JOINTS_ONLY
    mhs.request_auto_rigging(c, r); log('rig requested (blocking) done')

def textures(c):
    t = unreal.MetaHumanCharacterTextureRequestParams(); t.blocking = True; t.report_progress = False
    mhs.request_texture_sources(c, t); log('textures done')

def preview(c):
    # geometry -> project assets -> the full-body skeletal mesh as FBX, to look at the conform in Blender
    g = unreal.MetaHumanGeometryExportParams(); g.project_path = f'{PKG}/Geo_{ASSET}'; g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = True; g.body_skeletal_mesh = False; g.overwrite_existing_assets = True
    unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
    paths = unreal.EditorAssetLibrary.list_assets(g.project_path, recursive=True)
    log('geometry assets', paths)
    for ap in paths:
        a = unreal.load_asset(ap)
        if isinstance(a, unreal.SkeletalMesh):
            t = unreal.AssetExportTask(); t.object = a; t.filename = f'{OUT}/{NAME}_{a.get_name()}.fbx'; t.automated = True; t.replace_identical = True; t.prompt = False
            t.exporter = unreal.SkeletalMeshExporterFBX()
            ok = unreal.Exporter.run_asset_export_task(t); log('fbx', t.filename, ok)

def export(c):
    d = unreal.MetaHumanDCCExportParams(); d.external_path = f'{OUT}/{NAME}_dcc'; d.bake_make_up = True; d.compress_in_zip_file = False; d.archive_name = NAME
    unreal.MetaHumanCharacterExportBlueprintLibrary.export_dcc(c, d); log('export dcc ->', d.external_path)

try:
    log('==== steps', STEPS)
    if 'import' in STEPS: import_target()
    c = get_char()
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit character')
    try:
        if 'both' in STEPS: both(c)
        if 'conform' in STEPS: conform(c)
        if 'body' in STEPS: body(c)   # after the face: the head_only pipeline re-solves the body, so the body conform goes last
        if 'rig' in STEPS: rig(c)
        if 'textures' in STEPS: textures(c)
        if 'export' in STEPS: export(c)
        if 'preview' in STEPS: preview(c)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    unreal.EditorAssetLibrary.save_asset(CHAR, only_if_is_dirty=False)
    log('saved')
except Exception as e:
    log('ERROR', e); log(traceback.format_exc())
finally:
    LOG.close()
    if os.environ.get('QQ_MH_QUIT', '1') == '1': unreal.SystemLibrary.quit_editor()
