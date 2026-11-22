# Dump the MetaHuman face/skin/identity Python API available in UE 5.8 -> out/api_dump.txt (read-only, no asset changes)
import unreal
L = open('F:/qirq-qiz/tools/metahuman/out/api_dump.txt', 'w', encoding='utf-8')
def w(*a): L.write(' '.join(str(x) for x in a) + '\n')
names = [n for n in dir(unreal) if any(k in n for k in ('MetaHuman', 'Identity', 'PromotedFrame', 'FaceState', 'Parametric', 'Blend'))]
for n in sorted(names):
    o = getattr(unreal, n)
    mem = [m for m in dir(o) if not m.startswith('_') and m not in ('cast', 'copy', 'assign', 'static_struct', 'static_class', 'get_class', 'get_default_object', 'export_text', 'import_text', 'to_dict', 'to_tuple', 'get_editor_property', 'set_editor_property', 'set_editor_properties', 'reset_editor_property', 'is_editor_property_overridden', 'get_fname', 'get_full_name', 'get_name', 'get_outer', 'get_outermost', 'get_package', 'get_path_name', 'get_typed_outer', 'get_world', 'is_package_external', 'modify', 'rename', 'acquire_editor_element_handle', 'call_method')]
    w('##', n, mem)
mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
for fn in ('get_face_model_coefficients', 'set_face_model_coefficients', 'commit_head_model_settings', 'commit_skin_settings', 'commit_face_state', 'import_from_identity', 'fit_state_to_target_vertices', 'conform_to_target_meshes'):
    w('DOC', fn, getattr(mhs, fn).__doc__)
c = unreal.load_asset('/Game/QQ/MHC_gulayim')
for p in ('skin_settings', 'head_model_settings', 'face_evaluation_settings', 'eyes_settings', 'makeup_settings'):
    try: w('CHAR', p, c.get_editor_property(p))
    except Exception as e: w('CHAR', p, 'ERR', e)
L.close(); unreal.SystemLibrary.quit_editor()
