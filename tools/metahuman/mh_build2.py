# Tick-driven MetaHuman build: open the character in the Creator editor so the face texture synthesis runs (it is async,
# needs editor ticks), wait until the synthesized face textures are real size (>= QQ_MIN_TEX), only then build_meta_human
# (CINEMATIC). Never builds from the 32x32 placeholders. Env: QQ_CHARS (one name), QQ_MIN_TEX (2048), QQ_MAXWAIT_S (1200).
import unreal, os, time, traceback
OUT = 'F:/qirq-qiz/tools/metahuman/out'
NAME = os.environ.get('QQ_CHARS', 'MHC_gulayim_final').split(',')[0]
MIN = int(os.environ.get('QQ_MIN_TEX', '2048')); MAXW = float(os.environ.get('QQ_MAXWAIT_S', '1200'))
LOG = open(f'{OUT}/mh_build2_log.txt', 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(time.strftime('%H:%M:%S ') + s + '\n'); LOG.flush(); unreal.log('QQB2 ' + s)
EAL = unreal.EditorAssetLibrary; mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
aes = unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)
st = {'phase': 'open', 't': time.time(), 'last': 0, 'busy': False}

def sizes(c):
    ft = c.synthesized_face_textures; out = {}
    for k, v in (ft.items() if hasattr(ft, 'items') else []):
        out[str(k).split('.')[-1].split(':')[0]] = (v.blueprint_get_size_x() if v else 0)
    return out

def done(msg):
    log('END', msg)
    try: unreal.unregister_slate_post_tick_callback(st['h'])
    except Exception: pass
    LOG.close(); unreal.SystemLibrary.quit_editor()

def tick(dt):
    if st['busy']: return
    st['busy'] = True
    try:
        now = time.time(); c = unreal.load_asset(f'/Game/QQ/{NAME}')
        if st['phase'] == 'open':
            log('==== build2', NAME, 'hi-res', c.has_high_resolution_textures)
            aes.open_editor_for_assets([c])
            if not mhs.is_object_added_for_editing(c): mhs.try_add_object_to_edit(c)
            mhs.commit_skin_settings(c, c.skin_settings)
            try: mhs.commit_eyes_settings(c, c.eyes_settings)
            except Exception as e: log('eyes commit', e)
            log('opened + skin committed', sizes(c)); st['phase'] = 'wait'; st['t'] = now; return
        if st['phase'] == 'wait':
            if now - st['last'] < 10: return
            st['last'] = now; s = sizes(c); bc = s.get('BASECOLOR', 0)
            log('wait', round(now - st['t']), 's', s)
            if bc >= MIN and all(v >= MIN // 4 for v in s.values()):
                EAL.save_asset(c.get_path_name(), only_if_is_dirty=False); st['phase'] = 'build'; return
            if now - st['t'] > MAXW: done(f'face textures never reached {MIN}: {s} - NOT building'); return
            return
        if st['phase'] == 'build':
            st['phase'] = 'after'; now = time.time()
            bp = unreal.MetaHumanCharacterEditorBuildParameters(); bp.pipeline_type = unreal.MetaHumanDefaultPipelineType.CINEMATIC
            bp.absolute_build_path = '/Game/MetaHumans'; bp.common_folder_path = '/Game/MetaHumans/Common'; bp.enable_wardrobe_item_validation = False
            log('building with face', sizes(c))
            try: mhs.build_meta_human(character=c, params=bp)
            except Exception as e: log('build raised', e)
            unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
            sz = os.path.getsize(f'F:/UnrealProjects/QQ_MetaHuman/Content/MetaHumans/{NAME}/Face/Baked/T_Head_BC.uasset')
            st['n'] = st.get('n', 0) + 1; log('build', st['n'], 'T_Head_BC.uasset bytes', sz)
            # the bake renders the face material offscreen: on a cold editor its shaders are not compiled yet and the
            # bake comes out as the grey default material -> wait for shaders, build again (max 3 times)
            if sz > 3_000_000 or st['n'] >= 3: done(f'built (T_Head_BC {sz} bytes)'); return
            st['phase'] = 'shaderwait'; st['t'] = now; return
        if st['phase'] == 'shaderwait':
            if now - st['t'] < float(os.environ.get('QQ_SHADER_WAIT', '420')): return
            st['phase'] = 'build'; return
    except Exception as e:
        log('tick ERROR', repr(e), traceback.format_exc()); done('error')
    finally:
        st['busy'] = False

unreal.EditorPythonScripting.set_keep_python_script_alive(True)
st['h'] = unreal.register_slate_post_tick_callback(tick)
