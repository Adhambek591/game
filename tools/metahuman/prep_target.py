# Blender: from the author's Higgsfield model cut the FACE (front of the head, no scarf / jewellery) and the whole model,
# export both as FBX for the MetaHuman conform in Unreal. Also renders a front portrait (for reference).
# Run: blender -b --python prep_target.py -- <in.glb> <out_dir> <name>
import bpy, bmesh, sys, os, math
from mathutils import Vector
src, outd, name = sys.argv[-3:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.context.scene.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o, do_unlink=True)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
me_o = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
H = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
# unparent, apply transforms
wm = me_o.matrix_world.copy(); me_o.parent = None; me_o.matrix_world = wm
for m in list(me_o.modifiers): me_o.modifiers.remove(m)
bpy.context.view_layer.objects.active = me_o; me_o.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
head, neck = H['Head'], H['neck']
top = max(v.co.z for v in me_o.data.vertices)
face = me_o.copy(); face.data = me_o.data.copy(); face.name = name + '_face'; bpy.context.scene.collection.objects.link(face)
bm = bmesh.new(); bm.from_mesh(face.data)
# face oval: front half of the head between the chin and the brows, inside the cheeks (scarf edge + pendants excluded)
hc = Vector((head.x, head.y, head.z + .06 * (top - neck.z) / .3))
def keep(p):
    d = p - hc
    if p.y > head.y - .03: return False               # front only (model faces -Y)
    if p.z < top - .292 or p.z > top - .118: return False   # under the chin .. brows (the scarf + coin band sit above)
    if abs(p.x - head.x) > .064: return False             # inner face: the open border must not reach the cheek sides (dents)
    return True
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context='VERTS')
# keep the biggest connected piece (the skin), drop floating bits (jewellery, hair strands)
bm.verts.ensure_lookup_table(); seen = set(); best = []
for v in bm.verts:
    if v in seen: continue
    comp = []; st = [v]; seen.add(v)
    while st:
        x = st.pop(); comp.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y not in seen: seen.add(y); st.append(y)
    if len(comp) > len(best): best = comp
keepset = set(best); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v not in keepset], context='VERTS')
bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=1, use_grid_fill=True, smooth=1.0)   # denser target for the solver
# the Meshy surface is lumpy (the MetaHuman refine stage copied the lumps): smooth it, keep the open border where it is
inner = [v for v in bm.verts if not v.is_boundary]
for _ in range(12): bmesh.ops.smooth_vert(bm, verts=inner, factor=.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(face.data); bm.free()
zs=[v.co.z for v in face.data.vertices]; print('PREP face z', round(min(zs),3), round(max(zs),3)); print('PREP face verts', len(face.data.vertices), 'head', tuple(round(c, 3) for c in head), 'top', round(top, 3))
os.makedirs(outd, exist_ok=True)
def exp(o, fn):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.fbx(filepath=os.path.join(outd, fn), use_selection=True, apply_unit_scale=True, global_scale=1.0, axis_forward='-Y', axis_up='Z', bake_space_transform=False, object_types={'MESH'}, use_mesh_modifiers=True, mesh_smooth_type='FACE', add_leaf_bones=False, embed_textures=False, path_mode='COPY')
exp(face, name + '_face.fbx'); exp(me_o, name + '_full.fbx')
print('PREP done')

# ---- front portrait of the textured model, perspective camera whose UE equivalent is written to <name>_cam.json
#      (Blender (x, y, z) m -> UE (x, -y, z) * 100 cm; camera at -Y looking +Y = UE camera at +Y looking -Y, yaw -90)
import json
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = sc.render.resolution_y = 1024
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.85, .85, .85, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.2
for o in sc.objects: o.hide_render = (o != me_o)
eye_z = top - .145; d = .75; fov = 30.0
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.sensor_fit = 'HORIZONTAL'; cam.data.angle = math.radians(fov)
cam.location = (head.x, head.y - d, eye_z); cam.rotation_euler = (math.radians(90), 0, 0)
sc.render.filepath = os.path.join(outd, name + '_portrait.png'); bpy.ops.render.render(write_still=True)
json.dump({'location': [head.x * 100, -(head.y - d) * 100, eye_z * 100], 'rotation': {'pitch': 0, 'yaw': -90, 'roll': 0}, 'fov': fov, 'size': [1024, 1024]}, open(os.path.join(outd, name + '_cam.json'), 'w'))
print('PREP portrait', sc.render.filepath)
