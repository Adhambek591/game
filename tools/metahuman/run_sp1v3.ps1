# After the Head Scale is saved in the Creator: re-export the final body, import piece 1 (boots + trousers, textures together),
# render the bare head-scale check and piece 1 on white. One QQ UE instance; nothing else heavy at the same time.
New-Item -ItemType Directory -Force F:\qirq-qiz-unity\Builds\surt_p1v3 | Out-Null
Remove-Item Env:QQ_DJOBS -ErrorAction SilentlyContinue; Remove-Item Env:QQ_GX_EXPS -ErrorAction SilentlyContinue
$env:QQ_DCHAR='MHC_surtaysha_k'; $env:QQ_FINAL_FBX='F:/qirq-qiz/tools/blender/surtaysha/body/SK_Surtaysha_MH_FINAL.fbx'
$env:QQ_ARM_SRC_S='F:/qirq-qiz/tools/blender/surtaysha_final/out'; $env:QQ_ARM_TWOSIDED_S='1'
$env:QQ_COSTUME_DIR='F:/qirq-qiz/tools/blender/surtaysha_final/out/skinned'; $env:QQ_COSTUME_MAT='/Game/QQ/Surt/Mat/M_Surt_'; $env:QQ_COSTUME_KEYS='Lamellar,Cloth,Trim,Weapon,Helmet,Plume,Armor'
$env:QQ_TURN_FILE='F:/qirq-qiz/tools/metahuman/out/turn_sp1v3.json'
$env:QQ_BG_WHITE='6.0'; $env:QQ_ALLROUND='2.5'; $env:QQ_ALLROUND_SHADOW='1'; $env:QQ_KEY='3.2'; $env:QQ_FILL='1.8'; $env:QQ_SHOT_EXPO='0.8'; $env:QQ_WARM_S='300'
$env:QQ_RES='1536'; $env:QQ_RES_H='2304'; $env:QQ_SHOT_DIR='F:/qirq-qiz-unity/Builds/surt_p1v3'
& F:\qirq-qiz\tools\metahuman\ue_run.ps1 py F:/qirq-qiz/tools/metahuman/mh_beauty.py 'armour_s,import_costume,turn'
