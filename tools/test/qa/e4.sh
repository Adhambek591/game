cd /home/user/t/qa
RET='{"qq_tut":"1","qq_prog":"3","qq_ch":"3","qq_last":"3-1","qq_stars":{"0-0":1,"0-1":2,"0-2":3,"1-1":2,"1-2":3,"1-3":1,"1-C1":1,"1-C2":2,"1-4":3,"2-1":3,"2-2":2,"2-3":2,"2-C1":2,"2-C2":2,"2-4":3},"qq_w4":{"men":120,"best":{"1-1":20},"up":{"sword":3,"bow":2,"armor":2,"shield":1,"arch":2},"lostAll":0,"bossPaid":{"1":1,"2":1}}}'
SEED=$RET ./q2.sh uiq 9331 "lang=qq" ui.js 844 390 95
SEED=$RET ./q2.sh uir 9332 "lang=ru" ui.js 844 390 95
MID=3-S ./q.sh ar3 9333 "lang=qq" fx3/axl.js 844 390 95
MID=5-S ./q.sh ar5 9334 "lang=qq" fx3/axl.js 844 390 95
MID=6-S ./q.sh ar6 9335 "lang=qq" fx3/axl.js 844 390 95
up() { echo "{\"qq_w4\":{\"men\":40,\"best\":{},\"up\":{\"sword\":$1,\"bow\":$1,\"armor\":$1,\"shield\":$1,\"arch\":$2},\"lostAll\":0,\"bossPaid\":{}}}"; }
SEED=$(up 14 5) ./b3.sh 9336 g71 en 7-1
echo E4DONE
