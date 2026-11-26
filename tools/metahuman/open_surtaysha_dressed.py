# Viewer: dressed Surtaysha (whole MetaHuman: real face, skin, grooms, Head Scale, saved hair colour) in a neutral studio.
# Run inside the editor so it stays open:
#   UnrealEditor.exe "F:\UnrealProjects\QQ_MetaHuman\QQ_MetaHuman.uproject" -NoLiveCoding -ExecCmds="py F:/qirq-qiz/tools/metahuman/open_surtaysha_dressed.py"
# (NOT -ExecutePythonScript: that quits the editor when the script ends.)
# Builds the scene fresh every time (the assembled MetaHuman actor and the costume's leader-pose link are not stored in
# a level), then saves it as /Game/QQ/Maps/Surtaysha_View with the lights, backdrop and camera. To see him again later,
# run this script again rather than opening the saved map.
import unreal, math, traceback
CHAR = '/Game/QQ/MHC_surtaysha_k'
COSTUME = ['/Game/QQ/Costume/SK_Surtaysha_Legs', '/Game/QQ/Costume/SK_Surtaysha_Cloth', '/Game/QQ/Costume/SK_Surtaysha_Torso']
MAP = '/Game/QQ/Maps/Surtaysha_View'
LOG = open('F:/qirq-qiz/tools/metahuman/out/open_surtaysha_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQV ' + s)
try:
    EAL = unreal.EditorAssetLibrary; MEL = unreal.MaterialEditingLibrary
    eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem); mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
    aes = unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    for cv in ('r.TextureStreaming 0', 'r.Streaming.FullyLoadUsedTextures 1'):
        unreal.SystemLibrary.execute_console_command(world, cv)
    # ---- the same neutral daylight studio as the renders: sky + key / fill / rim, shadowed all-round fills, white dome
    sky = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 300)); sl = sky.light_component
    sl.set_editor_property('source_type', unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
    sl.set_editor_property('cubemap', unreal.load_asset('/Engine/MapTemplates/Sky/DaylightAmbientCubemap') or unreal.load_asset('/Engine/MapTemplates/Sky/SunsetAmbientCubemap'))
    sl.set_intensity(1.0); sl.set_editor_property('lower_hemisphere_is_black', False)
    for yaw, pitch, inten, col in ((-120, -22, 3.2, (1.0, 0.98, 0.95)), (-60, -8, 1.8, (1.0, 0.93, 0.85)), (75, -30, 2.0, (1, 1, 1)), (-90, 25, 0.8, (1.0, 0.95, 0.9))):
        d = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 300), unreal.Rotator(roll=0, pitch=pitch, yaw=yaw))
        lc = d.light_component; lc.set_intensity(inten); lc.set_light_color(unreal.LinearColor(*col, 1)); lc.set_editor_property('light_source_angle', 12.0)
    for yw in (0, 90, 180, 270):
        d = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 300), unreal.Rotator(roll=0, pitch=-25, yaw=yw))
        lc = d.light_component; lc.set_intensity(2.5); lc.set_editor_property('light_source_angle', 20.0); lc.set_cast_shadows(True)
    sl.recapture_sky()
    wn = '/Game/QQ/Mat/M_QQ_ViewBackdrop'
    wm = unreal.load_asset(wn)
    if wm is None:
        wm = unreal.AssetToolsHelpers.get_asset_tools().create_asset('M_QQ_ViewBackdrop', '/Game/QQ/Mat', unreal.Material, unreal.MaterialFactoryNew())
        c3 = MEL.create_material_expression(wm, unreal.MaterialExpressionConstant3Vector, -300, 0); c3.constant = unreal.LinearColor(1.6, 1.6, 1.6, 1)
        wm.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT); wm.set_editor_property('two_sided', True)
        MEL.connect_material_property(c3, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR); MEL.recompile_material(wm); EAL.save_asset(wn)
    dome = eas.spawn_actor_from_object(unreal.load_asset('/Engine/BasicShapes/Sphere'), unreal.Vector(0, 0, 150)); dome.set_actor_scale3d(unreal.Vector(30, 30, 30))
    dome.static_mesh_component.set_material(0, wm); dome.static_mesh_component.set_cast_shadow(False); dome.set_actor_label('QQ_Backdrop')
    # ---- the character: the Creator's own assembled actor (real face, skin, grooms)
    c = unreal.load_asset(CHAR); aes.open_editor_for_assets([c])
    actor = mhs.spawn_meta_human_actor(character=c); actor.set_actor_label('Surtaysha'); log('spawned', actor)
    comps = actor.get_components_by_class(unreal.SkeletalMeshComponent)
    body = next(x for x in comps if x.does_socket_exist('thigh_l') and 'body' in x.get_name().lower())
    for cp in COSTUME:
        a = unreal.load_asset(cp)
        if not isinstance(a, unreal.SkeletalMesh): log('costume missing', cp); continue
        ka = eas.spawn_actor_from_object(a, body.get_world_location(), body.get_world_rotation()); sc = ka.skeletal_mesh_component
        sc.set_mobility(unreal.ComponentMobility.MOVABLE)
        ka.root_component.attach_to_component(body, '', unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, unreal.AttachmentRule.SNAP_TO_TARGET, False)
        sc.set_leader_pose_component(body); sc.set_update_animation_in_editor(True); ka.set_actor_label(cp.split('/')[-1]); log('costume on', cp)
    for mc in actor.get_components_by_class(unreal.MeshComponent):
        try: mc.prestream_textures(600.0, True)
        except Exception: pass
    # ---- viewport camera framed on him, front three-quarter
    head = body.get_socket_location('head'); fwd = body.get_right_vector(); H = head.z + 25
    ang = math.radians(25); dx, dy = fwd.x * math.cos(ang) - fwd.y * math.sin(ang), fwd.x * math.sin(ang) + fwd.y * math.cos(ang)
    tgt = unreal.Vector(head.x, head.y, H * 0.52); loc = unreal.Vector(tgt.x + dx * 430, tgt.y + dy * 430, tgt.z + 20)
    rot = unreal.MathLibrary.find_look_at_rotation(loc, tgt)
    cam = eas.spawn_actor_from_class(unreal.CineCameraActor, loc, rot); cam.set_actor_label('QQ_View_Camera')
    try: unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(loc, rot)
    except Exception as e: log('viewport camera', e)
    try:
        if not EAL.does_directory_exist('/Game/QQ/Maps'): EAL.make_directory('/Game/QQ/Maps')
        ok = unreal.EditorLoadingAndSavingUtils.save_map(world, MAP); log('map saved', MAP, ok)
    except Exception as e: log('map save failed', e)
    log('ready: Surtaysha dressed in the viewport (give the grooms and textures a minute to finish loading)')
except Exception as e:
    log('ERROR', e, traceback.format_exc())
