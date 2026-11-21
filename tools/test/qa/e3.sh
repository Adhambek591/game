cd /home/user/t/qa
up() { echo "{\"qq_w4\":{\"men\":40,\"best\":{},\"up\":{\"sword\":$1,\"bow\":$1,\"armor\":$1,\"shield\":$1,\"arch\":$2},\"lostAll\":0,\"bossPaid\":{}}}"; }
SEED=$(up 4 2) ./b3.sh 9321 f23 ru 2-3
SEED=$(up 6 3) ./b3.sh 9322 f31 qq 3-1
SEED=$(up 8 4) ./b3.sh 9323 f42 uz 4-2
SHOTS=135,200 SEED=$(up 10 5) ./b3.sh 9324 f5c qq 5-C1
SHOTS=240 SEED=$(up 12 5) ./b3.sh 9325 f6q qq 6-Q
SHOTS=215 SEED=$(up 9 5) ./b3.sh 9326 f44 qq 4-4
SEED=$(up 6 3) ./b3.sh 9327 f32 qq 3-2
echo E3DONE
