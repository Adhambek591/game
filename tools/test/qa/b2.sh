#!/bin/bash
# b2.sh PORT NAME LANG IDS [PER] [GOD]  : one chained run
IDS=$4; first=${IDS%%,*}; rest=${IDS#*,}; [ "$rest" = "$IDS" ] && rest=""
LOWQ=1 STEPS=${STEPS:-30} IDS=$rest PER=${5:-999} GOD=$6 SHOTS=$SHOTS NOMIX=$NOMIX ./q.sh $2 $1 "lang=$3&start=m$first" qa/bot2.js 844 390 ${TM:-95}
