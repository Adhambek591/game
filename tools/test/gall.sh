#!/bin/bash
# gall.sh <suffix> [list "ms:z:x ..."]  -> gfx/<ms>_<suffix>.jpg   (env SPAWN default 1, WT)
cd /home/user/t; ./gsnap.sh
L=${2:-"1-1:-30:0 2-1:: 2-3:-110:0 3-1:-60:0 4-2:-50:2 5-1:-60:0 6-1:-40:0 7-2:-60:0"}
for it in $L; do IFS=: read ms z x <<< "$it"; if [ -n "$z" ]; then export Z=$z PX=$x; else unset Z PX; fi
DIR=/home/user/t/gsnap Q=${Q:-70} SPAWN=${SPAWN-1} NAME=gfx/${ms}_$1 ./rtp.sh 8821 "lang=uz&fast=1&start=m$ms" gshot.js gfx/${ms}_$1.txt 844 390 400; grep -h "pageerror\|\[error\]\|script\|ready" gfx/${ms}_$1.txt | cut -c1-400 | head -6; done; echo ALLDONE
