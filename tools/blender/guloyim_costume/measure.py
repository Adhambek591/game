# Body measurements used while designing (prints only). blender -b out/body.blend --python measure.py
import bpy, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gfit
body = bpy.data.objects['GUL_Body']
F = gfit.BodyFit(body)
print('GROUP CATS', {k: len(v) for k, v in F.cat_verts.items()})
for z in [0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50]:
    s = F.slice('torso', z)
    print('TORSO z %.2f' % z, s and tuple(round(c, 3) for c in s))
for z in [0.02, 0.05, 0.08, 0.12, 0.2, 0.3, 0.4, 0.45, 0.5]:
    s = F.slice('legL', z)
    print('LEG z %.2f' % z, s and tuple(round(c, 3) for c in s))
for z in [1.50, 1.54, 1.58, 1.62, 1.66, 1.70]:
    s = F.slice('head', z)
    print('HEAD z %.2f' % z, s and tuple(round(c, 3) for c in s))
print('HEAD bbox', F.bbox('head'))
print('ARM bbox', F.bbox('armL'))
