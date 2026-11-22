# Preview renders of the GAME meshes with the baked textures (Cycles).
# blender -b out/armor_low.blend --python render.py -- [outdir] [samples] [views] [res_scale]
import bpy, sys, os, math, json
from mathutils import Vector, Matrix, Euler

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTD = args[0] if args else r"F:\qirq-qiz-unity\Builds"
SAMPLES = int(args[1]) if len(args) > 1 else 160
VIEWS = args[2].split(',') if len(args) > 2 else ['front', 'q34', 'back', 'helmet']
RS = float(args[3]) if len(args) > 3 else 1.0
TEX = r"F:\qirq-qiz\tools\blender\surtaysha\out\textures"
PREFIX = 'surtaysha_sovut_'
LM = json.load(open(r"F:\qirq-qiz\tools\blender\surtaysha\out\landmarks.json"))

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
for dev in ('OPTIX', 'CUDA'):
    try:
        pr.compute_device_type = dev; pr.get_devices()
        for d in pr.devices: d.use = d.type != 'CPU'
        break
    except Exception: pass
sc.cycles.device = 'GPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
try: sc.cycles.denoiser = 'OPTIX'
except Exception: pass
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'None'
sc.view_settings.exposure = float(os.environ.get('SUR_EXPOSURE', '-1.0'))
sc.cycles.max_bounces = 8

def tex(path, data):
    if not os.path.exists(path): return None
    im = bpy.data.images.load(path, check_existing=True)
    im.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    return im

def pbr(name, setname, alpha=None, two_sided=False):
    m = bpy.data.materials.get(name)
    if m is None: m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bs.outputs[0], out.inputs[0])
    b = tex(os.path.join(TEX, setname + '_BaseColor.png'), False)
    o = tex(os.path.join(TEX, setname + '_ORM.png'), True)
    n = tex(os.path.join(TEX, setname + '_Normal.png'), True)
    if b is None:
        print('missing textures for', setname); return m
    tb = nt.nodes.new('ShaderNodeTexImage'); tb.image = b
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = o
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = n
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(to.outputs[0], sp.inputs[0])
    # AO multiplied softly into base colour for the offline preview (UE uses the AO channel itself)
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 0.6
    nt.links.new(tb.outputs[0], mx.inputs[6]); nt.links.new(sp.outputs[0], mx.inputs[7])
    nt.links.new(mx.outputs[2], bs.inputs['Base Color'])
    nt.links.new(sp.outputs[1], bs.inputs['Roughness'])
    nt.links.new(sp.outputs[2], bs.inputs['Metallic'])
    # DirectX normal -> OpenGL for Blender
    sn = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tn.outputs[0], sn.inputs[0])
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    nt.links.new(sn.outputs[1], inv.inputs[1])
    cb = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(sn.outputs[0], cb.inputs[0]); nt.links.new(inv.outputs[0], cb.inputs[1]); nt.links.new(sn.outputs[2], cb.inputs[2])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(cb.outputs[0], nm.inputs['Color'])
    nt.links.new(nm.outputs[0], bs.inputs['Normal'])
    if alpha:
        nt.links.new(tb.outputs[1], bs.inputs['Alpha'])
    if setname == 'T_Cloth':
        bs.inputs['Sheen Weight'].default_value = 0.15
        bs.inputs['Sheen Roughness'].default_value = 0.5
    return m

for o in bpy.data.objects:
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, True)
MAP = {'M_Lamellar': 'T_Lamellar', 'M_Trim': 'T_Trim', 'M_Helmet': 'T_Helmet', 'M_Armor': 'T_Armor',
       'M_Cloth': 'T_Cloth', 'M_Weapon': 'T_Weapon', 'M_Plume': 'T_Plume'}
for mn, tn in MAP.items():
    if bpy.data.materials.get(mn):
        pbr(mn, tn, alpha=(mn == 'M_Plume'))

# body proxy: neutral warm skin clay
body = bpy.data.objects.get('SUR_BodyProxy')
if body:
    sk = bpy.data.materials.new('MAT_Skin'); sk.use_nodes = True
    b = sk.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.20, 0.115, 0.075, 1)
    b.inputs['Roughness'].default_value = 0.55
    b.inputs['Subsurface Weight'].default_value = 0.15
    body.data.materials.clear(); body.data.materials.append(sk)
    # feet live inside the boots: drop them so they never poke through
    import bmesh
    bm_ = bmesh.new(); bm_.from_mesh(body.data)
    bmesh.ops.delete(bm_, geom=[v for v in bm_.verts if v.co.z < 0.16 or (v.co.z < 1.55 and abs(v.co.x) < 0.56)], context='VERTS')
    # the borrowed MetaHuman head is ~8 % larger than a real male head inside this helmet: shrink it about its centre
    hc = Vector((0.0, -0.02, 1.70))
    for v in bm_.verts:
        if v.co.z > 1.575:
            w = min(1.0, (v.co.z - 1.575) / 0.05)
            v.co = v.co.lerp(hc + (v.co - hc) * 0.92, w)
    bm_.to_mesh(body.data); bm_.free()

# sabre into the right hand, blade down along the leg
hr = Vector(LM['bones']['hand_r']['head']); mr = Vector(LM['bones']['middle_03_r']['head']) if 'middle_03_r' in LM['bones'] else hr + Vector((-0.03, -0.06, -0.09))
grip_c = hr.lerp(mr, 0.62) + Vector((0.004, 0.0, -0.012))
Mw = Matrix.Translation(grip_c) @ Euler((math.radians(180 - 12), math.radians(-14), math.radians(-90)), 'XYZ').to_matrix().to_4x4() @ Matrix.Translation((0, 0, 0.060))
for o in bpy.data.objects:
    if o.name.startswith('SUR_Sabre'):
        o.matrix_world = Mw @ o.matrix_world

# floor + world
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
fl = bpy.context.object; fl.name = 'Floor'
fm = bpy.data.materials.new('MAT_Floor'); fm.use_nodes = True
fb = fm.node_tree.nodes['Principled BSDF']; fb.inputs['Base Color'].default_value = (0.30, 0.30, 0.31, 1); fb.inputs['Roughness'].default_value = 0.9
fl.data.materials.append(fm)
fl.is_shadow_catcher = True
sc.render.film_transparent = True
sc.render.image_settings.color_mode = 'RGBA'
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.20, 0.205, 0.215, 1); bg.inputs[1].default_value = 0.25
lp = w.node_tree.nodes.new('ShaderNodeLightPath'); bg2 = w.node_tree.nodes.new('ShaderNodeBackground')
bg2.inputs[0].default_value = (0.42, 0.42, 0.43, 1); bg2.inputs[1].default_value = 1.0
mixw = w.node_tree.nodes.new('ShaderNodeMixShader'); wo = w.node_tree.nodes['World Output']
w.node_tree.links.new(lp.outputs['Is Camera Ray'], mixw.inputs[0]); w.node_tree.links.new(bg.outputs[0], mixw.inputs[1])
w.node_tree.links.new(bg2.outputs[0], mixw.inputs[2]); w.node_tree.links.new(mixw.outputs[0], wo.inputs[0])

def area(name, loc, target, size, power, col=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.size = size; l.energy = power; l.color = col
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o)
    o.location = loc
    d = (Vector(target) - Vector(loc)).normalized()
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o
area('Key', (-2.4, -3.0, 3.2), (0, 0, 1.2), 2.0, 330, (1.0, 0.95, 0.88))
area('Fill', (3.0, -2.4, 1.6), (0, 0, 1.1), 3.0, 90, (0.85, 0.9, 1.0))
area('Rim', (1.8, 3.2, 2.8), (0, 0, 1.3), 1.5, 450, (1.0, 0.96, 0.9))
area('Rim2', (-2.2, 2.8, 2.2), (0, 0, 1.2), 1.5, 300, (0.9, 0.95, 1.0))
area('Top', (0, -0.5, 4.0), (0, 0, 1.0), 2.0, 110)

cam_d = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
def shoot(name, loc, target, lens, res):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam_d.lens = lens
    sc.render.resolution_x = int(res[0] * RS); sc.render.resolution_y = int(res[1] * RS)
    sc.render.filepath = os.path.join(OUTD, PREFIX + name + '.png')
    bpy.ops.render.render(write_still=True)
    print('RENDER', sc.render.filepath)

for v in VIEWS:
    if v == 'front': shoot('front', (0, -5.0, 1.10), (0, 0, 1.06), 70, (1500, 2000))
    if v == 'q34': shoot('q34', (-3.4, -3.7, 1.25), (0, 0, 1.06), 70, (1500, 2000))
    if v == 'back': shoot('back', (0.3, 5.0, 1.15), (0, 0, 1.06), 70, (1500, 2000))
    if v == 'helmet': shoot('helmet', (-0.55, -1.15, 1.80), (0, 0, 1.73), 85, (1600, 1600))
    if v == 'torso': shoot('torso', (-1.2, -2.6, 1.30), (0, 0, 1.22), 85, (1600, 1600))
    if v == 'legs': shoot('legs', (-0.9, -2.2, 0.45), (0, 0, 0.40), 85, (1600, 1600))
