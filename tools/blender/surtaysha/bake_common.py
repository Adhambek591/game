# shared bake utilities
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, noise
import mats

TEX = r"F:\qirq-qiz\tools\blender\surtaysha\out\textures"
os.makedirs(TEX, exist_ok=True)

def setup_cycles(samples=8):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    pr = bpy.context.preferences.addons['cycles'].preferences
    for dev in ('OPTIX', 'CUDA'):
        try:
            pr.compute_device_type = dev
            pr.get_devices()
            ok = False
            for d in pr.devices:
                d.use = d.type != 'CPU'
                ok = ok or d.use
            if ok: break
        except Exception as e:
            print('device', dev, e)
    sc.cycles.device = 'GPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.bake.margin = 16
    sc.render.bake.margin_type = 'EXTEND'
    print('cycles device', pr.compute_device_type)

def new_image(name, size, data=True, alpha=False):
    im = bpy.data.images.get(name)
    if im: bpy.data.images.remove(im)
    im = bpy.data.images.new(name, size, size, alpha=alpha, float_buffer=True)
    im.generated_type = 'BLANK'
    im.colorspace_settings.name = 'Non-Color' if data else 'sRGB'
    fill = {'nrm': (0.5, 0.5, 1.0, 1.0), 'ao': (1, 1, 1, 1), 'rough': (0.6, 0.6, 0.6, 1), 'curv': (0.5, 0.5, 0.5, 1)}
    for k, c in fill.items():
        if name.endswith('_' + k):
            im.generated_color = c
    return im

def bake_material(img):
    """a material holding only the active target image (assigned to lows during bakes)"""
    m = bpy.data.materials.new('BAKE_' + img.name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = img
    nt.nodes.active = n
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    bs = nt.nodes.new('ShaderNodeBsdfDiffuse'); nt.links.new(bs.outputs[0], o.inputs[0])
    return m

def set_target(mat, img):
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            n.image = img; mat.node_tree.nodes.active = n

def route(mat, channel):
    """channel None -> restore BSDF; else route that channel to an emission output"""
    nt = mat.node_tree
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    bsdf = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    em = nt.nodes.get('BAKE_EMIT') or nt.nodes.new('ShaderNodeEmission'); em.name = 'BAKE_EMIT'
    for l in list(out.inputs['Surface'].links): nt.links.remove(l)
    for l in list(em.inputs['Color'].links): nt.links.remove(l)
    if channel is None:
        nt.links.new(bsdf.outputs[0], out.inputs['Surface']); return
    if channel == 'curv':
        geo = [n for n in nt.nodes if n.type == 'NEW_GEOMETRY'][0]
        nt.links.new(geo.outputs['Pointiness'], em.inputs['Color'])
    else:
        sock = {'base': 'Base Color', 'rough': 'Roughness', 'metal': 'Metallic'}[channel]
        inp = bsdf.inputs[sock]
        if inp.links:
            nt.links.new(inp.links[0].from_socket, em.inputs['Color'])
        else:
            v = inp.default_value
            em.inputs['Color'].default_value = (v, v, v, 1) if isinstance(v, float) else tuple(v)
    nt.links.new(em.outputs[0], out.inputs['Surface'])

def select_only(objs, active):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active

def bake(kind, lows_highs, img, bake_mats, extrusion=0.006, ray=0.02, samples=None, highs_mats=None, channel=None):
    """lows_highs: list of (low, [highs]). bake each pair into img without clearing."""
    sc = bpy.context.scene
    if samples: sc.cycles.samples = samples
    for m in bake_mats: set_target(m, img)
    if highs_mats:
        for m in highs_mats: route(m, channel)
    bk = sc.render.bake
    bk.use_selected_to_active = True
    bk.cage_extrusion = extrusion
    bk.max_ray_distance = ray
    bk.use_clear = False
    bk.target = 'IMAGE_TEXTURES'
    if kind == 'NORMAL':
        bk.normal_space = 'TANGENT'
    for low, highs in lows_highs:
        select_only(highs + [low], low)
        t = 'EMIT' if kind in ('EMIT',) else kind
        bpy.ops.object.bake(type=t, pass_filter=set() if t != 'DIFFUSE' else {'COLOR'}, use_clear=False, margin=16)
    if highs_mats:
        for m in highs_mats: route(m, None)

def img_np(img):
    a = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)

def save_np(arr, path, srgb=False, size=None):
    h, w = arr.shape[:2]
    keep_a = arr.shape[2] == 4 and 'Plume' in path
    im = bpy.data.images.new(os.path.basename(path), w, h, alpha=keep_a, float_buffer=False)
    im.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    if srgb:
        lin = arr[..., :3]
        s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.clip(lin, 0, None), 1 / 2.4) - 0.055)
        arr = np.concatenate([s, arr[..., 3:4] if arr.shape[2] == 4 else np.ones((h, w, 1), np.float32)], axis=2)
    elif arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones((h, w, 1), np.float32)], axis=2)
    im.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    im.filepath_raw = path; im.file_format = 'PNG'
    im.save()
    bpy.data.images.remove(im)
    print('saved', path)

def write_set(prefix, base, nrm, rough, metal, ao, curv=None):
    """BaseColor (sRGB), Normal (DirectX / UE: green flipped), ORM (R=AO G=Rough B=Metal)"""
    b = img_np(base); n = img_np(nrm).copy(); r = img_np(rough); m = img_np(metal); a = img_np(ao)
    save_np(b[..., :3], os.path.join(TEX, prefix + '_BaseColor.png'), srgb=True)
    n[..., 1] = 1.0 - n[..., 1]
    save_np(n[..., :3], os.path.join(TEX, prefix + '_Normal.png'))
    orm = np.stack([a[..., 0], r[..., 0], m[..., 0]], axis=2)
    save_np(orm, os.path.join(TEX, prefix + '_ORM.png'))
    if curv is not None:
        save_np(img_np(curv)[..., :3], os.path.join(TEX, prefix + '_Curvature.png'))

def make_high(low, level=2, bevel=0.0008, disp=None, seed=0, attr=None):
    """duplicate low -> bevel + subsurf -> python displacement along normals"""
    h = low.copy(); h.data = low.data.copy(); h.name = low.name + '_HIGH'
    bpy.context.scene.collection.objects.link(h)
    for k in list(h.keys()): del h[k]
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(h, a, True)
    if bevel > 0:
        bv = h.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
    if level:
        ss = h.modifiers.new('ss', 'SUBSURF'); ss.levels = level; ss.render_levels = level; ss.boundary_smooth = 'PRESERVE_CORNERS'
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(h.evaluated_get(dg))
    h.modifiers.clear(); old = h.data; h.data = me; bpy.data.meshes.remove(old)
    if disp:
        me = h.data
        me.calc_normals_split() if hasattr(me, 'calc_normals_split') else None
        co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        nr = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
        mw = np.array(h.matrix_world)
        d = np.array([disp(Vector(p), seed) for p in co], np.float32)
        co = co + nr * d[:, None]
        me.vertices.foreach_set('co', co.ravel()); me.update()
    if attr:
        me = h.data
        vals = [attr(v.co) for v in me.vertices]
        ca = me.color_attributes.new('orn', 'FLOAT_COLOR', 'POINT')
        ca.data.foreach_set('color', np.array([[a, a, a, 1.0] for a in vals], np.float32).ravel())
    for p in h.data.polygons: p.use_smooth = True
    return h

# displacement functions (metres)
def d_iron(p, s):
    q = p * 26.0 + Vector((s * 7.1, s * 3.3, s * 5.7))
    dent = -max(0.0, noise.noise(q) - 0.25) * 0.0016
    dent += -max(0.0, noise.noise(p * 70.0 + Vector((s, 2 * s, 0))) - 0.45) * 0.0006
    ham = noise.noise(p * 160.0) * 0.00012
    return dent + ham
def d_gold(p, s):
    return noise.noise(p * 90.0 + Vector((s, s, s))) * 0.00008 - max(0.0, noise.noise(p * 30.0) - 0.4) * 0.0004
def d_leather(p, s):
    w = abs(noise.noise(p * 34.0 + Vector((s, 0, s)))) * -0.0005
    w += noise.turbulence(p * 90.0, 3, False) * 0.00012
    return w
def d_cloth(p, s):
    # |d| stays below half the 4-5 mm shell thickness so front and back never cross
    f = noise.noise(p * Vector((7.0, 7.0, 2.2)) + Vector((s, s, s))) * 0.0013
    f += noise.noise(p * Vector((22.0, 22.0, 9.0))) * 0.0006
    f += -abs(noise.noise(p * 45.0)) * 0.0003
    return f
