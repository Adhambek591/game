cd /home/user/t/qa
CAP='{"qq_w4":{"men":0,"best":{},"up":{"sword":3,"bow":3,"armor":3,"shield":3,"arch":3},"lostAll":0,"bossPaid":{}}}'
./b3.sh 9301 c14 qq 1-4
SEED=$CAP ./b3.sh 9302 c14cap qq 1-4
./b3.sh 9303 cc1 qq 1-C1
./b3.sh 9304 c11 qq 1-1
./b3.sh 9305 c34 qq 3-4
LOWQ=1 STEPS=10 KEYE=1 ./q.sh ctu 9306 "lang=en&start=m0-0" qa/tut.js 1366 768 95
echo E1DONE
