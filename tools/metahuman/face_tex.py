# Face texture for a clean MetaHuman head (geometry untouched):
#   render  : grey head from 3 known cameras (front, 3/4 left, 3/4 right) -> out/ft_<view>.png + out/ft_cams.json
#   project : painted versions of those renders (Higgsfield repaint, same framing) are projected back onto the head UVs
#             (per texel: 3D position -> each camera -> sample, weighted by facing and visibility) -> head_basecolor.png,
#             then a comparison render next to the reference portrait.
# Run: blender -b --python face_tex.py -- render <head.fbx> <outdir>
#      blender -b --python face_tex.py -- project <head.fbx> <outdir> <portrait.png> <front.png> <left.png> <right.png>
import bpy, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

a = sys.argv[sys.argv.index('--') + 1:]; MODE, SRC, OUTD = a[0], a[1], a[2]
os.makedirs(OUTD, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.fbx(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == 'MESH' and '_LOD' in o.name and not o.name.endswith('_LOD0'): bpy.data.objects.remove(o, do_unlink=True)
ms = [o for o in sc.objects if o.type == 'MESH']
for o in ms:
    me = o.data
    if me.has_custom_normals:
        bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.mesh.customdata_custom_splitnormals_clear(); o.select_set(False)
    for pl in me.polygons: pl.use_smooth = True
print('FT meshes', [(o.name, len(o.data.vertices), [s.material.name for s in o.material_slots if s.material]) for o in ms])
head = max(ms, key=lambda o: len(o.data.vertices))
def is_skin_slot(m):
    n = (m.name if m else '').lower()
    return not any(k in n for k in ('eye', 'teeth', 'lash', 'tongue', 'cartilage', 'saliva', 'occlusion', 'shell', 'brow'))
pts = [head.matrix_world @ v.co for v in head.data.vertices]
top = max(p.z for p in pts); lo = min(p.z for p in pts)
cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts)
# remove the hidden helper geometry (M_Hide: eye shells, occlusion, cartilage cards)
import bmesh
hide = {i for i, s in enumerate(head.material_slots) if s.material and 'hide' in s.material.name.lower()}
bmx = bmesh.new(); bmx.from_mesh(head.data); bmesh.ops.delete(bmx, geom=[f for f in bmx.faces if f.material_index in hide], context='FACES'); bmx.to_mesh(head.data); bmx.free()
pts = [head.matrix_world @ v.co for v in head.data.vertices]
# front + eye height from the eyeballs
eyes = {i for i, s in enumerate(head.material_slots) if s.material and 'eyes' in s.material.name.lower()}
ev = set(v for p in head.data.polygons if p.material_index in eyes for v in p.vertices)
ep = [head.matrix_world @ head.data.vertices[i].co for i in ev]
ecy = sum(p.y for p in ep) / len(ep); eye_z = sum(p.z for p in ep) / len(ep)
fy = -1 if ecy < cy else 1   # -1: face looks to -Y
C = Vector((cx, cy, eye_z - .03)); D = .62; FOV = 30.0; RES = 1024
VIEWS = {'front': 0, 'left': 40, 'right': -40}
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.sensor_fit = 'HORIZONTAL'; cam.data.angle = math.radians(FOV)
sc.render.resolution_x = sc.render.resolution_y = RES
def place(ang):
    t = math.radians(ang); d = Vector((math.sin(t), fy * math.cos(t), 0))
    cam.location = C + d * D; cam.rotation_euler = (C - cam.location).to_track_quat('-Z', 'Y').to_euler(); bpy.context.view_layer.update()
print('FT head z %.3f..%.3f front %s' % (lo, top, '-Y' if fy < 0 else '+Y'))

if MODE == 'render':
    sc.render.engine = 'BLENDER_EEVEE'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.62, .62, .62, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.6
    grey = bpy.data.materials.new('grey'); grey.use_nodes = True; grey.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.62, .58, .55, 1); grey.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .7
    dark = bpy.data.materials.new('dark'); dark.use_nodes = True; dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.05, .04, .04, 1)
    white = bpy.data.materials.new('white'); white.use_nodes = True; white.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.85, .85, .85, 1)
    for o in ms:
        for s in o.material_slots:
            n = (s.material.name if s.material else '').lower()
            s.material = white if 'eye' in n and 'lash' not in n else dark if 'lash' in n or 'brow' in n else grey
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 1.2; sun.rotation_euler = (math.radians(55), 0, 0); sc.collection.objects.link(sun)
    cams = {}
    for nm, ang in VIEWS.items():
        place(ang); sc.render.filepath = os.path.join(OUTD, 'ft_%s.png' % nm); bpy.ops.render.render(write_still=True)
        cams[nm] = {'ang': ang, 'matrix': [list(r) for r in cam.matrix_world]}
    json.dump({'fov': FOV, 'res': RES, 'cams': cams, 'center': list(C), 'front': fy}, open(os.path.join(OUTD, 'ft_cams.json'), 'w'), indent=1)
    print('FT rendered')
    sys.exit(0)

# ---------------- project ----------------
portrait, imgs = a[3], {k: v for k, v in zip(('front', 'left', 'right'), a[4:7]) if v.lower() != 'none'}
USE = list(imgs)   # views with a painted image (side repaints that drift off the render are skipped)
def load_px(p):
    im = bpy.data.images.load(p); W, H = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, :3]   # row 0 = bottom
    return px, W, H
PX = {k: load_px(v) for k, v in imgs.items()}
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(head, dg)
me = head.data; me.calc_loop_triangles(); uvd = me.uv_layers.active.data; mw = head.matrix_world; nm3 = mw.to_3x3()
P = [mw @ v.co for v in me.vertices]; N = [(nm3 @ v.normal).normalized() for v in me.vertices]
camdata = {}
for nmv, ang in VIEWS.items():
    place(ang); camdata[nmv] = (cam.location.copy(), cam.matrix_world.copy())
# per vertex: image coords and weight per view (facing^2 * visible)
VW = {}
for nmv in USE:
    loc, _ = camdata[nmv]; place(VIEWS[nmv])
    px, W, H = PX[nmv]; arr = np.zeros((len(P), 3), np.float32)
    for i, p in enumerate(P):
        d = (loc - p); dist = d.length; d.normalize()
        f = N[i].dot(d)
        if f <= .05: continue
        hit = bvh.ray_cast(p + d * .002, d, dist - .01)
        if hit[0] is not None: continue
        q = world_to_camera_view(sc, cam, p)
        if not (0 <= q.x <= 1 and 0 <= q.y <= 1): continue
        arr[i] = (q.x * (W - 1), q.y * (H - 1), f * f * (1.6 if nmv == 'front' else 1.0))
    VW[nmv] = arr
TS = 2048; acc = np.zeros((TS, TS, 3), np.float32); wsum = np.zeros((TS, TS), np.float32)
skin_slots = {i for i, s in enumerate(head.material_slots) if is_skin_slot(s.material)}
def sample(px, x, y):
    H, W = px.shape[:2]; x = np.clip(x, 0, W - 1.001); y = np.clip(y, 0, H - 1.001); x0 = x.astype(int); y0 = y.astype(int); fx = (x - x0)[..., None]; fy_ = (y - y0)[..., None]
    return (px[y0, x0] * (1 - fx) + px[y0, x0 + 1] * fx) * (1 - fy_) + (px[y0 + 1, x0] * (1 - fx) + px[y0 + 1, x0 + 1] * fx) * fy_
for t in me.loop_triangles:
    if t.material_index not in skin_slots: continue
    vs = t.vertices
    if all(VW[k][v, 2] == 0 for k in USE for v in vs): continue
    uv = np.array([uvd[l].uv[:] for l in t.loops]) * (TS - 1)
    x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
    if x1 - x0 > 300 or y1 - y0 > 300: continue
    gx, gy = np.meshgrid(np.arange(max(0, x0), min(TS - 1, x1) + 1), np.arange(max(0, y0), min(TS - 1, y1) + 1))
    d = (uv[1, 1] - uv[2, 1]) * (uv[0, 0] - uv[2, 0]) + (uv[2, 0] - uv[1, 0]) * (uv[0, 1] - uv[2, 1])
    if abs(d) < 1e-9: continue
    l0 = ((uv[1, 1] - uv[2, 1]) * (gx - uv[2, 0]) + (uv[2, 0] - uv[1, 0]) * (gy - uv[2, 1])) / d
    l1 = ((uv[2, 1] - uv[0, 1]) * (gx - uv[2, 0]) + (uv[0, 0] - uv[2, 0]) * (gy - uv[2, 1])) / d; l2 = 1 - l0 - l1
    ins = (l0 >= -.01) & (l1 >= -.01) & (l2 >= -.01)
    if not ins.any(): continue
    for k in USE:
        a3 = VW[k][list(vs)]
        if (a3[:, 2] == 0).any(): continue   # partly hidden in this view: skip the triangle for it
        ix = l0 * a3[0, 0] + l1 * a3[1, 0] + l2 * a3[2, 0]; iy = l0 * a3[0, 1] + l1 * a3[1, 1] + l2 * a3[2, 1]; ww = (l0 * a3[0, 2] + l1 * a3[1, 2] + l2 * a3[2, 2]) * ins
        col = sample(PX[k][0], ix, iy)
        acc[gy, gx] += col * ww[..., None]; wsum[gy, gx] += ww
have = wsum > 1e-4
tex = np.zeros((TS, TS, 3), np.float32); tex[have] = acc[have] / wsum[have][:, None]
# unseen parts (back of the head, under the jaw): push-pull fill, the seen colour spreads smoothly over the whole UV map
def pushpull(col, m):
    if min(col.shape[:2]) <= 4: 
        c = (col * m[..., None]).sum((0, 1)) / max(1e-6, m.sum()); return np.broadcast_to(c, col.shape).copy()
    h, w = col.shape[:2]; h2, w2 = h // 2, w // 2
    cm = (col * m[..., None])[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, 3).sum((1, 3)); mm = m[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2).sum((1, 3))
    low = np.zeros_like(cm); ok = mm > 0; low[ok] = cm[ok] / mm[ok][:, None]
    low = pushpull(low, (mm > 0).astype(np.float32))
    up = np.repeat(np.repeat(low, 2, 0), 2, 1); up = np.pad(up, ((0, h - up.shape[0]), (0, w - up.shape[1]), (0, 0)), mode='edge')
    out = col.copy(); mk = m > 0; out[~mk] = up[~mk]; return out
fill = pushpull(tex, have.astype(np.float32))
# soften the seam between projected and filled texels
edge = have.astype(np.float32)
for _ in range(6): edge = (edge + np.roll(edge, 1, 0) + np.roll(edge, -1, 0) + np.roll(edge, 1, 1) + np.roll(edge, -1, 1)) / 5
im = bpy.data.images.new('head_basecolor', TS, TS, alpha=False)
im.pixels.foreach_set(np.concatenate([fill, np.ones((TS, TS, 1), np.float32)], 2).ravel())
im.filepath_raw = os.path.join(OUTD, 'head_basecolor.png'); im.file_format = 'PNG'; im.save()
print('FT texture saved', im.filepath_raw, 'covered %.1f%%' % (100 * have.mean()))
# comparison render
mat = bpy.data.materials.new('skin'); mat.use_nodes = True; nt = mat.node_tree; bs = nt.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = .5
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = im; nt.links.new(tn.outputs['Color'], bs.inputs['Base Color'])
for i in skin_slots: head.material_slots[i].material = mat
if 'front' in imgs:
    eim = bpy.data.images.load(imgs['front']); emat = bpy.data.materials.new('eyes'); emat.use_nodes = True; ent = emat.node_tree; ebs = ent.nodes['Principled BSDF']; ebs.inputs['Roughness'].default_value = .1
    et = ent.nodes.new('ShaderNodeTexImage'); et.image = eim; ent.links.new(et.outputs['Color'], ebs.inputs['Base Color'])
    eye_slots = {i for i, sl in enumerate(head.material_slots) if sl.material and 'eyes' in sl.material.name.lower()}
    place(VIEWS['front'])
    for pl in me.polygons:
        if pl.material_index in eye_slots:
            for li in pl.loop_indices:
                q = world_to_camera_view(sc, cam, P[me.loops[li].vertex_index]); uvd[li].uv = (q.x, q.y)
    for i in eye_slots: head.material_slots[i].material = emat
    eim.pack()
sc.render.engine = 'BLENDER_EEVEE'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.85, .85, .85, 1)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 2.5; sun.rotation_euler = (math.radians(55), 0, math.radians(20)); sc.collection.objects.link(sun)
outs = []
for nmv in ('front', 'left'):
    place(VIEWS[nmv]); fp = os.path.join(OUTD, 'ft_res_%s.png' % nmv); sc.render.filepath = fp; bpy.ops.render.render(write_still=True); outs.append(fp)
print('FT result', outs)
