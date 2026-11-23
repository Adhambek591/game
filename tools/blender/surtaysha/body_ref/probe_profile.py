# Probe: centre-line front/back profile and torso half-width of the MH body vs the HF3D body.
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
low_priority(); reset()
src = sys.argv[-1] if sys.argv[-1].endswith(".blend") else "hf_clean.blend"
mh_ob, J, parents, mh_arm = load_mh(); bake_world(mh_ob); M = sample_surface(mh_ob)
bpy.ops.wm.append(directory=os.path.join(WORK, src, "Object"), filename="HF")
H = sample_surface(bpy.data.objects["HF"])
print("   z   | MH front  back  halfw | HF front  back  halfw | d(front) d(back)")
for z in np.arange(1.84, 0.02, -0.04):
    row = []
    for C in (M, H):
        m = slab(C, z, 0.004); c = m[np.abs(C[m, 0]) < 0.03]
        try: xh = torso_box(C, z)[0]
        except Exception: xh = float('nan')
        if len(c): row += [C[c, 1].min(), C[c, 1].max(), xh]
        else:
            # below the crotch: use the leg cluster
            seg = side_segments(C, z, 1)
            P = C[seg[0]]; row += [P[:, 1].min(), P[:, 1].max(), P[:, 0].max()]
    print(" %.2f  | %6.3f %6.3f %6.3f | %6.3f %6.3f %6.3f | %6.3f %6.3f" % (z, *row, row[3] - row[0], row[4] - row[1]))
