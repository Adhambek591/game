#!/bin/bash
# rebuild js/missions.js from the parts; refuses if someone else changed the live file since my last build
cd /home/user/agents/m2/src
L=/home/user/website-5ef0831fd120367c52df72c9/app/public/js/missions.js
norm() { sed -E 's/\?v=[0-9]+//g' "$1"; }
if [ -f ../last_built.js ] && ! diff -q <(norm $L) <(norm ../last_built.js) >/dev/null; then echo "LIVE FILE CHANGED BY SOMEONE ELSE:"; diff <(norm ../last_built.js) <(norm $L) | cut -c1-400 | head -20; [ "$1" = force ] || exit 1; fi
cat 00_head.js 10_table.js 20_kit.js 30_mid.js 40_convoy.js 45_rescue.js 50_run_a.js 60_run_b.js 65_v3.js 66_w4camps.js 67_tutorial.js 69_fix3.js 70_fly.js 75_archery.js > /tmp/missions.mjs
node --check /tmp/missions.mjs && cp /tmp/missions.mjs $L && cp /tmp/missions.mjs ../last_built.js && python3 /home/user/t/bust.py && echo BUILT
