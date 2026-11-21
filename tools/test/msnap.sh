#!/bin/bash
# consistent snapshot for the missions agent (js + html copied, assets symlinked)
S=/home/user/t/msnap; P=/home/user/website-5ef0831fd120367c52df72c9/app/public
rm -rf $S; mkdir -p $S; cp -r $P/js $S/js; cp $P/*.html $P/*.webmanifest $S/ 2>/dev/null; for d in $P/*; do b=$(basename $d); [ -e $S/$b ] || ln -s $d $S/$b; done; echo snap
