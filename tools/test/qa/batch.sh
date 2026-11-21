#!/bin/bash
# batch.sh PORT0 LANG "id:shots[:GOD]" ...   -> bot runs, logs qa/m<id>_<lang>.log
P=$1; LG=$2; shift 2; i=0
for it in "$@"; do IFS=: read id sh god <<< "$it"; i=$((i+1)); n=m${id}_$LG${god:+g}
  LOWQ=1 STEPS=${STEPS:-14} SHOTS=$sh GOD=$god FINALSHOT=$FS ./q.sh $n $((P+i)) "lang=$LG&start=m$id" qa/bot.js 844 390 ${TM:-93}; done; echo BATCHDONE
