#!/bin/bash
# v3b.sh "<missions>" TMAX
cd /home/user/t
for m in $1; do DIR=/home/user/t/msnap LOWQ=1 NAME=v3_$m TMAX=${2:-200} ./rtp.sh 8831 "lang=qq&start=m$m" m2_run.js v3_$m.log 844 390 $(( ${2:-200} + 60 )); echo "$m $(grep -c pageerror v3_$m.log) $(grep '\[end\]' v3_$m.log | cut -c1-200)"; done; echo BATCHDONE
