#!/bin/sh
# Surtaysha armour: full rebuild (Blender 5.1 headless). ~1 h on an RTX 3060 at 4K.
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
cd "$(dirname "$0")"
"$B" -b --factory-startup --python body_proxy.py                 # body: body/SK_Surtaysha_MHBody.fbx if present, else burly stand-in
"$B" -b --factory-startup --python build.py                      # game meshes -> out/armor_low.blend
"$B" -b --factory-startup --python trim_gen.py -- 4096           # leather/gold/braid trim sheet
"$B" -b --factory-startup --python plume_gen.py                  # horsehair cards
"$B" -b --factory-startup --python weave_gen.py                  # tiling cloth weave detail normal
"$B" -b --factory-startup --python bake_plates.py -- 4096        # lamellar atlas (40 plate + 4 lace variants)
"$B" -b out/armor_low.blend --python bake_unique.py -- T_Helmet,T_Armor,T_Cloth,T_Weapon 4096
"$B" -b out/armor_low.blend --python render.py -- "F:/qirq-qiz-unity/Builds" 160 front,q34,back,helmet 1.0
python compose.py "F:/qirq-qiz-unity/Builds"
"$B" -b out/armor_low.blend --python export.py                   # FBX per group + manifest
