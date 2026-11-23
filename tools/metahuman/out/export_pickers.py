import unreal
for p, fn in (('/MetaHumanCharacter/Lookdev_UHM/Eye/Textures/T_iris_color_picker', 'iris_picker.png'), ('/MetaHumanCharacter/Textures/T_Skin_Bar_Color_Picker', 'skin_picker.png')):
    t = unreal.AssetExportTask(); t.object = unreal.load_asset(p); t.filename = 'F:/qirq-qiz/tools/metahuman/out/' + fn; t.automated = True; t.prompt = False; t.replace_identical = True
    t.exporter = unreal.TextureExporterPNG(); unreal.Exporter.run_asset_export_task(t)
unreal.SystemLibrary.quit_editor()
