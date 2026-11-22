# Character from scratch on a standard human (MakeHuman / MPFB base mesh, CC0):
#   - real body topology (quads, edge loops at joints) shaped by macro sliders per character;
#   - MPFB "game_engine" skeleton (symmetric, feet straight, 15 finger bones) with its own skin weights, bones renamed to the
#     names the game uses (Hips, Spine, ..., LeftThumb1 ...);
#   - clothes are separate layers fitted on the body (made in garments.py), weights transferred from the body.
# Run: blender -b --python build_char.py -- <char> <out.glb>
import bpy, bmesh, sys, os, math, json, addon_utils
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]; CHAR, OUT = args[0], os.path.abspath(args[1])
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
SPEC = json.load(open(os.path.join(HERE, 'chars.json'), encoding='utf-8'))[CHAR]

bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.entities.objectproperties import HumanObjectProperties

bm = HumanService.create_human()
mac = SPEC['macro']
for k, v in mac.items():
    if k == 'race':
        for r, x in v.items(): HumanObjectProperties.set_value(r, x, entity_reference=bm)
    else: HumanObjectProperties.set_value(k, v, entity_reference=bm)
TargetService.reapply_macro_details(bm)
TD = os.path.join(os.path.dirname(TargetService.__file__ if hasattr(TargetService, '__file__') else ''), '..', 'data', 'targets')
for t, w in SPEC.get('targets', {}).items():   # face / body detail targets, e.g. "nose/nose-scale-horiz-decr|incr"
    try: TargetService.load_target(bm, TargetService.target_full_path(t), weight=w)
    except Exception as e: print('CHAR target fail', t, e)
TargetService.bake_targets(bm)
HumanService.add_builtin_rig(bm, 'game_engine', import_weights=True)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')

# ---- rename bones / vertex groups to the game's names
REN = {'pelvis': 'Hips', 'spine_01': 'Spine02', 'spine_02': 'Spine01', 'spine_03': 'Spine', 'neck_01': 'neck', 'head': 'Head'}
for s, S in (('l', 'Left'), ('r', 'Right')):
    REN.update({'clavicle_' + s: S + 'Shoulder', 'upperarm_' + s: S + 'Arm', 'lowerarm_' + s: S + 'ForeArm', 'hand_' + s: S + 'Hand',
                'thigh_' + s: S + 'UpLeg', 'calf_' + s: S + 'Leg', 'foot_' + s: S + 'Foot', 'ball_' + s: S + 'ToeBase'})
    for f in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        for j in (1, 2, 3): REN['%s_0%d_%s' % (f, j, s)] = S + f.capitalize() + str(j)
for b in arm.data.bones:
    if b.name in REN: b.name = REN[b.name]   # vertex groups follow the bone rename automatically

# ---- face landmarks (eyes, mouth) for projecting the reference portrait onto the head
def _centroid(gname):
    gi_ = bm.vertex_groups[gname].index; pts = [bm.matrix_world @ v.co for v in bm.data.vertices if any(g.group == gi_ and g.weight > .5 for g in v.groups)]
    return sum(pts, Vector()) / len(pts) if pts else None
SPEC['_lm'] = {k: _centroid(g) for k, g in (('eyeL', 'helper-l-eye'), ('eyeR', 'helper-r-eye'), ('mouth', 'joint-mouth'))}
SPEC['_dir'] = HERE
print('CHAR lm', {k: (tuple(round(c, 3) for c in v) if v else None) for k, v in SPEC['_lm'].items()})
# ---- apply the MPFB modifiers (mask of helper geometry etc.) except the armature, keep the eyes
bpy.context.view_layer.objects.active = bm; bm.select_set(True)
keep_helpers = ('helper-l-eye', 'helper-r-eye')
gi = {g.name: g.index for g in bm.vertex_groups}
dele = set()
for v in bm.data.vertices:
    names = {bm.vertex_groups[g.group].name for g in v.groups if g.weight > .5}
    if 'body' in names: continue
    if any(h in names for h in keep_helpers): continue
    dele.add(v.index)
for m in list(bm.modifiers):
    if m.type != 'ARMATURE': bm.modifiers.remove(m)
b = bmesh.new(); b.from_mesh(bm.data); b.verts.ensure_lookup_table()
bmesh.ops.delete(b, geom=[b.verts[i] for i in dele], context='VERTS'); b.to_mesh(bm.data); b.free()
for g in list(bm.vertex_groups):
    if g.name not in {x.name for x in arm.data.bones} and g.name not in keep_helpers: bm.vertex_groups.remove(g)
bm.name = 'body'

# ---- fit to the author's Higgsfield model (pose + size), garments, then wrap + bake its look onto every layer
import garments, fit_ref
if SPEC.get('ref_model'): fit_ref.match(SPEC, bm, arm)
garments.build(SPEC, bm, arm)
if SPEC.get('ref_head'): fit_ref.head_from_ref(SPEC, bm, arm)
if SPEC.get('ref_model'): fit_ref.wrap_bake(SPEC, bm, arm, [bm] + [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent == arm and o != bm and o.name != 'head'])

# ---- export
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if (o.type == 'ARMATURE' or (o.type == 'MESH' and o.parent == arm) or o == bm) and not o.name.startswith('Icosphere'): o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_skins=True, export_animations=False, export_apply=False)
print('CHAR DONE', CHAR, OUT, 'verts', sum(len(o.data.vertices) for o in bpy.context.scene.objects if o.type == 'MESH'))

# ---- preview: front / side / back / 3-4 renders next to the .glb (judge the model by pictures, as the author does)
if '--nopreview' not in args:
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x, sc.render.resolution_y = 520, 900; sc.render.film_transparent = False
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.82, .80, .78, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; hgt = max((o.matrix_world @ Vector(c)).z for o in sc.objects if o.type == 'MESH' for c in o.bound_box); cam.data.ortho_scale = hgt * 1.08
    import numpy as _np
    shots = []
    for i, ang in enumerate((0, 90, 180, 35)):
        a = math.radians(ang); d = Vector((math.sin(a), -math.cos(a), 0))
        cam.location = Vector((0, 0, hgt * .5)) + d * 6; cam.rotation_euler = (math.radians(90), 0, a)
        fp = OUT[:-4] + '_v%d.png' % i; sc.render.filepath = fp; bpy.ops.render.render(write_still=True); shots.append(fp)
    hb = arm.matrix_world @ arm.data.bones['Head'].head_local
    for i, ang in enumerate((0, 30)):
        a = math.radians(ang); d = Vector((math.sin(a), -math.cos(a), 0)); cam.data.ortho_scale = .42
        cam.location = hb + Vector((0, 0, .07)) + d * 3; cam.rotation_euler = (math.radians(90), 0, a)
        fp = OUT[:-4] + '_face%d.png' % i; sc.render.resolution_x, sc.render.resolution_y = 600, 600; sc.render.filepath = fp; bpy.ops.render.render(write_still=True); shots.append(fp)
    print('CHAR preview', shots)
