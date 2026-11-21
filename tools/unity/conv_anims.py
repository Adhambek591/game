# anims.json (browser mocap library, glTF space) -> anims.txt for Unity's QQRig (raw values; retarget + handedness happen in C#)
import json, sys
d = json.load(open(sys.argv[1])); o = []
o.append('HIPSY %g' % d['hipsY'])
for b, r in d['rest'].items():
    o.append('REST %s %s %s' % (b, ' '.join('%.5f' % x for x in r['r']), ' '.join('%.5f' % x for x in r.get('t', [0, 0, 0]))))
for cn, bones in d['clips'].items():
    dur = max(max(T[k][0][-1] for k in T) for T in bones.values())
    o.append('CLIP %s %.4f' % (cn, dur))
    for bn, T in bones.items():
        for k, tag in (('rotation', 'R'), ('translation', 'T')):
            if k in T:
                t, v = T[k]
                o.append('%s %s %d %s | %s' % (tag, bn, len(t), ' '.join('%.4f' % x for x in t), ' '.join('%.4f' % x for x in v)))
open(sys.argv[2], 'w', newline='\n').write('\n'.join(o) + '\n')
print(len(o), 'lines')
