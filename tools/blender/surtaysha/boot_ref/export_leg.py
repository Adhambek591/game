# dumps the left lower leg / foot vertices of the body proxy (world metres) for the boot fit: boot_ref/leg_pts.npy
# blender -b out/proxy.blend --python boot_ref/export_leg.py
import bpy, os, numpy as np
o = bpy.data.objects['SUR_BodyProxy']
P = np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices], dtype=np.float32)
P = P[(P[:, 0] > 0.0) & (P[:, 2] < 0.60)]
np.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leg_pts.npy'), P)
print('LEG PTS', len(P), P.min(axis=0), P.max(axis=0))
