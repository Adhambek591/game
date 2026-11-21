#!/bin/bash
# ms_batch.sh <out> ids...
OUT=$1; shift; : > $OUT
for id in "$@"; do echo "=== $id" >> $OUT; cd /home/user/t; LOWQ=1 RUNS=${RUNS:-15} bash rtp.sh 8790 "lang=qq&fast=1&start=m$id" ms_smoke.js ms_sm_tmp.log 844 390 150 >/dev/null 2>&1; grep -v "^\[warning\] \[scenery\]" ms_sm_tmp.log >> $OUT; sleep 1; done
echo ALLDONE >> $OUT
