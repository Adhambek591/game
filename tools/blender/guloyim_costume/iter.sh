#!/bin/sh
# geometry iteration: build -> class masks -> silhouette match sheets (no bakes)
cd "$(dirname "$0")"; O="$(pwd -W)/out"
powershell -ExecutionPolicy Bypass -File bl.ps1 "$O/build_log.txt" -b --factory-startup --python build.py >/dev/null
grep -E "TOTAL|SHEATH|Error|line [0-9]+" "$O/build_log.txt" "$O/build_log.txt.err"
powershell -ExecutionPolicy Bypass -File bl.ps1 "$O/mask_log.txt" -b --factory-startup "$O/costume_low.blend" --python mask_render.py >/dev/null
PYTHONPATH="$(python -c 'import PIL,os;print(os.path.dirname(os.path.dirname(PIL.__file__)))')" "/c/Program Files/Blender Foundation/Blender 5.1/5.1/python/bin/python.exe" moslash.py | grep -v figures
