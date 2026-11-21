#!/bin/bash
cd /home/user/t/qa; date +%T; echo "lockQ waiters: $(pgrep -fa 'flock /home/user/t/lockQ' | grep -vc mcp)  mine: $(pgrep -fa 'flock /home/user/t/lockQ' | grep -c 'qa/')"
for f in "$@"; do [ -f $f.log ] && { echo "== $f: $(grep -c '^\[st\]' $f.log) st, $(grep -c pageerror $f.log) pe, $(tail -1 $f.log | cut -c1-20)"; grep '^\[st\]' $f.log | tail -1 | cut -c1-230; }; done
