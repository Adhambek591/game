cd /home/user/t/qa
NOMIX=3 ./b2.sh 9120 a11b qq 1-1 999
./b2.sh 9116 a32 qq 3-2 999
SHOTS=125 ./b2.sh 9117 ac1 qq 1-C1 999
SHOTS=125 ./b2.sh 9118 a6q qq 6-Q 999
STOPAT=fade ./q.sh atitle 9119 "lang=en" qa/flow.js 1366 768 60
echo C2DONE
