# Orthographic silhouette check of the built boot against the reference masks.
#   blender -b out/armor_low.blend --python boot_ref/check_render.py [-- outdir]
# Renders the LEFT boot (all its pieces) exactly from the front (-Y) and from the side (+X), at the mask scale,
# and writes cmp_front.png / cmp_side.png (grey = both, red = reference only, blue = mesh only) + iou.json.
import bpy, os, sys, json, math
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTD = args[0] if args else HERE
d = np.load(os.path.join(HERE, 'boot_profile.npz'))
PIECES = ['SUR_Boot_L', 'SUR_Boot_Sole_L', 'SUR_Boot_Shaft_L', 'SUR_Boot_Straps_L']

def load_mask(name):
    im = bpy.data.images.load(os.path.join(HERE, name)); w, h = im.size
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1, :, 0] > 0.5

def save_rgb(arr, path):
    h, w = arr.shape[:2]
    im = bpy.data.images.new('o', w, h, alpha=False)
    a = np.concatenate([arr[::-1].astype(np.float32) / 255.0, np.ones((h, w, 1), np.float32)], axis=2)
    im.pixels.foreach_set(a.ravel()); im.filepath_raw = path; im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)

sc = bpy.context.scene
for o in bpy.data.objects:
    o.hide_render = o.name not in PIECES
white = bpy.data.materials.new('W'); white.use_nodes = True
nt = white.node_tree; nt.nodes.clear()
em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = (1, 1, 1, 1)
out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs[0])
for n in PIECES:
    o = bpy.data.objects[n]; o.data.materials.clear(); o.data.materials.append(white)
    for a in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(o, a, True)
sc.render.engine = 'CYCLES'; sc.cycles.samples = 1; sc.cycles.use_denoising = False; sc.cycles.device = 'CPU'
sc.render.film_transparent = False
w = bpy.data.worlds.new('K'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0, 0, 0, 1)
sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.file_format = 'PNG'
cd = bpy.data.cameras.new('C'); cd.type = 'ORTHO'; cam = bpy.data.objects.new('C', cd); sc.collection.objects.link(cam); sc.camera = cam
O = bpy.data.objects['SUR_Boot_L'].get('boot_origin')      # shaft axis in the world, written by boots.py
if O is None: raise SystemExit('SUR_Boot_L has no boot_origin')
SS = 8
res = {}
for view in ('front', 'side'):
    m = load_mask('mask_%s.png' % view); h, wd = m.shape
    if view == 'side':
        ax, gy, s, zg = [float(v) for v in d['side_px']]; ax -= 812; gy -= 600
        cam.location = (3.0, O[1] + (wd / 2 - ax) * s, zg + (gy - h / 2) * s); cam.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    else:
        ax, gy, s, zg = [float(v) for v in d['front_px']]
        cam.location = (O[0] + (wd / 2 - ax) * s, -3.0, zg + (gy - h / 2) * s); cam.rotation_euler = (math.pi / 2, 0, 0)
    cd.ortho_scale = max(wd, h) * s
    sc.render.resolution_x = wd * SS; sc.render.resolution_y = h * SS; sc.render.resolution_percentage = 100
    p = os.path.join(OUTD, 'sil_%s.png' % view); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(p); a = np.empty(wd * SS * h * SS * 4, np.float32); im.pixels.foreach_get(a)
    r = a.reshape(h * SS, wd * SS, 4)[::-1, :, 0]
    r = r.reshape(h, SS, wd, SS).mean(axis=(1, 3)) > 0.5
    iou = float((r & m).sum() / (r | m).sum())
    res[view] = round(iou, 4)
    vis = np.zeros((h, wd, 3), np.uint8); vis[m & r] = (200, 200, 200); vis[m & ~r] = (255, 60, 60); vis[r & ~m] = (60, 120, 255)
    k = 8 if view == 'side' else 3
    save_rgb(np.kron(vis, np.ones((k, k, 1), np.uint8)), os.path.join(OUTD, 'cmp_%s.png' % view))
    np.save(os.path.join(OUTD, 'sil_%s.npy' % view), r)
    print('IOU', view, iou, 'mask px', int(m.sum()), 'mesh px', int(r.sum()))
json.dump(res, open(os.path.join(OUTD, 'iou.json'), 'w'))
