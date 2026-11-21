# Probe dark (hair) vertex clusters above the hips: position relative to the neck (fwd / right / up), size, colour.
import bpy, sys
from mathutils import Vector
src = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE'); body = max([o for o in sc.objects if o.type == 'MESH'], key=lambda o: len(o.data.vertices))
B = arm.data.bones
def hw(n): return arm.matrix_world @ B[n].head_local
up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()
neck, hip = hw('neck'), hw('Hips'); me = body.data; mw = body.matrix_world
img = None
for m in me.materials:
    for n in m.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links and n.inputs['Base Color'].links[0].from_node.type == 'TEX_IMAGE': img = n.inputs['Base Color'].links[0].from_node.image
pix = list(img.pixels[:]); IW, IH = img.size; uv = me.uv_layers.active.data
col = [None] * len(me.vertices)
for poly in me.polygons:
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index
        if col[vi] is None:
            u, v = uv[li].uv; k = (int((v % 1) * (IH - 1)) * IW + int((u % 1) * (IW - 1))) * 4; col[vi] = (pix[k], pix[k + 1], pix[k + 2])
gname = {g.index: g.name for g in body.vertex_groups}
cells = {}
for i, v in enumerate(me.vertices):
    c = col[i]
    if not c: continue
    l = .3 * c[0] + .59 * c[1] + .11 * c[2]; s = (max(c) - min(c)) / max(.02, max(c))
    p = mw @ v.co
    if l > .07 or p.z < hip.z: continue
    if any(('Arm' in gname[g.group] or 'Hand' in gname[g.group]) and g.weight > .3 for g in v.groups): continue
    d = p - neck; key = (round(d.dot(fwd) / .06), round(d.dot(rgt) / .06), round(d.z / .08))
    cells.setdefault(key, []).append((l, s))
print('HAIR neck z %.3f head z %.3f hip z %.3f' % (neck.z, hw('Head').z, hip.z))
for k in sorted(cells, key=lambda k: (-k[2], k[0], k[1])):
    if len(cells[k]) < 25: continue
    ls = cells[k]; print('HAIR cell fwd %+.2f rgt %+.2f up %+.2f n %4d lum %.3f sat %.2f' % (k[0] * .06, k[1] * .06, k[2] * .08, len(ls), sum(a for a, b in ls) / len(ls), sum(b for a, b in ls) / len(ls)))
