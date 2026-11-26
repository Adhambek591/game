# Does the leg fit inside the boot shaft at every height (all round, including the back)? Radial comparison per slice.
# blender -b out/armor_low.blend --python check_shaft.py
import bpy, math
body = bpy.data.objects['SUR_BodyProxy']; BV = [body.matrix_world @ v.co for v in body.data.vertices]
bo = bpy.data.objects['SUR_Boot_L']; KV = [bo.matrix_world @ v.co for v in bo.data.vertices]
top = max(p.z for p in KV); worst = 0.0; rows = []
z = 0.13
while z < top - 0.012:
    ks = [p for p in KV if abs(p.z - z) < 0.010]; ls = [p for p in BV if p.x > 0.02 and abs(p.z - z) < 0.005]
    if len(ks) > 8 and ls:
        cx = sum(p.x for p in ks) / len(ks); cy = sum(p.y for p in ks) / len(ks); mx = -1.0; wa = 0.0; mn = 1.0
        for p in ls:
            a = math.atan2(p.y - cy, p.x - cx); rb = math.hypot(p.x - cx, p.y - cy)
            near = [math.hypot(q.x - cx, q.y - cy) for q in ks if abs((math.atan2(q.y - cy, q.x - cx) - a + math.pi) % (2 * math.pi) - math.pi) < 0.22]
            if not near: continue
            d = rb - max(near)
            if d > mx: mx = d; wa = a
            mn = min(mn, max(near) - rb)
        rows.append((z, mx, wa, mn)); worst = max(worst, mx)
    z += 0.02
for z, mx, wa, mn in rows:
    print('  z %.2f: leg outside by %5.1f mm (worst direction %4.0f deg; 90 = back, -90 = front, 180 = inner)  min clearance %.1f mm' % (z, max(0.0, mx) * 1000, math.degrees(wa), mn * 1000))
print('SHAFT MAX %.1f mm, boot top %.3f' % (max(0.0, worst) * 1000, top))
