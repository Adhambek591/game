#!/bin/bash
# copies finished harness screenshots (1280x720, 24-bit PNG without alpha) into the release folder
cd /home/user/t/bench/shots; for f in *.png; do convert "$f" -alpha off -define png:color-type=2 /home/user/agents/release/screenshots/"$f"; done; ls -la /home/user/agents/release/screenshots
