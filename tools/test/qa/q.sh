#!/bin/bash
# q.sh NAME PORT QUERY SCRIPT W H TMAX [env...]  -> one locked run, log qa/NAME.log
N=$1; P=$2; Q=$3; S=$4; W=$5; H=$6; T=${7:-95}
cd /home/user/t; DIR=${DIR:-/home/user/qa_snap} NAME=$N TMAX=$T flock /home/user/t/lockQ ./pf/rtp2.sh $P "$Q" $S qa/$N.log $W $H $((T+14)); echo "RUN $N pe=$(grep -c pageerror qa/$N.log)"
