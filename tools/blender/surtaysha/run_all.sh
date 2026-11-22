#!/bin/sh
# Surtaysha armour: full rebuild (Blender 5.1 headless). ~1 h on an RTX 3060 at 4K.
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
cd "$(dirname "$0")"
"$B" -b --factory-startup --python body_proxy.py                 # body: body/SK_Surtaysha_MHBody.fbx if present, else burly stand-in
# boots are matched to the reference picture (boot_ref/): masks -> metric profiles -> hull (python needs PIL + numpy + scipy)
python boot_ref/extract_masks.py                                 # mask_front.png / mask_side.png (+ check_*.png to eyeball the trace)
python boot_ref/boot_fit.py                                      # boot_profile.npz
"$B" -b out/proxy.blend --python boot_ref/export_leg.py          # leg_pts.npy
python boot_ref/quick_check.py                                   # fast IoU + "leg stays inside the boot" check, no Blender
"$B" -b --factory-startup --python build.py                      # game meshes -> out/armor_low.blend
"$B" -b --factory-startup --python trim_gen.py -- 4096           # leather/gold/braid trim sheet
"$B" -b --factory-startup --python plume_gen.py                  # horsehair cards
"$B" -b --factory-startup --python weave_gen.py                  # tiling cloth weave detail normal
"$B" -b --factory-startup --python bake_plates.py -- 4096        # lamellar atlas (40 plate + 4 lace variants)
"$B" -b out/armor_low.blend --python bake_unique.py -- T_Helmet,T_Armor,T_Cloth,T_Weapon 4096
"$B" -b out/armor_low.blend --python render.py -- "F:/qirq-qiz-unity/Builds" 160 front,q34,side,back,helmet,etik,etik_side,mfront,mside,mq34 1.0
python compose.py "F:/qirq-qiz-unity/Builds"
"$B" -b out/armor_low.blend --python boot_ref/check_render.py -- "F:/qirq-qiz/tools/blender/surtaysha/out/boot_check"   # orthographic silhouettes vs masks -> iou.json
python boot_ref/moslash_sheet.py "F:/qirq-qiz-unity/Builds" out/boot_check      # surtaysha_etik_moslash.png
python cmp_sheet.py "F:/qirq-qiz-unity/Builds"
"$B" -b out/armor_low.blend --python export.py                   # FBX per group + manifest
