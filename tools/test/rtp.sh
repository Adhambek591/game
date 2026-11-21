#!/bin/bash
# rtp.sh <port> <query> <script> <log> [w h timeout]
P=$1; shift
cd ${DIR:-/home/user/website-5ef0831fd120367c52df72c9/app/public} && (python3 -m http.server $P --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 6; cd /home/user/t
PORT=$P timeout ${6:-95} node runp.cjs "$1" ${4:-1280} ${5:-720} ./$2 > $3 2>&1; echo done >> $3; pkill -f "http.server $P"
