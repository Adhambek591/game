# which bones skin the wolf-man's throat / neck fur (between the shoulders and the jaw)?
import bpy, os
from mathutils import Vector
M = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'public', 'assets', 'models'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(M, 'R_bori.glb'))
me = next(o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups); gi = {g.index: g.name for g in me.vertex_groups}
nk = Vector((0, -0.107, 1.643)); bins = {}
for v in me.data.vertices:
    p = me.matrix_world @ v.co
    if (p - nk).length > 0.22 or p.z < 1.50: continue
    ws = sorted(((gi[g.group], round(g.weight, 2)) for g in v.groups), key=lambda x: -x[1])
    key = ws[0][0] if ws else None; hw = sum(w for n, w in ws if n in ('Head', 'head_end', 'headfront'))
    b = bins.setdefault(key, [0, 0, 0, 0]); b[0] += 1
    if hw < .35: b[1] += 1
    if hw < .15: b[2] += 1
    if abs(p.x) > .17: b[3] += 1
print('near-neck vertices by dominant bone [n, headw<.35, headw<.15, |x|>.17]:', bins)
