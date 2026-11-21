#!/bin/bash
# pv.sh "<query>" name [w h]  -> /home/user/t/<name>.jpg ; scenery preview on port 8778
cd /home/user/t/www && (python3 -m http.server 8778 --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 1; cd /home/user/t
NAME=$2 PAGE=pv.html timeout ${5:-200} node pvrun.cjs "$1" ${3:-844} ${4:-390} ./pv.js > $2.txt 2>&1; echo done >> $2.txt; pkill -f "http.server 8778"
