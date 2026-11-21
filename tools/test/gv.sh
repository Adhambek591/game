#!/bin/bash
# gv.sh "<query>" name
cd /home/user/t && ./gsnap.sh && python3 mkgv.py >/dev/null
Q=${Q:-75} NAME=gfx/$2 PAGE=gv.html DIR=/home/user/t/gsnap ./rtp.sh 8822 "$1" pv.js gfx/$2.txt 844 390 420
grep -v "toNonIndexed" gfx/$2.txt | head -8
