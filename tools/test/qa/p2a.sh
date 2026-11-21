cd /home/user/t/qa
LOWQ=1 STEPS=10 SHOTSET=parry ./q.sh tu3 9101 "lang=qq&start=m0-0" qa/tut.js 844 390 95
LOWQ=1 STOPAT=dlg ./q.sh fr3 9102 "lang=uz" qa/flow.js 844 390 80
./b2.sh 9103 p01 ru 0-1 999
./b2.sh 9104 p02 qq 0-2 999
./b2.sh 9105 p12 qq 1-2 999
./b2.sh 9106 p34 qq 3-4 999
./b2.sh 9107 p44 en 4-4 999
echo P2ADONE
