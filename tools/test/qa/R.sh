R () 
{ 
    echo "== $1";
    grep "\[end\]\|result\|^ST\|PERF\|script\|pageerror\|BOSSBAR\|shot\]" $1.log 2> /dev/null | cut -c1-720;
    echo "deaths: $(grep -c DEATH $1.log) watchdog: $(grep -c watchdog $1.log)";
    grep "^\[st\]" $1.log | tail -1 | cut -c1-230
}
