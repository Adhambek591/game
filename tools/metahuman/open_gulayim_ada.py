# Opens Guloyim on Ada's body (MHC_gulayim_ada) in the MetaHuman Creator.
import unreal
c = unreal.load_asset('/Game/QQ/MHC_gulayim_ada')
unreal.get_editor_subsystem(unreal.AssetEditorSubsystem).open_editor_for_assets([c])
