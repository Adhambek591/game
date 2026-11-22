#!/bin/sh
# Guloyim costume + armour: full rebuild (Blender 5.1 headless, BelowNormal priority via bl.ps1). ~1 h on an RTX 3060.
# From Git Bash:  sh run_all.sh      (or call bl.ps1 per step from PowerShell; quote '--' there)
cd "$(dirname "$0")"
H="$(pwd -W 2>/dev/null || pwd)"; O="$H/out"
run() { log="$1"; shift; powershell -ExecutionPolicy Bypass -File bl.ps1 "$O/$log" "$@"; }
run body_log.txt   -b --factory-startup --python body.py                       # MetaHuman body -> out/body.blend + landmarks.json
run build_log.txt  -b --factory-startup --python build.py                      # game meshes -> out/costume_low.blend
run topo_log.txt   -b --factory-startup "$O/costume_low.blend" --python check_topo.py   # tris / quads / plate islands / joint loops
run trim_log.txt   -b --factory-startup --python trim_gen.py -- 4096           # leather / dark-red belt / silver / chain trim sheet
run weave_log.txt  -b --factory-startup --python weave_gen.py                  # tiling cloth weave detail normal
run plates_log.txt -b --factory-startup --python bake_plates.py -- 4096        # lamellar atlas (40 plates + 4 laces)
run unique_log.txt -b --factory-startup "$O/costume_low.blend" --python bake_unique.py -- T_Cloth,T_Armor,T_Jewel,T_Weapon,T_Amulet 4096
run render_log.txt -b --factory-startup "$O/costume_low.blend" --python render.py -- "F:/qirq-qiz-unity/Builds" 160 front,q34,side,back,amulet,etik 1.0
python compose.py "F:/qirq-qiz-unity/Builds" guloyim_kiyim_
run export_log.txt -b --factory-startup "$O/costume_low.blend" --python export.py   # FBX per group + manifest
