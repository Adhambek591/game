# Opens Surtaysha (MHC_surtaysha_k) in the MetaHuman Creator editor.
import unreal
c = unreal.load_asset('/Game/QQ/MHC_surtaysha_k')
unreal.get_editor_subsystem(unreal.AssetEditorSubsystem).open_editor_for_assets([c])
