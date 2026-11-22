# UE 5.8 headless: report what export_geometry / assembly give for MHC_gulayim (mesh, skeleton, post-process ABP, DNA user data)
import unreal, os, traceback
OUT = 'F:/qirq-qiz/tools/metahuman/out'
LOG = open(f'{OUT}/inspect_ue.txt', 'w', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a); LOG.write(s + '\n'); LOG.flush(); unreal.log('QQI ' + s)
try:
    mhs = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
    c = unreal.load_asset('/Game/QQ/MHC_gulayim')
    log('char', c)
    log('pipeline types', [x for x in dir(unreal.MetaHumanDefaultPipelineType) if x.isupper()])
    log('build params', [x for x in dir(unreal.MetaHumanCharacterEditorBuildParameters) if not x.startswith('_')])
    log('geo params', [x for x in dir(unreal.MetaHumanGeometryExportParams) if not x.startswith('_')])
    log('mhs methods', [x for x in dir(mhs) if not x.startswith('_')])
    if not mhs.try_add_object_to_edit(c): raise RuntimeError('cannot edit')
    try:
        g = unreal.MetaHumanGeometryExportParams(); g.project_path = '/Game/QQ/Geo_gulayim'; g.full_body_skeletal_mesh = True; g.head_skeletal_mesh = False; g.body_skeletal_mesh = True; g.overwrite_existing_assets = True
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(c, g)
        for ap in unreal.EditorAssetLibrary.list_assets(g.project_path, recursive=True):
            a = unreal.load_asset(ap); log('asset', ap, type(a).__name__)
            if isinstance(a, unreal.SkeletalMesh):
                sk = a.skeleton; log('  skeleton', sk.get_path_name() if sk else None)
                log('  ppabp', a.get_editor_property('post_process_anim_blueprint'))
                log('  bounds', a.get_bounds())
                log('  mats', [(m.material_slot_name, m.material_interface.get_path_name() if m.material_interface else None) for m in a.materials])
                try: log('  userdata', [type(u).__name__ for u in a.get_editor_property('asset_user_data')])
                except Exception as e: log('  userdata err', e)
                try: log('  physics', a.physics_asset)
                except Exception as e: pass
                try: log('  lods', a.get_lod_num() if hasattr(a,'get_lod_num') else unreal.SkeletalMeshEditorSubsystem and None)
                except Exception: pass
        unreal.EditorAssetLibrary.save_directory(g.project_path, only_if_is_dirty=False, recursive=True)
    finally:
        if mhs.is_object_added_for_editing(c): mhs.remove_object_to_edit(c)
    for p in ['/MetaHumanCharacter/Body/ABP_Body_PostProcess', '/MetaHumanCharacter/Animation/Retargeting/RTG_MH_IKRig', '/MetaHumanCharacter/Animation/Retargeting/IK_MH_IKRig', '/MetaHumanCharacter/Animation/ABP_AnimationPreview', '/MetaHumanCharacter/Animation/TemplateAnimations/DT_MH_TemplateAnimations', '/MetaHumanCharacter/Female/Medium/NormalWeight/Body/metahuman_base_skel', '/Game/Characters/Mannequins/Meshes/SK_Mannequin', '/Game/Characters/Mannequins/Meshes/SKM_Quinn_Simple', '/Game/Characters/Mannequins/Anims/Unarmed/Walk/MF_Unarmed_Walk_Fwd']:
        a = unreal.load_asset(p); log('load', p, type(a).__name__ if a else None)
        if isinstance(a, unreal.IKRetargeter):
            try:
                rc = unreal.IKRetargeterController.get_controller(a)
                log('  rtg src', rc.get_ik_rig(unreal.RetargetSourceOrTarget.SOURCE), 'tgt', rc.get_ik_rig(unreal.RetargetSourceOrTarget.TARGET))
            except Exception as e: log('  rtg err', e)
        if isinstance(a, unreal.DataTable):
            try: log('  rows', unreal.DataTableFunctionLibrary.get_data_table_row_names(a))
            except Exception as e: log('  dt err', e)
            try: log('  csv', unreal.DataTableFunctionLibrary.export_data_table_to_csv_string(a)[:3000])
            except Exception as e: log('  csv err', e)
        if isinstance(a, unreal.AnimSequence):
            log('  len', a.get_play_length(), 'skel', a.get_skeleton().get_path_name())
    log('ikrig ctrl', [x for x in dir(unreal.IKRigController) if not x.startswith('_')])
    log('rtg ctrl', [x for x in dir(unreal.IKRetargeterController) if not x.startswith('_')])
    log('batch', [x for x in dir(unreal.IKRetargetBatchOperation) if not x.startswith('_')])
except Exception as e:
    log('ERROR', e); log(traceback.format_exc())
finally:
    LOG.close(); unreal.SystemLibrary.quit_editor()
