#!/bin/bash
# myrt.sh <query> <script> <log> [w h timeout]  (scenery agent: own port 8777)
cd /home/user/website-5ef0831fd120367c52df72c9/app/public && (python3 -m http.server 8777 --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 1; cd /home/user/t
timeout ${6:-95} node myrun.cjs "$1" ${4:-1280} ${5:-720} ./$2 > $3 2>&1; echo done >> $3; pkill -f "http.server 8777"
