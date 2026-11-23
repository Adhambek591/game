#!/bin/bash
# Usage: ./run.sh <script.py> [args]  -- runs a stage in headless Blender 5.1 (scripts lower their own priority).
cd "$(dirname "$0")"
s="$1"; shift
"/c/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --python "$s" -- "$@" 2>&1 | grep -v "blenderkit\|mpfb\|locationservice\|^$\|history step\|^FBX\|^Saved:\|^ Time:\|^Fra:\|^Blender 5\|^Info:\|^Blender quit"
