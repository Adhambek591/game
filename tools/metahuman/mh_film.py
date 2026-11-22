# UE 5.8: fire-lit cinematic of a MetaHuman (Creator preview actor: synthesized skin + strand grooms), frame by frame.
# No assembled BP exists (auto-rig needs an interactive Epic login), so MRQ cannot see the character: every frame is set up
# explicitly (camera move, idle pose time, fire flicker, rising embers) and captured with a SceneCapture2D at 2560x1440.
# Env: QQ_CHAR (/Game/QQ/MHC_gulayim_final), QQ_TAG (guloyim), QQ_SECONDS (16), QQ_TEST (1 = 4 test frames), QQ_EXPO, QQ_KEYI
import unreal, os, math, random, time, traceback, json
OUT = 'F:/qirq-qiz/tools/metahuman/out'
CHAR = os.environ.get('QQ_CHAR', '/Game/QQ/MHC_gulayim_final'); TAG = os.environ.get('QQ_TAG', 'guloyim')
FPS = 24; SECS = float(os.environ.get('QQ_SECONDS', '16')); N = int(SECS * FPS)
TEST = os.environ.get('QQ_TEST', '0') == '1'
W, H = [int(x) for x in os.environ.get('QQ_RES', '2560x1440').split('x')]
FRAMES = f'{OUT}/film_{TAG}' + ('_test' if TEST else ''); os.makedirs(FRAMES, exist_ok=True)
if not TEST:
    for f in os.listdir(FRAMES): os.remove(os.path.join(FRAMES, f))
LOG = open(f'{OUT}/mh_film_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQF ' + s)
EAL = unreal.EditorAssetLibrary; AT = unreal.AssetToolsHelpers.get_asset_tools(); MEL = unreal.MaterialEditingLibrary
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem); aes = unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)
mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
V = unreal.Vector

def mat(name, build):
    p = f'/Game/QQ/Mat/{name}'
    if EAL.does_asset_exist(p) and os.environ.get('QQ_REMAT', '0') != '1': return unreal.load_asset(p)
    if EAL.does_asset_exist(p): EAL.delete_asset(p)
    m = AT.create_asset(name, '/Game/QQ/Mat', unreal.Material, unreal.MaterialFactoryNew()); build(m); MEL.recompile_material(m); EAL.save_asset(p); return m

def b_dark(m):
    c = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -300, 0); c.constant = unreal.LinearColor(0.025, 0.02, 0.018, 1)
    MEL.connect_material_property(c, '', unreal.MaterialProperty.MP_BASE_COLOR)
    r = MEL.create_material_expression(m, unreal.MaterialExpressionConstant, -300, 200); r.r = 0.75; MEL.connect_material_property(r, '', unreal.MaterialProperty.MP_ROUGHNESS)

def b_ember(m):
    m.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT)
    c = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -300, 0); c.constant = unreal.LinearColor(60.0, 16.0, 2.5, 1)
    MEL.connect_material_property(c, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)

def b_fire(m):
    # animated noise flames: world position + time -> procedural noise -> hot orange emissive
    m.set_editor_property('shading_model', unreal.MaterialShadingModel.MSM_UNLIT); m.set_editor_property('two_sided', True)
    wp = MEL.create_material_expression(m, unreal.MaterialExpressionWorldPosition, -1000, 0)
    sc = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -850, 0); sc.set_editor_property('const_b', 0.01)
    MEL.connect_material_expressions(wp, '', sc, 'A')
    tm = MEL.create_material_expression(m, unreal.MaterialExpressionTime, -1000, 200)
    dv = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -1000, 300); dv.constant = unreal.LinearColor(0.15, 0.0, -1.1, 1)
    tv = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -850, 250)
    MEL.connect_material_expressions(tm, '', tv, 'A'); MEL.connect_material_expressions(dv, '', tv, 'B')
    ad = MEL.create_material_expression(m, unreal.MaterialExpressionAdd, -700, 100)
    MEL.connect_material_expressions(sc, '', ad, 'A'); MEL.connect_material_expressions(tv, '', ad, 'B')
    nz = MEL.create_material_expression(m, unreal.MaterialExpressionNoise, -550, 100)
    nz.set_editor_property('scale', 1.0); nz.set_editor_property('levels', 5); nz.set_editor_property('output_min', 0.0); nz.set_editor_property('output_max', 1.0); nz.set_editor_property('turbulence', True)
    MEL.connect_material_expressions(ad, '', nz, 'Position')
    pw = MEL.create_material_expression(m, unreal.MaterialExpressionPower, -400, 100); pw.set_editor_property('const_exponent', 1.5)
    MEL.connect_material_expressions(nz, '', pw, 'Base')
    col = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -400, 300); col.constant = unreal.LinearColor(30.0, 7.5, 1.0, 1)
    mu = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -250, 150)
    MEL.connect_material_expressions(pw, '', mu, 'A'); MEL.connect_material_expressions(col, '', mu, 'B')
    MEL.connect_material_property(mu, '', unreal.MaterialProperty.MP_EMISSIVE_COLOR)

ST = {}
def setup():
    unreal.EditorLoadingAndSavingUtils.new_blank_map(False)
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    md, me, mf = mat('M_QQ_DarkStone', b_dark), mat('M_QQ_Ember', b_ember), mat('M_QQ_FireWall', b_fire)
    plane = unreal.load_asset('/Engine/BasicShapes/Plane'); sphere = unreal.load_asset('/Engine/BasicShapes/Sphere'); cube = unreal.load_asset('/Engine/BasicShapes/Cube')
    fl = eas.spawn_actor_from_object(plane, V(0, 0, 0)); fl.set_actor_scale3d(V(30, 30, 1)); fl.static_mesh_component.set_material(0, md)
    # dark stone walls far behind, a ring of fire between them and the character (front open towards +Y)
    for ang in (-100, -60, -25, 0, 25, 60, 100):
        a = math.radians(ang); R = 420
        x, y = R * math.sin(a), -R * math.cos(a)
        w = eas.spawn_actor_from_object(cube, V(x * 1.35, y * 1.35, 200), unreal.Rotator(0, ang, 0)); w.set_actor_scale3d(V(4, 0.3, 4)); w.static_mesh_component.set_material(0, md)
    rnd = random.Random(7); embers = []
    for i in range(int(os.environ.get('QQ_EMBERS', '160'))):
        e = eas.spawn_actor_from_object(sphere, V(0, 0, -500)); s = rnd.uniform(0.004, 0.011); e.set_actor_scale3d(V(s, s, s))
        e.static_mesh_component.set_material(0, me); e.static_mesh_component.set_cast_shadow(False)
        a = math.radians(rnd.uniform(-115, 115)); R = rnd.uniform(140, 400)
        embers.append([e, R * math.sin(a), -R * math.cos(a), rnd.uniform(0, 320), rnd.uniform(18, 70), rnd.uniform(0, 6.28), rnd.uniform(0.6, 1.8)])
    # fire = clusters of glowing blobs low behind the character: out of focus they read as flames / bokeh, flickered per frame
    flames = []
    for i in range(int(os.environ.get('QQ_FLAMES', '70'))):
        a = math.radians(rnd.uniform(-110, 110)); R = rnd.uniform(300, 420); s = rnd.uniform(0.04, 0.13)
        b = eas.spawn_actor_from_object(sphere, V(R * math.sin(a), -R * math.cos(a), rnd.uniform(5, 70) * (1.3 - s * 3)))
        b.set_actor_scale3d(V(s, s, s * rnd.uniform(1.4, 2.4))); b.static_mesh_component.set_material(0, mf); b.static_mesh_component.set_cast_shadow(False)
        flames.append([b, s, rnd.uniform(0, 6.28), rnd.uniform(4, 11)])
    ST['flames'] = flames
    fog = eas.spawn_actor_from_class(unreal.ExponentialHeightFog, V(0, 0, 0)); fc = fog.component
    fc.set_editor_property('fog_density', 0.02); fc.set_editor_property('fog_height_falloff', 0.2); fc.set_editor_property('enable_volumetric_fog', True)
    fc.set_editor_property('volumetric_fog_scattering_distribution', 0.6); fc.set_editor_property('volumetric_fog_extinction_scale', 1.2)
    fc.set_editor_property('fog_inscattering_luminance', unreal.LinearColor(0.002, 0.0015, 0.001, 1))
    def pl(loc, inten, col, rad=900, src=12, shadows=True, vol=2.0):
        a = eas.spawn_actor_from_class(unreal.PointLight, loc); c = a.point_light_component
        c.set_intensity(inten); c.set_light_color(unreal.LinearColor(*col, 1)); c.set_attenuation_radius(rad); c.set_editor_property('source_radius', src)
        c.set_cast_shadows(shadows); c.set_editor_property('volumetric_scattering_intensity', vol); return c
    ST.update(world=world, embers=embers)
    return pl

def setup_char():
    c = unreal.load_asset(CHAR); aes.open_editor_for_assets([c])
    actor = mhs.spawn_meta_human_actor(character=c)
    comps = actor.get_components_by_class(unreal.SkeletalMeshComponent)
    body = next((x for x in comps if x.does_socket_exist('head') and 'body' in x.get_name().lower()), None) or next(x for x in comps if x.does_socket_exist('head'))
    anim = unreal.load_asset(os.environ.get('QQ_ANIM', '/Game/QQ/Anims/MM_Idle_MH'))
    try:
        body.set_animation_mode(unreal.AnimationMode.ANIMATION_SINGLE_NODE); body.set_animation(anim)
        body.set_update_animation_in_editor(True); body.set_play_rate(0.0)
    except Exception as e: log('anim setup fail', e)
    log('char comps', [(x.get_name(), x.skeletal_mesh_asset.get_name() if x.skeletal_mesh_asset else None) for x in comps])
    ST.update(actor=actor, body=body, comps=comps, asset=c)
    # armour: rigid pieces modelled in the A-pose world space -> attach to their follow bones while the body is still in ref pose
    pj = os.environ.get('QQ_ARMOUR', '')
    if pj and os.path.exists(pj):
        n = 0
        skip = set(os.environ.get('QQ_ARMOUR_SKIP', 'SUR_Coat_Sim').split(','))
        for piece, d in json.load(open(pj)).items():
            if piece in skip: continue
            sm = unreal.load_asset(d['asset'])
            if sm is None: continue
            a = eas.spawn_actor_from_object(sm, V(0, 0, 0)); a.set_actor_label(piece)
            bone = d['bone']
            if 'matrix' in d:
                m = d['matrix']   # Blender world matrix (rows, metres, Z up, -Y front) -> UE (cm, Y mirrored)
                xa = V(m[0][0], -m[1][0], m[2][0]); za = V(m[0][2], -m[1][2], m[2][2])
                a.set_actor_location(V(m[0][3] * 100, -m[1][3] * 100, m[2][3] * 100), False, False)
                a.set_actor_rotation(unreal.MathLibrary.make_rot_from_xz(xa, za), False)
                if d['group'] == 'Weapon': bone = 'pelvis'   # sheathed at the hip
            a.attach_to_component(body, bone, unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD, False); n += 1
        log('armour attached', n)
    lift = float(os.environ.get('QQ_LIFT', '0'))
    if lift: actor.set_actor_location(V(0, 0, lift), False, False)

def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

def shot_at(i):
    """returns camera location, look-at, focal length, f-stop, key scale, back scale"""
    t = i / max(1, N - 1); eye = ST['eye']; fwd = ST['fwd']
    def around(ang, dist, up):
        a = math.radians(ang); d = V(fwd.x * math.cos(a) - fwd.y * math.sin(a), fwd.x * math.sin(a) + fwd.y * math.cos(a), 0)
        return V(eye.x + d.x * dist, eye.y + d.y * dist, eye.z + up)
    # A silhouette profile against the fire (0-.22) | B slow orbit, chest-up (.22-.52) | C frontal close-up hold (.52-.84) | D eyes (.84-1)
    if t < 0.22:
        u = smooth(t / 0.22); ang = 98 - 8 * u; dist = 175 - 45 * u
        return around(ang, dist, -4), V(eye.x, eye.y, eye.z - 6), 55, 2.0, 0.22, 1.6
    if t < 0.52:
        u = smooth((t - 0.22) / 0.30); ang = 55 - 35 * u; dist = 135 - 30 * u
        return around(ang, dist, -8), V(eye.x, eye.y, eye.z - 14), 65, 2.2, 1.0, 1.0
    if t < 0.84:
        u = smooth((t - 0.52) / 0.32); dist = 78 - 8 * u
        return around(4 - 4 * u, dist, 0), V(eye.x, eye.y, eye.z - 3), 85, 2.0, 1.0, 0.8
    u = smooth((t - 0.84) / 0.16); dist = 46 - 6 * u
    return around(0, dist, 1), V(eye.x, eye.y, eye.z + 1), 100, 1.8, 1.0, 0.8

def flicker(t, seed):
    return 1 + 0.16 * math.sin(6.28 * 1.7 * t + seed) + 0.10 * math.sin(6.28 * 3.3 * t + 2 * seed) + 0.07 * math.sin(6.28 * 7.9 * t + 3 * seed)

def run():
    pl = setup()
    setup_char()
    body = ST['body']; head = body.get_socket_location('head'); fwd = body.get_right_vector()
    ST['eye'] = V(head.x + fwd.x * 9, head.y + fwd.y * 9, head.z + float(os.environ.get('QQ_EYE_UP', '5'))); ST['fwd'] = fwd
    e = ST['eye']; log('eye', e, 'fwd', fwd)
    side = V(fwd.y, -fwd.x, 0)   # character's left (camera right in a frontal view)
    def at(f, s, u): return V(e.x + fwd.x * f + side.x * s, e.y + fwd.y * f + side.y * s, e.z + u)
    KI = float(os.environ.get('QQ_KEYI', '11'))
    key = pl(at(55, 60, -25), KI, (1.0, 0.6, 0.3), float(os.environ.get('QQ_KEYR', '700')), 18)
    key2 = pl(at(40, -75, -60), KI * 0.3, (1.0, 0.45, 0.12), 500, 10)
    BK = float(os.environ.get('QQ_BACK', '3'))
    back1 = pl(at(-160, 70, 10), KI * BK, (1.0, 0.45, 0.12), 600, 30, False, 3.0)
    back2 = pl(at(-160, -80, -20), KI * 2.5, (1.0, 0.40, 0.10), 600, 30, False, 3.0)
    rim = eas.spawn_actor_from_class(unreal.SpotLight, at(-120, -110, 60)); rc = rim.spot_light_component
    rc.set_intensity(KI * 1.2); rc.set_light_color(unreal.LinearColor(0.45, 0.62, 1.0, 1)); rc.set_attenuation_radius(500); rc.set_editor_property('outer_cone_angle', 30)
    rim.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(at(-120, -110, 60), e), False)
    rt = unreal.RenderingLibrary.create_render_target2d(ST['world'], W, H, unreal.TextureRenderTargetFormat.RTF_RGBA8)
    cap = eas.spawn_actor_from_class(unreal.SceneCapture2D, V(0, 0, 0)); cc = cap.capture_component2d
    cc.texture_target = rt; cc.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR; cc.capture_every_frame = False
    pps = cc.post_process_settings
    def ov(name, val):
        try: setattr(pps, 'override_' + name, True); setattr(pps, name, val)
        except Exception as ex: log('pp fail', name, ex)
    ov('auto_exposure_method', unreal.AutoExposureMethod.AEM_MANUAL); ov('auto_exposure_apply_physical_camera_exposure', False)
    ov('auto_exposure_bias', float(os.environ.get('QQ_EXPO', '-2.5')))
    ov('bloom_intensity', 0.8); ov('film_grain_intensity', 0.35); ov('vignette_intensity', 0.55)
    ov('white_temp', 6200.0); ov('color_saturation_shadows', unreal.Vector4(0.85, 0.95, 1.05, 1.0)); ov('color_gain_shadows', unreal.Vector4(0.85, 0.97, 1.08, 1.0))
    ov('depth_of_field_sensor_width', 36.0); ov('depth_of_field_fstop', 2.0); ov('depth_of_field_focal_distance', 100.0)
    ov('motion_blur_amount', 0.0)
    cc.post_process_settings = pps; cc.post_process_blend_weight = 1.0
    frames = [0, int(N * 0.15), int(N * 0.4), int(N * 0.7), int(N * 0.93)] if TEST else list(range(N))
    S = {'k': 0, 'phase': 'warm', 't0': time.time(), 'sub': 0}
    def tick(dt):
        if S.get('busy'): return
        S['busy'] = True
        try:
            if S['phase'] == 'warm':
                if time.time() - S['t0'] < float(os.environ.get('QQ_WARM_S', '360')): return
                S['phase'] = 'frame'; return
            if S['k'] >= len(frames):
                unreal.unregister_slate_post_tick_callback(S['h']); log('film done', len(frames)); LOG.close(); unreal.SystemLibrary.quit_editor(); return
            i = frames[S['k']]; tt = i / FPS
            if S['sub'] == 0:
                loc, look, flen, fst, ks, bs = shot_at(i)
                cap.set_actor_location(loc, False, False); cap.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(loc, look), False)
                cc.fov_angle = math.degrees(2 * math.atan(18.0 / flen))
                p2 = cc.post_process_settings; p2.override_depth_of_field_fstop = True; p2.depth_of_field_fstop = fst
                p2.override_depth_of_field_focal_distance = True; p2.depth_of_field_focal_distance = (look - loc).length(); cc.post_process_settings = p2
                key.set_intensity(KI * ks * flicker(tt, 0.3)); key2.set_intensity(KI * 0.3 * ks * flicker(tt, 1.7))
                key.set_light_color(unreal.LinearColor(1.0, 0.50 + 0.04 * math.sin(6.28 * 2.3 * tt), 0.17, 1))
                back1.set_intensity(KI * BK * bs * flicker(tt, 2.9)); back2.set_intensity(KI * BK * 0.83 * bs * flicker(tt, 4.1))
                for fb in ST['flames']:
                    b, s0, ph, fr = fb; k = 0.75 + 0.25 * math.sin(fr * tt + ph) + 0.12 * math.sin(2.7 * fr * tt + 2 * ph)
                    b.set_actor_scale3d(V(s0 * k, s0 * k, s0 * k * 1.9))
                for em in ST['embers']:
                    a, x0, y0, z0, v, ph, wob = em
                    z = (z0 + v * tt) % 330; x = x0 + 6 * math.sin(wob * tt + ph); y = y0 + 4 * math.cos(0.7 * wob * tt + ph)
                    a.set_actor_location(V(x, y, z), False, False)
                try: ST['body'].set_position(tt % 7.5, False)
                except Exception as ex: log('pose fail', ex)
                S['sub'] = 1; return
            if S['sub'] < 4: cc.capture_scene(); S['sub'] += 1; return
            unreal.RenderingLibrary.export_render_target(ST['world'], rt, FRAMES, f'f_{i:04d}.png')
            if S['k'] % 24 == 0: log('frame', i)
            S['k'] += 1; S['sub'] = 0
        except Exception as ex:
            log('tick ERROR', repr(ex), traceback.format_exc()); unreal.SystemLibrary.quit_editor()
        finally:
            S['busy'] = False
    unreal.EditorPythonScripting.set_keep_python_script_alive(True)
    S['h'] = unreal.register_slate_post_tick_callback(tick)

try:
    log('==== film', CHAR, TAG, 'frames', N, 'test', TEST)
    if os.environ.get('QQ_DO_ARMOUR') == '1':
        os.environ['QQ_NOQUIT'] = '1'; exec(open('F:/qirq-qiz/tools/metahuman/mh_armour.py', encoding='utf-8').read(), {'__name__': 'armour'}); log('armour import ran')
    run()
except Exception as e:
    log('ERROR', e, traceback.format_exc()); LOG.close(); unreal.SystemLibrary.quit_editor()
