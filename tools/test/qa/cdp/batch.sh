#!/bin/bash
# batch.sh TAG id1 id2 ...   -> runs QA bot2 per mission at the chapter cap, logs qa/TAG_<id>.log, summary qa/TAG.sum
S=${S:-/c/Users/elite/AppData/Local/Temp/claude/37c38205362743c3/d35e9f6f-788a-4fbc-9bb9-1fc626f8b536/scratchpad}; R=$(cd $(dirname $0)/../../../.. && pwd)
TAG=$1; shift; cd $R; mkdir -p $S/qa; : > $S/qa/$TAG.sum
for id in "$@"; do c=${id%%-*}; [ "$c" = 0 ] && c=1; cap=$((2*c+1)); st='{'; for ((k=0;k<c;k++)); do [ $k -gt 0 ] && st="$st\"$k-4\":3,"; done; st="$st\"0-0\":3}"
  SEED="{\"qq_w4\":{\"v\":1,\"men\":40,\"best\":{},\"up\":{\"sword\":$cap,\"bow\":$cap,\"armor\":$cap,\"shield\":$cap,\"arch\":5},\"lostAll\":0,\"capSeen\":$c,\"bossPaid\":{},\"coins\":{},\"mig\":1},\"qq_stars\":$st,\"qq_tut\":\"1\"}"
  L=$S/qa/${TAG}_$id.log
  SEED="$SEED" TMAX=${TMAX:-420} STEPS=${STEPS:-30} NOMIX=3 timeout $(( ${TMAX:-420} + 120 )) node $R/tools/test/qa/cdp/runp.cjs "lang=${LG:-uz}&start=$id" 844 390 tools/test/qa/bot2.js > $L 2>&1
  r=$(grep -m1 "^\[result\]" $L | cut -c1-120); e=$(grep -m1 "^\[end\]" $L | cut -c1-200); pe=$(grep -c "pageerror" $L); ST=$(grep "^ST " $L | tail -1 | grep -oE '"(deaths|blocked|allyFar|allyS|visSpawn|bossMinHp|pMinHp)":[0-9.null]+' | tr '\n' ' ')
  echo "$id | $r | pe=$pe | $ST | $e" >> $S/qa/$TAG.sum
done
echo ALLDONE >> $S/qa/$TAG.sum
