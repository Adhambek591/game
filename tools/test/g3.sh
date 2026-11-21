#!/bin/bash
# g3.sh <name> <ms> <z> <x> <varsfile> [port]  -> gfx/<name>_<i>.jpg ; serves a fresh snapshot gsnap3
cd /home/user/t; P=/home/user/website-5ef0831fd120367c52df72c9/app/public; D=/home/user/t/gsnap3_${6:-8831}
mkdir -p $D; for i in 1 2 3 4 5 6; do rm -rf $D/js; cp -r $P/js $D/js; cp $P/index.html $P/*.js $P/*.json $P/*.css $D/ 2>/dev/null; [ -e $D/assets ] || ln -s $P/assets $D/assets; n=$(grep -oh "?v=[0-9]*" $D/js/*.js $D/index.html | sort -u | wc -l); [ "$n" = "1" ] && break; sleep 2; done
[ -z "$3" ] && unset Z PX; [ -n "$3" ] && export Z=$3 PX=$4; export VARS=$5 NAME=gfx/$1 SPAWN=${SPAWN-1} Q=${Q:-72} QSET=${QSET-1}
(cd $D && python3 -m http.server ${6:-8831} --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 4
PORT=${6:-8831} timeout 500 node runp4.cjs "lang=uz&fast=1&start=m$2" 844 390 ./gshot3.js > gfx/$1.txt 2>&1; pkill -f "http.server ${6:-8831}"; grep -h "pageerror\|VAR\|ready" gfx/$1.txt | cut -c1-300; echo G3DONE
