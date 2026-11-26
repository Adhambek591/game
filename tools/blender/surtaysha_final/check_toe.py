# Does the foot fit inside the boot's foot part? Radial comparison per cross-section along the foot.
# blender -b out/armor_low.blend --python check_toe.py
import bpy, math
body = bpy.data.objects['SUR_BodyProxy']; BV = [body.matrix_world @ v.co for v in body.data.vertices]
bo = bpy.data.objects['SUR_Boot_L']; KV = [bo.matrix_world @ v.co for v in bo.data.vertices]
foot = [p for p in BV if p.x > 0.02 and p.z < 0.13]
print('foot y %.3f..%.3f  boot y %.3f..%.3f  (front is -y)' % (min(p.y for p in foot), max(p.y for p in foot), min(p.y for p in KV), max(p.y for p in KV)))
print('foot x %.3f..%.3f  boot x %.3f..%.3f' % (min(p.x for p in foot), max(p.x for p in foot), min(p.x for p in KV if p.z < 0.13), max(p.x for p in KV if p.z < 0.13)))
worst = []
y = min(p.y for p in KV) + 0.004
while y < max(p.y for p in foot):
    ks = [p for p in KV if abs(p.y - y) < 0.007 and p.z < 0.16]; fs = [p for p in foot if abs(p.y - y) < 0.004]
    if len(ks) > 6 and fs:
        cx = sum(p.x for p in ks) / len(ks); cz = sum(p.z for p in ks) / len(ks); mx = 0.0; wp = None
        for p in fs:
            a = math.atan2(p.z - cz, p.x - cx); rb = math.hypot(p.x - cx, p.z - cz)
            near = [math.hypot(q.x - cx, q.z - cz) for q in ks if abs((math.atan2(q.z - cz, q.x - cx) - a + math.pi) % (2 * math.pi) - math.pi) < 0.35]
            if near and rb - max(near) > mx: mx = rb - max(near); wp = p
        if wp: worst.append((mx, y, wp))
    y += 0.008
for mx, y, p in worst: print('  y %.3f: foot outside by %.1f mm at x %.3f z %.3f' % (y, mx * 1000, p.x, p.z))
print('MAX %.1f mm' % (max((w[0] for w in worst), default=0) * 1000))
