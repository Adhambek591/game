import bpy, math
body = bpy.data.objects['SUR_BodyProxy']; BV = [body.matrix_world @ v.co for v in body.data.vertices]
foot = [p for p in BV if p.x > 0.02 and p.z < 0.10]
y0, y1 = min(p.y for p in foot), max(p.y for p in foot)
heel = [p for p in foot if p.y > y1 - 0.04]; toe = [p for p in foot if p.y < y0 + 0.05]
hc = (sum(p.x for p in heel) / len(heel), sum(p.y for p in heel) / len(heel)); tc = (sum(p.x for p in toe) / len(toe), sum(p.y for p in toe) / len(toe))
print('FOOT heel centre', hc, 'toe centre', tc, 'toe-out deg %.1f' % math.degrees(math.atan2(tc[0] - hc[0], -(tc[1] - hc[1]))), 'length %.3f' % (y1 - y0))
for z in (0.15, 0.25, 0.35):
    s = [p for p in BV if p.x > 0.02 and abs(p.z - z) < 0.008]
    print('LEG z %.2f x %.3f..%.3f y %.3f..%.3f' % (z, min(p.x for p in s), max(p.x for p in s), min(p.y for p in s), max(p.y for p in s)))
for n in ('SUR_Boot_L', 'SUR_Boot_Shaft_L'):
    o = bpy.data.objects[n]
    for z in (0.15, 0.25, 0.35):
        s = [o.matrix_world @ v.co for v in o.data.vertices]; s = [p for p in s if abs(p.z - z) < 0.012]
        if s: print(n, 'z %.2f x %.3f..%.3f y %.3f..%.3f' % (z, min(p.x for p in s), max(p.x for p in s), min(p.y for p in s), max(p.y for p in s)))
