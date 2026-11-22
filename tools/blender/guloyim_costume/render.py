# Guloyim preview renders of the GAME meshes with the baked textures (Cycles), Surtaysha lighting.
# blender -b out/costume_low.blend --python render.py -- [outdir] [samples] [views] [res_scale]
import bpy, sys, os, math, json
from mathutils import Vector, Matrix, Euler

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTD = args[0] if args else r"F:\qirq-qiz-unity\Builds"
SAMPLES = int(args[1]) if len(args) > 1 else 160
VIEWS = args[2].split(',') if len(args) > 2 else ['front', 'q34', 'side', 'back', 'amulet', 'etik']
RS = float(args[3]) if len(args) > 3 else 1.0
TEX = r"F:\qirq-qiz\tools\blender\guloyim_costume\out\textures"
PREFIX = 'guloyim_kiyim_'
DETAIL_UV = 38.0     # cloth atlas UV -> weave tiles (64 mm tile)
LMJ = json.load(open("F:/qirq-qiz/tools/blender/guloyim_costume/out/landmarks.json")); LM = LMJ

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
        bs.inputs['Sheen Weight'].default_value = 0.55          # wool: soft sheen at grazing angles
        bs.inputs['Sheen Roughness'].default_value = 0.35
        try: bs.inputs['Sheen Tint'].default_value = (0.55, 0.62, 0.95, 1.0)
        except Exception: pass
    return m

for o in bpy.data.objects:
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, True)
def _uv_scale(name='GUL_Tunic_Skirt'):
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
MAP = {'M_Lamellar': 'T_Lamellar', 'M_Trim': 'T_Trim', 'M_Armor': 'T_Armor', 'M_Cloth': 'T_Cloth',
       'M_Jewel': 'T_Jewel', 'M_Weapon': 'T_Weapon', 'M_Amulet': 'T_Amulet'}
for mn, tn in MAP.items():
    if bpy.data.materials.get(mn):
        pbr(mn, tn)
# the cloth sheets (skirt, scarf) are single layers: Cycles renders both faces with the same material (two-sided in UE)

# body proxy: neutral warm skin clay
body = bpy.data.objects.get('GUL_Body')
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
    # never show a face in the previews: the head is replaced by a smooth neutral mannequin head (the face is made in UE)
    hz = LM['bones']['head']['head'][2] - 0.012
    dl = bm_.verts.layers.deform.active
    def is_head(v):
        if v.co.z > hz: return True
        if dl and v[dl]:
            g = gname.get(max(v[dl].items(), key=lambda kv: kv[1])[0], '')
            return g.startswith(('head', 'FACIAL', 'facial'))
        return False
    bmesh.ops.delete(bm_, geom=[v for v in bm_.verts if is_head(v)], context='VERTS')
    hb = LM['bones']['head']['head']
    hc = Vector((0.0, hb[1] - 0.012, hb[2] + 0.060))
    ret = bmesh.ops.create_uvsphere(bm_, u_segments=48, v_segments=32, radius=1.0)
    for v in ret['verts']:
        c = v.co.copy()
        y = c.y * 0.100
        y -= 0.010 * max(0.0, -c.y) * max(0.0, -c.z)          # gentle jaw / chin taper
        v.co = hc + Vector((c.x * 0.076 * (1 - 0.18 * max(0.0, -c.z)), y, c.z * 0.112))
    for f in ret['faces'] if 'faces' in ret else []: f.smooth = True
    for f in bm_.faces: f.smooth = True
    bm_.to_mesh(body.data); bm_.free()

# sabre sheathed in the scabbard on the left hip (the sabre mesh itself stays at its grip origin for the hand socket)
scb = bpy.data.objects.get('GUL_Scabbard')
if scb and scb.get('sheath_matrix'):
    MS = Matrix([list(r) for r in scb['sheath_matrix']])
    for o in bpy.data.objects:
        if o.name.startswith('GUL_Sabre'): o.matrix_world = MS @ o.matrix_world

# floor + world
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.0153))
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

amu = bpy.data.objects.get('GUL_Amulet')
for v in VIEWS:
    if v == 'front': shoot('front', (0, -5.0, 0.98), (0, 0, 0.92), 70, (1500, 2000))
    if v == 'q34': shoot('q34', (-3.4, -3.7, 1.08), (0, 0, 0.92), 70, (1500, 2000))
    if v == 'side': shoot('side', (5.0, 0.0, 0.98), (0, 0, 0.92), 70, (1500, 2000))
    if v == 'back': shoot('back', (0.3, 5.0, 1.02), (0, 0, 0.92), 70, (1500, 2000))
    if v == 'amulet' and amu:
        c = amu.matrix_world @ Vector((0, 0, -0.026))
        shoot('amulet', c + Vector((-0.10, -0.42, 0.06)), c, 100, (1600, 1600))
    if v == 'etik': shoot('etik', (0.62, -0.80, 0.34), (0.15, -0.03, 0.22), 52, (1600, 1600))
    if v == 'head': shoot('head', (-0.6, -1.2, 1.62), (0, 0, 1.58), 85, (1600, 1600))
    if v == 'torso': shoot('torso', (-1.2, -2.6, 1.22), (0, 0, 1.15), 85, (1600, 1600))
    if v == 'legs': shoot('legs', (-0.9, -2.2, 0.42), (0, 0, 0.40), 85, (1600, 1600))
