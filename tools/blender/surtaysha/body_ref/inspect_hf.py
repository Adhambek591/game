# Step 0: mesh statistics and close-up renders of the HF3D body (to plan the beard cut and the joint fit).
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
low_priority(); reset()
src = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else HF_FBX
tag = sys.argv[sys.argv.index("--") + 2] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 2 else "hf"
ob = load_hf(src)
mesh_stats(ob, tag)
ob.data.materials.append(mat("g", (0.8, 0.8, 0.8, 1)))
for p in ob.data.polygons: p.use_smooth = False
setup_render(1100, 1100)
views = {
 "z_front": ((0, -5, 1.58), (0, 0, 1.58), 0.36),
 "z_side": ((-5, 0, 1.58), (0, 0, 1.58), 0.36),
 "z_34": ((-3, -4, 1.75), (0.02, -0.06, 1.57), 0.36),
 "z_34b": ((-4, -2, 1.3), (0.02, -0.06, 1.57), 0.36),
 "z_below": ((0, -4, 0.6), (0, -0.06, 1.56), 0.36),
}
for k, (loc, look, s) in views.items():
    render(ortho_cam(k, loc, look, s), os.path.join(WORK, "%s_%s.png" % (tag, k)))
