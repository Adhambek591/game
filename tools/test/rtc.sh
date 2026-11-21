#!/bin/bash
# rtc.sh <query> <script> <log> [w h timeout] — combat agent copy on port 8781
cd /home/user/website-5ef0831fd120367c52df72c9/app/public && (python3 -m http.server 8781 --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 1; cd /home/user/t
timeout ${6:-95} node runc.cjs "$1" ${4:-1280} ${5:-720} ./$2 > $3 2>&1; echo done >> $3; pkill -f "http.server 8781"
