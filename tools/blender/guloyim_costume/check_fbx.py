# Check exported skinned FBX files the way UE sees them: UV range, island-in-atlas coverage of the baked texture,
# normal orientation, material slots; textured Cycles check render.
# blender -b --factory-startup --python check_fbx.py -- SK_Guloyim_Scarf,SK_Guloyim_Headband
import bpy, os, sys, math
import numpy as np
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
SK = os.path.join(HERE, 'out', 'skinned'); TEX = os.path.join(HERE, 'out', 'textures')
names = sys.argv[sys.argv.index('--') + 1].split(',') if '--' in sys.argv else ['SK_Guloyim_Scarf', 'SK_Guloyim_Headband']
SETS = {'M_Cloth': 'T_Cloth', 'M_Jewel': 'T_Jewel', 'M_Trim': 'T_Trim', 'M_Lamellar': 'T_Lamellar', 'M_Armor': 'T_Armor', 'M_Weapon': 'T_Weapon'}
bpy.ops.wm.read_factory_settings(use_empty=True)
imgs = {}
def img(setname):
    if setname not in imgs:
        p = os.path.join(TEX, setname + '_BaseColor.png')
        im = bpy.data.images.load(p); imgs[setname] = (im, np.array(im.pixels[:], np.float32).reshape(im.size[1], im.size[0], 4))
    return imgs[setname]
meshes = []
for n in names:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SK, n + '.fbx'))
    meshes += [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
for o in meshes:
    me = o.data
    mats = [m.name for m in me.materials]
    base = mats[0].split('.')[0] if mats else '?'
    uv = me.uv_layers.active
    U = np.array([d.uv[:] for d in uv.data], np.float32) if uv else np.zeros((0, 2))
    # sampled baked colour at every loop UV (texels that were never baked are pure black (0,0,0))
    st = SETS.get(base)
    black = None
    if st and len(U):
        im, px = img(st)
        h, w = px.shape[:2]
        xs = np.clip((U[:, 0] % 1.0) * w, 0, w - 1).astype(int); ys = np.clip((U[:, 1] % 1.0) * h, 0, h - 1).astype(int)
        c = px[ys, xs, :3]
        black = float((c.max(1) < 0.004).mean())
    # orientation: share of faces whose normal points away from the object's centroid
    cen = sum((o.matrix_world @ v.co for v in me.vertices), Vector()) / len(me.vertices)
    out = sum(1 for p in me.polygons if (o.matrix_world.to_3x3() @ p.normal).dot((o.matrix_world @ p.center) - cen) > 0) / len(me.polygons)
    print('CHECK %-24s mats %s uv_layers %d uv_range [%.3f..%.3f]x[%.3f..%.3f] unbaked_texels %.3f outward_faces %.2f' % (
        o.name, mats, len(me.uv_layers), U[:, 0].min(), U[:, 0].max(), U[:, 1].min(), U[:, 1].max(), black if black is not None else -1, out))
# textured render
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 64
pr = bpy.context.preferences.addons['cycles'].preferences
try:
    pr.compute_device_type = 'OPTIX'; pr.get_devices()
    for d in pr.devices: d.use = d.type != 'CPU'
    sc.cycles.device = 'GPU'
except Exception: pass
for o in meshes:
    for i, m in enumerate(o.data.materials):
        st = SETS.get(m.name.split('.')[0])
        if not st: continue
        m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs[0], out.inputs[0])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(st)[0]; nt.links.new(t.outputs[0], bs.inputs['Base Color'])
        bs.inputs['Roughness'].default_value = 0.6
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
w.node_tree.nodes['Background'].inputs[0].default_value = (0.8, 0.8, 0.82, 1)
cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
sc.render.resolution_x = sc.render.resolution_y = 1200
cam.lens = 70
for nm, loc in (('front', (0.0, -1.1, 1.62)), ('q34', (-0.75, -0.8, 1.66)), ('back', (0.2, 1.1, 1.6))):
    co.location = loc
    co.rotation_euler = (Vector((0, 0, 1.56)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(SK, 'check_head_' + nm + '.png'); bpy.ops.render.render(write_still=True)
print('CHECK DONE')
