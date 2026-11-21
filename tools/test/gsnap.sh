#!/bin/bash
# consistent snapshot of public js/index.html (other agents bust versions concurrently)
P=/home/user/website-5ef0831fd120367c52df72c9/app/public
for i in 1 2 3 4 5 6; do rm -rf /home/user/t/gsnap/js; cp -r $P/js /home/user/t/gsnap/js; cp $P/index.html $P/*.js $P/*.json $P/*.css /home/user/t/gsnap/ 2>/dev/null; n=$(grep -oh "?v=[0-9]*" /home/user/t/gsnap/js/*.js /home/user/t/gsnap/index.html | sort -u | wc -l); [ "$n" = "1" ] && break; sleep 2; done
