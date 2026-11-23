# Stage 4: check the re-posed HF3D body against the MetaHuman A-pose.
#  - re-imports the exported FBX (so the file itself is what gets checked)
#  - measures the pose again from the mesh alone (slices) and prints before / after / MetaHuman angles
#  - overlay sheet: front | left side | top, MetaHuman blue, HF3D orange, both semi-transparent, with the
#    MetaHuman skeleton (dark blue) and the re-posed HF joints (red) drawn on top
#    -> F:\qirq-qiz-unity\Builds\surtaysha_apose_check.png
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from fitlib import *
from armfit import arm_analysis
low_priority(); reset()
SHEET = CFG["SHEET_APOSE"]
fit = json.load(open(os.path.join(WORK, "fit.json"))); posed = json.load(open(os.path.join(WORK, "posed.json")))
J = {k: np.array(v) for k, v in fit["MH"].items()}
J0 = {k: np.array(v) for k, v in fit["HF"].items()}
JP = {k: np.array(v) for k, v in posed["HFp"].items()}
CAL = fit["cal"]; LM = fit["LM"]

mh_ob, _, _, mh_arm = load_mh(); bake_world(mh_ob); mh_ob.name = "MH"
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
objs = [o for o in import_fbx(OUT_FBX) if o.type == 'MESH']
assert len(objs) == 1, "FBX must hold exactly one mesh"
hf = objs[0]
print("FBX object scale", tuple(round(s, 4) for s in hf.scale), "-> vertex data", "cm" if abs(hf.scale[0] - 0.01) < 1e-6 else "m", "; other objects in file:", len(bpy.data.objects) - 2)
bake_world(hf); hf.name = "HF"
st = mesh_stats(hf, "exported fbx")
c = co(hf)
print("HEIGHT %.2f cm, feet z %.3f cm, x [%.1f, %.1f] cm, y [%.1f, %.1f] cm" % ((c[:, 2].max() - c[:, 2].min()) * 100, c[:, 2].min() * 100, c[:, 0].min() * 100, c[:, 0].max() * 100, c[:, 1].min() * 100, c[:, 1].max() * 100))

# ---------------------------------------------------------------- pose measured from the meshes alone
M = sample_surface(mh_ob); P = sample_surface(hf)
Lp = levels(P)
def mesh_pose(C, L, joints):
    """Limb directions from slices only (shoulder / hip taken from joints, everything else from the mesh)."""
    out = {}
    for s, sg in (("l", 1), ("r", -1)):
        sh = joints["upperarm_" + s]
        a = arm_analysis(C, L, sg, sh, CAL[s]['elbow_ratio'], CAL[s]['wrist_along'])
        n = a['palm_n'] if a['palm_n'][0] * sg > 0 else -a['palm_n']
        hip = joints["thigh_" + s]
        fx, fy = leg_frac(M, LM, sg, J["calf_" + s]); kn = leg_from_frac(C, L, sg, fx, fy, J["calf_" + s][2])
        fx, fy = leg_frac(M, LM, sg, J["foot_" + s]); an = leg_from_frac(C, L, sg, fx, fy, J["foot_" + s][2])
        fd, _ = foot_dir(C, sg)
        out[s] = dict(upperarm=a['elbow_ratio'] - sh, lowerarm=a['wrist'] - a['elbow_ratio'], hand=a['hand_dir'], back_of_hand=n,
                      thigh=kn - hip, calf=an - kn, toe=fd, wrist=a['wrist'], elbow=a['elbow_ratio'], knee=kn, ankle=an, kink=a['kink'])
    return out
LM2 = dict(LM)
pm = mesh_pose(M, LM2, J)
pp = mesh_pose(P, Lp, JP)
bpy.ops.wm.append(directory=os.path.join(WORK, "hf_clean.blend", "Object"), filename="HF")
h0 = [o for o in bpy.data.objects if o.name.startswith("HF") and o is not hf][0]
H0 = sample_surface(h0); p0 = mesh_pose(H0, fit["LH"], J0)
bpy.data.objects.remove(h0, do_unlink=True)

def skel(Jx, hand_end):
    return dict(upperarm=Jx["lowerarm_l"] - Jx["upperarm_l"], lowerarm=Jx["hand_l"] - Jx["lowerarm_l"], thigh=Jx["calf_l"] - Jx["thigh_l"], calf=Jx["foot_l"] - Jx["calf_l"])
sm = skel(J, None)
toe = lambda d: float(np.degrees(np.arctan2(abs(d[0]), -d[1])))
print("\n== POSE, left side (right mirrors within 0.5 deg unless noted). abduction / forward, degrees")
print("   %-10s | %-17s | %-17s | %-17s | %-17s | %s" % ("", "HF before (mesh)", "HF after (mesh)", "MH mesh (same method)", "MH skeleton", "after vs MH"))
for k in ("upperarm", "lowerarm", "hand", "thigh", "calf"):
    a0, a1, am = ang(p0['l'][k]), ang(pp['l'][k]), ang(pm['l'][k])
    sk = ("%6.2f / %6.2f" % ang(sm[k])) if k in sm else "       -"
    ref = sm[k] if k in sm else pm['l'][k]
    print("   %-10s | %6.2f / %6.2f   | %6.2f / %6.2f   | %6.2f / %6.2f       | %s   | %.2f deg (R %.2f)" % (
        k, *a0, *a1, *am, sk, between(pp['l'][k], ref), between(pp['r'][k] * np.array([-1, 1, 1]), ref)))
print("   elbow flexion: before %.2f  after %.2f  MH mesh %.2f  MH skeleton %.2f" % (between(p0['l']['upperarm'], p0['l']['lowerarm']), between(pp['l']['upperarm'], pp['l']['lowerarm']),
      between(pm['l']['upperarm'], pm['l']['lowerarm']), between(sm['upperarm'], sm['lowerarm'])))
print("   knee flexion:  before %.2f  after %.2f  MH skeleton %.2f" % (between(p0['l']['thigh'], p0['l']['calf']), between(pp['l']['thigh'], pp['l']['calf']), between(sm['thigh'], sm['calf'])))
print("   toe-out: before %.2f  after %.2f  MH mesh %.2f" % (toe(p0['l']['toe']), toe(pp['l']['toe']), toe(pm['l']['toe'])))
print("   back-of-hand normal: before %s  after %s  MH %s  -> after vs MH %.2f deg" % (p0['l']['back_of_hand'].round(2), pp['l']['back_of_hand'].round(2), pm['l']['back_of_hand'].round(2), between(pp['l']['back_of_hand'], pm['l']['back_of_hand'])))
print("   rig bone directions after vs MetaHuman skeleton (deg): " + ", ".join("%s %.3f" % (b, between(JP[c + "_l"] - JP[b + "_l"], J[c + "_l"] - J[b + "_l"]))
      for b, c in (("clavicle", "upperarm"), ("upperarm", "lowerarm"), ("lowerarm", "hand"), ("thigh", "calf"), ("calf", "foot"))))
print("\n== JOINT POSITIONS after (cm): HF re-posed (rig) | HF re-posed (mesh slices) | MetaHuman skeleton | rig - MH")
rows = [("head", None), ("neck_01", None), ("spine_05", None), ("pelvis", None), ("clavicle_l", None), ("upperarm_l", None), ("lowerarm_l", 'elbow'), ("hand_l", 'wrist'), ("thigh_l", None), ("calf_l", 'knee'), ("foot_l", 'ankle')]
for b, mk in rows:
    ms = ("%6.1f %6.1f %6.1f" % tuple(pp['l'][mk] * 100)) if mk else "         -          "
    print("   %-11s %6.1f %6.1f %6.1f | %s | %6.1f %6.1f %6.1f | %5.1f %5.1f %5.1f" % (b, *(JP[b] * 100), ms, *(J[b] * 100), *((JP[b] - J[b]) * 100)))
print("\n== THIGH GAP (cm): z  before  after  MetaHuman")
for z in (0.80, 0.76, 0.72, 0.68, 0.64, 0.60, 0.55, 0.50, 0.40, 0.20):
    g = [inner_gap(C, None, z) for C in (H0, P, M)]
    print("   z=%.2f  %s" % (z, "  ".join("%5.1f" % (x * 100) if x and x > 0.0015 else "touch" for x in g)))
print("   crotch level (highest point where the legs are apart): before %.3f  after %.3f  MH %.3f" % (fit["LH"]["crotch"], Lp["crotch"], LM["crotch_mesh"]))

# ---------------------------------------------------------------- overlay sheet
W_, H_ = 1500, 1900
sc = setup_render(W_, H_)
sc.render.film_transparent = True
sc.display.shading.show_cavity = True
mh_ob.data.materials.clear(); hf.data.materials.clear()
mh_ob.data.materials.append(mat("mh", (0.20, 0.45, 1.0, 1))); hf.data.materials.append(mat("hf", (1.0, 0.45, 0.10, 1)))
for o in (mh_ob, hf):
    for p in o.data.polygons: p.use_smooth = True
views = [("front", (0, -6, 0.94), (0, 0, 0.94), 1.96), ("side", (6, -0.08, 0.94), (0, -0.08, 0.94), 1.96), ("top", (0, -0.10, 6), (0, -0.10, 0), 1.96)]
def grab(path):
    im = bpy.data.images.load(path); a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)[::-1].copy()
    bpy.data.images.remove(im); return a
def project(cam, p, scale):
    q = cam.matrix_world.inverted() @ Vector(p)
    return (0.5 + q.x / (scale * W_ / H_)) * W_, (0.5 - q.y / scale) * H_, q.z
def line(img, a, b, col, r=2):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    for t in np.linspace(0, 1, n):
        x = int(round(a[0] + (b[0] - a[0]) * t)); y = int(round(a[1] + (b[1] - a[1]) * t))
        img[max(y - r, 0):y + r + 1, max(x - r, 0):x + r + 1, :3] = col
def dot(img, a, col, r=6):
    x, y = int(round(a[0])), int(round(a[1]))
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]; m = xx * xx + yy * yy <= r * r
    sub = img[y - r:y + r + 1, x - r:x + r + 1, :3]
    if sub.shape[:2] == m.shape: sub[m] = col
CH = [("pelvis", "spine_03"), ("spine_03", "spine_05"), ("spine_05", "neck_01"), ("neck_01", "head")]
for s in "lr":
    CH += [("spine_05", "clavicle_" + s), ("clavicle_" + s, "upperarm_" + s), ("upperarm_" + s, "lowerarm_" + s), ("lowerarm_" + s, "hand_" + s),
           ("pelvis", "thigh_" + s), ("thigh_" + s, "calf_" + s), ("calf_" + s, "foot_" + s), ("foot_" + s, "ball_" + s)]
JM = dict(J); JPx = dict(JP)
for s in "lr":
    JM["hand_end_" + s] = J["middle_01_" + s]
panels = []
for name, loc, look, scale in views:
    cam = ortho_cam(name, loc, look, scale, ) if name != "top" else None
    if cam is None:
        cd = bpy.data.cameras.new(name); cd.type = 'ORTHO'; cd.ortho_scale = scale; cd.clip_end = 100
        cam = bpy.data.objects.new(name, cd); sc.collection.objects.link(cam)
        cam.matrix_world = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(np.pi, 4, 'Z')       # looking down, -Y (front) at the bottom
    layers = {}
    for o, other in ((mh_ob, hf), (hf, mh_ob)):
        other.hide_render = True; o.hide_render = False
        path = os.path.join(WORK, "chk_%s_%s.png" % (name, o.name)); render(cam, path); layers[o.name] = grab(path)
    hf.hide_render = False; mh_ob.hide_render = False
    img = np.zeros((H_, W_, 4), np.float32); img[..., :3] = 0.93; img[..., 3] = 1
    for z in np.arange(0, 2.0, 0.1) if name != "top" else []:                 # 10 cm height grid
        _, y, _ = project(cam, (0, look[1], z), scale)
        img[int(y):int(y) + 1, :, :3] = 0.80 if round(z * 10) % 5 else 0.62
    for nm in ("MH", "HF"):
        L = layers[nm]; a = L[..., 3:4] * 0.58
        img[..., :3] = img[..., :3] * (1 - a) + L[..., :3] * a
    for Jx, col, r in ((JM, (0.0, 0.05, 0.55), 2), (JPx, (0.85, 0.0, 0.0), 1)):
        for a, b in CH + [("hand_l", "hand_end_l"), ("hand_r", "hand_end_r")]:
            if a in Jx and b in Jx:
                line(img, project(cam, Jx[a], scale), project(cam, Jx[b], scale), col, r)
        for k in ("head", "neck_01", "pelvis") + tuple(b + s for s in "lr" for b in ("upperarm_", "lowerarm_", "hand_", "thigh_", "calf_", "foot_")):
            dot(img, project(cam, Jx[k], scale), col, 7 if r == 2 else 4)
    panels.append(img)
    pi = bpy.data.images.new("p_" + name, W_, H_, alpha=False)
    pi.pixels.foreach_set(img[::-1].ravel()); pi.filepath_raw = os.path.join(WORK, "panel_%s.png" % name); pi.file_format = 'PNG'; pi.save()
sheet = np.concatenate([np.concatenate([p, np.full((H_, 12, 4), 1.0, np.float32)], axis=1) for p in panels], axis=1)[:, :-12]
out = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
out.pixels.foreach_set(sheet[::-1].ravel()); out.filepath_raw = SHEET; out.file_format = 'PNG'; out.save()
print("sheet saved", SHEET, sheet.shape[1], "x", sheet.shape[0])
