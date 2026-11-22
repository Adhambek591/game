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
DETAIL_UV = 38.0     # cloth atlas UV -> weave tiles (64 mm tile)
LMJ = json.load(open("F:/qirq-qiz/tools/blender/surtaysha/out/landmarks.json")); LM = LMJ

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
    nout = nm.outputs[0]
    wv = os.path.join(TEX, 'T_ClothWeave_Normal.png')
    if setname == 'T_Cloth' and os.path.exists(wv):
        uvn = nt.nodes.new('ShaderNodeUVMap'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (DETAIL_UV, DETAIL_UV, 1)
        nt.links.new(uvn.outputs[0], mp.inputs[0])
        tw = nt.nodes.new('ShaderNodeTexImage'); tw.image = tex(wv, True); nt.links.new(mp.outputs[0], tw.inputs[0])
        sw = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(tw.outputs[0], sw.inputs[0])
        iw = nt.nodes.new('ShaderNodeMath'); iw.operation = 'SUBTRACT'; iw.inputs[0].default_value = 1.0; nt.links.new(sw.outputs[1], iw.inputs[1])
        cw = nt.nodes.new('ShaderNodeCombineColor')
        nt.links.new(sw.outputs[0], cw.inputs[0]); nt.links.new(iw.outputs[0], cw.inputs[1]); nt.links.new(sw.outputs[2], cw.inputs[2])
        nm2 = nt.nodes.new('ShaderNodeNormalMap'); nm2.inputs['Strength'].default_value = 0.8; nt.links.new(cw.outputs[0], nm2.inputs['Color'])
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        # detail blend: N = normalize(Nbase + Ndetail - Ngeom)
        a1 = nt.nodes.new('ShaderNodeVectorMath'); a1.operation = 'ADD'; nt.links.new(nm.outputs[0], a1.inputs[0]); nt.links.new(nm2.outputs[0], a1.inputs[1])
        a2 = nt.nodes.new('ShaderNodeVectorMath'); a2.operation = 'SUBTRACT'; nt.links.new(a1.outputs[0], a2.inputs[0]); nt.links.new(geo.outputs['Normal'], a2.inputs[1])
        a3 = nt.nodes.new('ShaderNodeVectorMath'); a3.operation = 'NORMALIZE'; nt.links.new(a2.outputs[0], a3.inputs[0])
        nout = a3.outputs[0]
    nt.links.new(nout, bs.inputs['Normal'])
    if alpha:
        nt.links.new(tb.outputs[1], bs.inputs['Alpha'])
    if setname == 'T_Cloth':
        bs.inputs['Sheen Weight'].default_value = 0.15
        bs.inputs['Sheen Roughness'].default_value = 0.5
    return m

for o in bpy.data.objects:
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, True)
def _uv_scale(name='SUR_Cape'):
    o = bpy.data.objects.get(name)
    if not o: return 38.0
    me = o.data; uv = me.uv_layers.active.data
    a3 = sum(p.area for p in me.polygons); au = 0.0
    for p in me.polygons:
        q = [uv[i].uv for i in range(p.loop_start, p.loop_start + p.loop_total)]
        au += abs(sum(q[k].x * q[(k + 1) % len(q)].y - q[(k + 1) % len(q)].x * q[k].y for k in range(len(q)))) / 2
    return (a3 / max(au, 1e-9)) ** 0.5 / 0.064
DETAIL_UV = _uv_scale()
print('DETAIL_UV', DETAIL_UV)
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
    b.inputs['Base Color'].default_value = (0.16, 0.16, 0.165, 1)     # neutral grey mannequin
    b.inputs['Roughness'].default_value = 0.62
    body.data.materials.clear(); body.data.materials.append(sk)
    # keep only what the costume leaves visible (hands, head/neck): drop everything covered, by skin weights
    import bmesh
    KEEP = ('hand', 'thumb', 'index', 'middle', 'ring', 'pinky', 'head', 'neck', 'FACIAL', 'jaw', 'eye')
    gname = {g.index: g.name for g in body.vertex_groups}
    keep = set()
    for v in body.data.vertices:
        if v.groups:
            g = max(v.groups, key=lambda g: g.weight)
            if gname.get(g.group, '').startswith(KEEP): keep.add(v.index)
        elif v.co.z > 1.55: keep.add(v.index)
    bm_ = bmesh.new(); bm_.from_mesh(body.data); bm_.verts.ensure_lookup_table()
    bmesh.ops.delete(bm_, geom=[v for v in bm_.verts if v.index not in keep], context='VERTS')
    hz = Vector(LM['bones']['head']['head']).z
    if LMJ.get('source') != 'real':
        hc = Vector((0.0, -0.02, 1.70))
        for v in bm_.verts:
            if v.co.z > 1.575:
                w = min(1.0, (v.co.z - 1.575) / 0.05)
                v.co = v.co.lerp(hc + (v.co - hc) * 0.92, w)
    if True:
        # featureless clay head under the helmet: no face is shown, only the volume
        hv = [v for v in bm_.verts if v.co.z > hz - 0.06]
        for _ in range(45):
            bmesh.ops.smooth_vert(bm_, verts=hv, factor=0.9, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    # keep only the largest connected skin islands (drops eyeballs, teeth, lashes left inside the head)
    bm_.verts.ensure_lookup_table(); seen = set(); islands = []
    for v0 in bm_.verts:
        if v0.index in seen: continue
        st = [v0]; seen.add(v0.index); isl = []
        while st:
            v = st.pop(); isl.append(v)
            for e in v.link_edges:
                w = e.other_vert(v)
                if w.index not in seen: seen.add(w.index); st.append(w)
        islands.append(isl)
    big = max(len(i) for i in islands)
    bmesh.ops.delete(bm_, geom=[v for i in islands if len(i) < big * 0.02 for v in i], context='VERTS')
    bm_.to_mesh(body.data); bm_.free()

# sabre into the right hand, blade down along the leg
hr = Vector(LM['bones']['hand_r']['head']); mr = Vector(LM['bones']['middle_03_r']['head']) if 'middle_03_r' in LM['bones'] else hr + Vector((-0.03, -0.06, -0.09))
grip_c = hr.lerp(mr, 0.62) + Vector((0.004, 0.0, -0.012))
Mw = Matrix.Translation(grip_c) @ Euler((math.radians(180 - 12), math.radians(-14), math.radians(-90)), 'XYZ').to_matrix().to_4x4() @ Matrix.Translation((0, 0, 0.060))
for o in bpy.data.objects:
    if o.name.startswith('SUR_Sabre'):
        o.matrix_world = Mw @ o.matrix_world

# floor + world
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.036))   # boot heels reach 3.6 cm below the foot
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
    if v == 'side': shoot('side', (5.0, -0.1, 1.15), (0, 0, 1.06), 70, (1500, 2000))
    if v == 'back': shoot('back', (0.3, 5.0, 1.15), (0, 0, 1.06), 70, (1500, 2000))
    if v == 'helmet': shoot('helmet', (-0.55, -1.15, 1.80), (0, 0, 1.73), 85, (1600, 1600))
    if v == 'torso': shoot('torso', (-1.2, -2.6, 1.30), (0, 0, 1.22), 85, (1600, 1600))
    if v == 'legs': shoot('legs', (-0.9, -2.2, 0.45), (0, 0, 0.40), 85, (1600, 1600))
    if v == 'etik':
        fx = LM['bones']['foot_l']['head'][0]
        shoot('etik', (fx + 0.95, -0.85, 0.30), (fx, -0.03, 0.20), 85, (1600, 1600))
    if v == 'etik_side':
        fx = LM['bones']['foot_l']['head'][0]
        shoot('etik_side', (fx + 1.25, -0.04, 0.22), (fx, -0.03, 0.21), 85, (1600, 1600))
