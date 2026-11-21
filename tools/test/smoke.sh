#!/bin/bash
P=$1; shift
for s in "$@"; do DIR=/home/user/snap LOWQ=1 SS=smk_$s ./rtp.sh $P "lang=uz&fast=1&start=$s" ss.js smk_$s.log 844 390 110; done
echo ALLDONE > smk_$P.done
