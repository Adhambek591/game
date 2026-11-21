#!/bin/bash
OUT=$1; shift; : > $OUT
for id in "$@"; do echo "=== $id" >> $OUT; cd /home/user/t; LOWQ=1 TMAX=${TMAX:-330} MID=${MID:-} SHOT=ms_${id/-/_} bash rtp.sh 8790 "lang=qq&fast=1&start=m$id" ms_run.js ms_full_tmp.log 844 390 400 >/dev/null 2>&1; grep -v "^\[warning\] \[scenery\]" ms_full_tmp.log | grep -v '^\[st\]' >> $OUT; grep '^\[st\]' ms_full_tmp.log | tail -2 >> $OUT; sleep 1; done
echo ALLDONE >> $OUT
