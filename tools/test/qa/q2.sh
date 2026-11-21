#!/bin/bash
# q2.sh NAME PORT QUERY SCRIPT W H TMAX  (uses qa/runq.cjs: SEED env = JSON of localStorage)
N=$1; P=$2; Q=$3; S=$4; W=$5; H=$6; T=${7:-95}; D=${DIR:-/home/user/qa_snap}
cd /home/user/t; NAME=$N TMAX=$T flock /home/user/t/lockQ bash -c "cd $D && (python3 -m http.server $P --bind 127.0.0.1 >/dev/null 2>&1 &); for i in \$(seq 1 30); do curl -s --noproxy '*' -o /dev/null http://127.0.0.1:$P/index.html && break; sleep 1; done; cd /home/user/t/qa; PORT=$P timeout $((T+14)) node runq.cjs '$Q' $W $H ./$S > /home/user/t/qa/$N.log 2>&1; echo done >> /home/user/t/qa/$N.log; pkill -f 'http.server $P'"; echo "RUN $N pe=$(grep -c pageerror qa/$N.log)"
