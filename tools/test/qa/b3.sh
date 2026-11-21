#!/bin/bash
# b3.sh PORT NAME LANG IDS [W H]  : chained run via runq (SEED env for localStorage), env SHOTS GOD NOMIX STEPS TOTEM
IDS=$4; first=${IDS%%,*}; rest=${IDS#*,}; [ "$rest" = "$IDS" ] && rest=""
export LOWQ=${LOWQ-1} STEPS=${STEPS:-30} IDS=$rest PER=${PER:-999} NOMIX=${NOMIX:-3}
./q2.sh $2 $1 "lang=$3&start=m$first" bot2.js ${5:-844} ${6:-390} ${TM:-95}
