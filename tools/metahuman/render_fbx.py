# Render an FBX (MetaHuman preview) head front + 3/4 next to the reference portrait.
# Run: blender -b --python render_fbx.py -- <in.fbx> <portrait.png> <out.png>
import bpy, sys, math, os
from mathutils import Vector
src, portrait, outp = sys.argv[-3:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = sc.render.resolution_y = 1024
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.85, .85, .85, 1)
for o in list(sc.objects):   # the FBX carries every LOD on top of each other (z-fighting patches): keep LOD0
    if o.type == 'MESH' and '_LOD' in o.name and not o.name.endswith('_LOD0'): bpy.data.objects.remove(o, do_unlink=True)
ms = [o for o in sc.objects if o.type == 'MESH']
for o in ms:   # FBX from Unreal: drop imported split/custom normals, smooth shading (cmp1 looked faceted)
    me = o.data
    try: me.free_normals_split()
    except Exception: pass
    if me.has_custom_normals:
        bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.mesh.customdata_custom_splitnormals_clear(); o.select_set(False)
    for pl in me.polygons: pl.use_smooth = True
for o in ms:
    for s in o.material_slots:
        if s.material and s.material.use_nodes:
            b = s.material.node_tree.nodes.get('Principled BSDF')
            if b and not b.inputs['Base Color'].links: b.inputs['Base Color'].default_value = (.75, .6, .5, 1)
pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
top = max(p.z for p in pts); cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts)
lo = min(p.z for p in pts); H = top - lo
print('RF bbox', round(lo, 3), round(top, 3), 'H', round(H, 3), 'y', round(min(p.y for p in pts), 3), round(max(p.y for p in pts), 3))
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (math.radians(60), 0, math.radians(20)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.sensor_fit = 'HORIZONTAL'; cam.data.angle = math.radians(30)
eye = top - .145 * H / 1.75
# MetaHumans face -Y or +Y depending on the export axes: front = the side with the nose (min/max y of the head band)
head = [p for p in pts if p.z > top - .3 * H / 1.75]
shots = []
for i, (ang, d) in enumerate(((0, .75 * H / 1.75), (35, .75 * H / 1.75))):
    for sgn in (-1, 1):
        a = math.radians(ang); dv = Vector((math.sin(a), sgn * math.cos(a), 0))
        cam.location = Vector((cx, cy, eye)) + dv * d
        cam.rotation_euler = (Vector((cx, cy, eye)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        fp = outp[:-4] + '_%d%s.png' % (i, 'n' if sgn < 0 else 'p'); sc.render.filepath = fp; bpy.ops.render.render(write_still=True); shots.append(fp)
# full body front + side (ortho)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = H * 1.1; sc.render.resolution_x, sc.render.resolution_y = 600, 1024
for nm, dv in (('fn', Vector((0, -1, 0))), ('fp', Vector((0, 1, 0))), ('side', Vector((1, 0, 0)))):
    cam.location = Vector((cx, cy, lo + H / 2)) + dv * 6; cam.rotation_euler = (-dv).to_track_quat('-Z', 'Y').to_euler()
    fp = outp[:-4] + '_body_%s.png' % nm; sc.render.filepath = fp; bpy.ops.render.render(write_still=True); shots.append(fp)
print('RF shots', shots)
