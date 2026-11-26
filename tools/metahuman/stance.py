# Side-view alignment of an exported body (out/gp_mesh_<tag>.json): how far forward (+) / back (-) of the ankle the hip,
# the shoulder and the ear are, and the lean of the ankle-hip-shoulder-ear lines. python stance.py <tag> [<tag> ...]
import json, sys, math
OUT = 'F:/qirq-qiz/tools/metahuman/out'
for tag in sys.argv[1:]:
    V = json.load(open(f'{OUT}/gp_mesh_{tag}.json'))['v']
    mn = [min(q[i] for q in V) for i in range(3)]; mx = [max(q[i] for q in V) for i in range(3)]; ex = [mx[i] - mn[i] for i in range(3)]
    up = ex.index(max(ex)); rest = [i for i in range(3) if i != up]; lat = max(rest, key=lambda i: ex[i]); dep = [i for i in rest if i != lat][0]; lc = (mn[lat] + mx[lat]) / 2
    C = [(q[lat] - lc, q[dep], q[up] - mn[up]) for q in V]
    toes = [q[1] for q in C if q[2] < 3]; heel = [q[1] for q in C if q[2] < 3]
    fs = 1.0 if (sum(q[1] for q in C if q[2] < 3) / len(toes)) > (sum(q[1] for q in C if 85 < q[2] < 95 and abs(q[0]) < 12) / max(1, sum(1 for q in C if 85 < q[2] < 95 and abs(q[0]) < 12))) else -1.0
    C = [(x, y * fs, z) for x, y, z in C]; H = max(q[2] for q in C)
    def mid(pts): ys = [p[1] for p in pts]; return (min(ys) + max(ys)) / 2
    ank = mid([q for q in C if 6 < q[2] < 9 and q[0] > 2])                       # ankle: middle of the leg just above the foot
    crotch = min(q[2] for q in C if abs(q[0]) < 0.8 and q[2] > 60)
    hipz = crotch + 8; hip = mid([q for q in C if abs(q[2] - hipz) < 1.5 and abs(q[0]) < 22])   # hip joint level: middle of the pelvis
    sh = max(q[2] for q in C if 15 < abs(q[0]) < 19); sho = mid([q for q in C if sh - 4 < q[2] < sh - 1 and 14 < abs(q[0]) < 20])   # shoulder: middle of the shoulder cap
    earz = H - 13.5; side = sorted([q for q in C if abs(q[2] - earz) < 1.5], key=lambda q: -abs(q[0]))[:40]; ear = sum(q[1] for q in side) / len(side)
    c7 = min(q[1] for q in C if abs(q[0]) < 3 and sh - 2 < q[2] < sh + 6); back = min(q[1] for q in C if abs(q[0]) < 6 and sh - 22 < q[2] < sh - 8); seat = min(q[1] for q in C if abs(q[0]) < 12 and crotch < q[2] < crotch + 14)
    print('%s: height %.1f cm' % (tag, H))
    print('   forward (+) / back (-) of the ankle, cm:  hip %+.1f   shoulder %+.1f   ear %+.1f' % (hip - ank, sho - ank, ear - ank))
    print('   lean from vertical: ankle->hip %+.1f deg, hip->shoulder %+.1f deg, shoulder->ear %+.1f deg  (+ = forward)' % (math.degrees(math.atan2(hip - ank, hipz - 7.5)), math.degrees(math.atan2(sho - hip, sh - 2.5 - hipz)), math.degrees(math.atan2(ear - sho, earz - sh + 2.5))))
    print('   back surface relative to the ankle: seat %+.1f, upper back (shoulder blades) %+.1f, neck base %+.1f' % (seat - ank, back - ank, c7 - ank))
