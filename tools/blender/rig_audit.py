# Rig audit: skin-weight statistics, weight heat maps per bone and deformation in extreme poses.
# Run: blender -b --python rig_audit.py -- <in.glb> <out_dir>
import bpy, sys, os, math
from mathutils import Vector, Matrix, Quaternion

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src); sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
meshes = [o for o in sc.objects if o.type == 'MESH']
body = max(meshes, key=lambda o: len(o.data.vertices))
B = arm.data.bones
def hw(n): return arm.matrix_world @ B[n].head_local
up = Vector((0, 0, 1)); rgt = hw('RightUpLeg') - hw('LeftUpLeg'); rgt.z = 0; rgt.normalize(); fwd = up.cross(rgt).normalized()

# ---------- statistics ----------
me = body.data; gname = {g.index: g.name for g in body.vertex_groups}
infl = [0] * 9; hard = 0; unweighted = 0; tot = len(me.vertices); nonnorm = 0
skirt_split = 0; lower = []
hipz = hw('Hips').z; kneez = hw('LeftLeg').z
for v in me.vertices:
    ws = [(gname[g.group], g.weight) for g in v.groups if g.weight > 1e-4 and gname.get(g.group) in B]
    n = len(ws); infl[min(n, 8)] += 1
    if n == 0: unweighted += 1; continue
    s = sum(w for _, w in ws)
    if abs(s - 1) > .02: nonnorm += 1
    if max(w for _, w in ws) > .98: hard += 1
    co = body.matrix_world @ v.co
    # a vertex between the knees and the hips, near the middle line (skirt / coat front) weighted to both legs = split risk
    if kneez < co.z < hipz and abs((co - hw('Hips')).dot(rgt)) < .06:
        names = dict(ws); l = sum(w for k, w in names.items() if k.startswith('Left') and ('Leg' in k or 'UpLeg' in k)); r = sum(w for k, w in names.items() if k.startswith('Right') and ('Leg' in k or 'UpLeg' in k))
        if l > .25 and r > .25: skirt_split += 1
print('AUDIT verts', tot, 'influences histogram', infl, 'hard(>.98 one bone)', hard, 'unweighted', unweighted, 'not-normalised', nonnorm, 'midline skirt verts on both legs', skirt_split)
print('AUDIT bones', len(B), [b.name for b in B][:60])

# ---------- render setup ----------
eng = [e.identifier for e in sc.render.bl_rna.properties['engine'].enum_items]
sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in eng else 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in eng else 'CYCLES'
sc.render.resolution_x, sc.render.resolution_y = 640, 900
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Strength'].default_value = .9
w.node_tree.nodes['Background'].inputs['Color'].default_value = (.35, .37, .42, 1)
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.active_object; sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30))
bpy.ops.object.camera_add(); cam = bpy.context.active_object; sc.camera = cam; cam.data.lens = 50
top = max((body.matrix_world @ Vector(c)).z for c in body.bound_box); H = top
def shoot(name, view, zc=None, dist=None, lens=50):
    zc = zc if zc is not None else H * .52; dist = dist or H * 2.1
    d = {'front': fwd, 'side': rgt, 'q': (fwd + rgt * .8).normalized(), 'back': -fwd, 'qb': (-fwd + rgt).normalized()}[view]
    c = Vector((hw('Hips').x, hw('Hips').y, zc)); cam.location = c + d * dist + up * dist * .05
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
    sc.render.filepath = os.path.join(out, name + '.png'); bpy.ops.render.render(write_still=True)

# ---------- posing by world directions ----------
def aim(bone, target_dir, child=None):
    """rotate pose bone so that its head->child-head direction points along target_dir (world)"""
    bpy.context.view_layer.update()
    pb = arm.pose.bones[bone]; ch = arm.pose.bones[child] if child else pb.children[0]
    cur = (arm.matrix_world @ ch.head) - (arm.matrix_world @ pb.head)
    q = cur.normalized().rotation_difference(target_dir.normalized())
    mw = arm.matrix_world @ pb.matrix; loc = mw.to_translation()
    new = Matrix.Translation(loc) @ q.to_matrix().to_4x4() @ Matrix.Translation(-loc) @ mw
    pb.matrix = arm.matrix_world.inverted() @ new
    bpy.context.view_layer.update()
def twist(bone, axis, deg):
    bpy.context.view_layer.update(); pb = arm.pose.bones[bone]
    mw = arm.matrix_world @ pb.matrix; loc = mw.to_translation()
    new = Matrix.Translation(loc) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-loc) @ mw
    pb.matrix = arm.matrix_world.inverted() @ new; bpy.context.view_layer.update()
def reset():
    for pb in arm.pose.bones: pb.matrix_basis = Matrix()
    bpy.context.view_layer.update()

shoot('0_bind_front', 'front'); shoot('0_bind_side', 'side')
# 1: arms - left arm raised high, elbow bent ~110 deg; right arm straight forward, elbow bent ~100 deg up
reset()
aim('LeftArm', rgt * -.35 + up, 'LeftForeArm'); aim('LeftForeArm', rgt * .6 + up * .5 + fwd * .3, 'LeftHand')
aim('RightArm', fwd, 'RightForeArm'); aim('RightForeArm', up + fwd * .25, 'RightHand')
shoot('1_arms_front', 'front'); shoot('1_arms_q', 'q'); shoot('1_shoulder_close', 'q', zc=H * .8, dist=H * .9)
# 2: legs - left high knee (hip 90, knee 90); right leg stepping back, knee bent 100
reset()
aim('LeftUpLeg', fwd - up * .1, 'LeftLeg'); aim('LeftLeg', -up, 'LeftFoot')
aim('RightUpLeg', -up - fwd * .35, 'RightLeg'); aim('RightLeg', -up * .4 - fwd, 'RightFoot')
shoot('2_legs_side', 'side'); shoot('2_legs_q', 'q'); shoot('2_hip_close', 'q', zc=H * .45, dist=H * 1.0)
# 3: torso - twist 50 deg over the spine, lean forward, head turned 60 deg
reset()
for b in ('Spine', 'Spine01', 'Spine02'): twist(b, up, 17)
twist('Spine01', rgt, 15); twist('Head', up, 60)
aim('LeftArm', -up * .5 + fwd * .5 - rgt * .2, 'LeftForeArm'); aim('RightArm', -up * .5 + fwd * .5 + rgt * .2, 'RightForeArm')
shoot('3_twist_front', 'front'); shoot('3_twist_back', 'qb')
# 4: deep squat / lunge (the sword stance)
reset()
twist('Hips', up, 0)
aim('LeftUpLeg', fwd * .9 - up * .45, 'LeftLeg'); aim('LeftLeg', -up - fwd * .15, 'LeftFoot')
aim('RightUpLeg', -fwd * .6 - up, 'RightLeg'); aim('RightLeg', -fwd - up * .25, 'RightFoot')
shoot('4_lunge_side', 'side'); shoot('4_lunge_q', 'q')
reset()
# 5: braids swung out (only the braids may move)
if 'BraidL1' in B:
    for S, sgn in (('L', -1), ('R', 1)):
        if 'Braid%s1' % S in B:
            side = (hw('Braid%s2' % S) - hw('neck')).dot(rgt); s2 = 1 if side > 0 else -1   # swing each braid outward, to its own side
            twist('Braid%s1' % S, fwd, -25 * s2); twist('Braid%s2' % S, fwd, -20 * s2); twist('Braid%s1' % S, rgt, 25)
    shoot('5_braids_back', 'back', zc=H * .75, dist=H * 1.2); shoot('5_braids_side', 'side', zc=H * .75, dist=H * 1.2)
    reset()

# ---------- weight heat maps (blue 0 .. red 1) ----------
for o in meshes: o.data.materials.clear() if False else None
heat = bpy.data.materials.new('heat'); heat.use_nodes = True; nt = heat.node_tree; nt.nodes.clear()
at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'wheat'; em = nt.nodes.new('ShaderNodeEmission'); outn = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(at.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], outn.inputs['Surface'])
def ramp(t):
    t = max(0, min(1, t)); cols = [(0, 0, .6), (0, .8, .9), (.1, .9, .1), (1, .9, 0), (1, 0, 0)]
    x = t * 4; i = min(3, int(x)); f = x - i; a, b = cols[i], cols[i + 1]; return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, 1)
for bone in (('BraidL2', 'BraidR2') if 'BraidL2' in B else ('LeftUpLeg', 'Hips', 'Spine02', 'LeftArm', 'LeftForeArm', 'Head')):
    for o in meshes:
        g = o.vertex_groups.get(bone); me2 = o.data
        ca = me2.color_attributes.get('wheat') or me2.color_attributes.new('wheat', 'FLOAT_COLOR', 'POINT')
        for v in me2.vertices:
            wgt = 0.0
            if g:
                for gg in v.groups:
                    if gg.group == g.index: wgt = gg.weight
            ca.data[v.index].color = ramp(wgt)
        o.data.materials.clear(); o.data.materials.append(heat)
    shoot('w_' + bone, 'back' if 'Braid' in bone else 'q' if 'Left' in bone else 'front')
print('AUDIT DONE')
