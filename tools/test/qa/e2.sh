cd /home/user/t/qa
up() { echo "{\"qq_w4\":{\"men\":0,\"best\":{},\"up\":{\"sword\":$1,\"bow\":$1,\"armor\":$1,\"shield\":$1,\"arch\":5},\"lostAll\":0,\"bossPaid\":{}}}"; }
SEED=$(up 7) ./b3.sh 9311 d34cap qq 3-4
SHOTS=140 SEED=$(up 9) ./b3.sh 9312 d44 en 4-4
SEED=$(up 11) ./b3.sh 9313 d54 ru 5-4
SEED=$(up 15) ./b3.sh 9314 d74 qq 7-4
./b3.sh 9315 d13 qq 1-3
./b3.sh 9316 d32 uz 3-2
PER=38 ./b3.sh 9317 d41 qq 4-1,7-1
echo E2DONE
