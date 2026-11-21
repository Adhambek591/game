for a in "$@"; do set -- $a; NAME=sc_$2 PAGE=pv.html timeout 200 node pvrun.cjs "$1" ${W:-700} ${H:-324} ./pv.js > sc_$2.txt 2>&1; done
