#!/bin/bash
# symlink-assets snapshot of live repo -> /home/user/qa_snap, refuses if js doesn't parse
P=/home/user/website-5ef0831fd120367c52df72c9/app/public; S=/home/user/qa_snap
rm -rf $S.new; mkdir -p $S.new; cp -r $P/js $S.new/js; cp $P/*.html $P/*.webmanifest $P/sw.js $S.new/ 2>/dev/null
for d in $P/*; do b=$(basename $d); [ -e $S.new/$b ] || ln -s $d $S.new/$b; done
for f in $S.new/js/*.js; do node --check --input-type=module < $f 2>/dev/null || { echo PARSEFAIL $f; exit 1; }; done
rm -rf $S; mv $S.new $S; date > $S/SNAPTIME; echo SNAP OK $(cat $S/SNAPTIME)
