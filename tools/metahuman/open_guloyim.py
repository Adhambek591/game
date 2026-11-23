# One-click viewer: opens Guloyim (MHC_gulayim_final) in the MetaHuman Creator editor, which renders her real face skin and hair.
import unreal
c = unreal.load_asset('/Game/QQ/MHC_gulayim_final')
unreal.get_editor_subsystem(unreal.AssetEditorSubsystem).open_editor_for_assets([c])
