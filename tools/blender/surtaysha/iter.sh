#!/bin/sh
# geometry iteration: (body) -> build -> class masks -> silhouette match vs surtaysha_turn.png (no bakes)
cd "$(dirname "$0")"; O="$(pwd -W)/out"
[ "$1" = "body" ] && powershell -ExecutionPolicy Bypass -File bl.ps1 "$O/body_log.txt" -b --factory-startup --python body_proxy.py >/dev/null && grep -E "PROXY|Error" "$O/body_log.txt"
powershell -ExecutionPolicy Bypass -File bl.ps1 "$O/build_log.txt" -b --factory-startup --python build.py >/dev/null
grep -E "TOTAL|RATIO|HELMET|Error|line [0-9]+" "$O/build_log.txt" "$O/build_log.txt.err" | head
powershell -ExecutionPolicy Bypass -File bl.ps1 "$O/mask_log.txt" -b --factory-startup "$O/armor_low.blend" --python mask_render.py >/dev/null
PYTHONPATH="$(python -c 'import PIL,os;print(os.path.dirname(os.path.dirname(PIL.__file__)))')" "/c/Program Files/Blender Foundation/Blender 5.1/5.1/python/bin/python.exe" moslash.py
