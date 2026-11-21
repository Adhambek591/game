# Karakalpak yurt (otaw) built procedurally in Blender, for the Unity port.
# Parts: kerege (crossed lattice wall), uyk (curved roof poles), shangaraq (crown wheel with cross bars), felt covers
# (wall + roof, slightly sagging between poles), patterned band (basqur) round the wall top, wooden door with frame, ropes.
# Run: blender -b --python yurt.py -- <out.glb> <preview.png> <texdir>
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if len(argv) > 0 else 'yurt.glb'; PNG = argv[1] if len(argv) > 1 else 'yurt.png'; TEX = argv[2] if len(argv) > 2 else ''

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

R, WALL, ROOF, CROWN_R = 3.1, 1.45, 1.55, .55     # radius, wall height, roof rise, crown radius (metres)

def mat(name, color, rough=.8, tex=None, scale=1.0, normal=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    if tex and os.path.exists(tex):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(tex)
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale); tc = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
        mix.inputs[6].default_value = (*color, 1); nt.links.new(t.outputs['Color'], mix.inputs[7]); nt.links.new(mix.outputs[2], b.inputs['Base Color'])
        if normal and os.path.exists(normal):
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(normal); n.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(mp.outputs['Vector'], n.inputs['Vector']); nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.6
            nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

T = lambda n: os.path.join(TEX, n)
wood = mat('wood', (.42, .27, .15), .65, T('brown_planks_09_diff.jpg'), 2, T('brown_planks_09_nor.jpg'))
woodRed = mat('wood_red', (.36, .07, .04), .5)
felt = mat('felt', (.7, .64, .55), 1.0, T('curly_teddy_natural_diff.jpg'), 3, T('curly_teddy_natural_nor.jpg'))
feltRoof = mat('felt_roof', (.6, .55, .47), 1.0, T('curly_teddy_natural_diff.jpg'), 3, T('curly_teddy_natural_nor.jpg'))
rope = mat('rope', (.32, .24, .15), .9)
band = mat('band', (1, 1, 1), .8)

def link(obj): sc.collection.objects.link(obj); return obj

def cyl_between(a, b, r, m, name='pole', verts=6):
    d = b - a; L = d.length
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=L, location=(a + b) / 2)
    o = bpy.context.active_object; o.name = name
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y'); o.data.materials.append(m); return o

parts = []
# --- kerege: two layers of slats crossing diagonally around the wall
N = 72
for i in range(N):
    a0 = i / N * 2 * math.pi; a1 = a0 + 2 * math.pi / 18
    for s, rr in ((1, R - .03), (-1, R - .05)):
        p0 = Vector((math.cos(a0) * rr, math.sin(a0) * rr, .05)); p1 = Vector((math.cos(a0 + s * 2 * math.pi / 18) * rr, math.sin(a0 + s * 2 * math.pi / 18) * rr, WALL))
        parts.append(cyl_between(p0, p1, .012, wood, 'kerege'))
# --- shangaraq: crown ring + cross bars
bpy.ops.mesh.primitive_torus_add(major_radius=CROWN_R, minor_radius=.05, location=(0, 0, WALL + ROOF), major_segments=48, minor_segments=8)
crown = bpy.context.active_object; crown.data.materials.append(woodRed); parts.append(crown)
for k in range(3):
    a = k * math.pi / 3
    for off in (-.12, .12):
        p = Vector((math.cos(a + math.pi / 2) * off, math.sin(a + math.pi / 2) * off, WALL + ROOF + .02))
        parts.append(cyl_between(p + Vector((math.cos(a), math.sin(a), 0)) * CROWN_R, p - Vector((math.cos(a), math.sin(a), 0)) * CROWN_R, .022, woodRed, 'crossbar'))
# --- uyk: curved roof poles from wall top to crown (red painted, slight bend)
U = 64
for i in range(U):
    a = i / U * 2 * math.pi; pts = []
    for t in (0, .33, .66, 1):
        rr = R + (CROWN_R - R) * t; z = WALL + ROOF * (t ** .85) + math.sin(t * math.pi) * .05
        pts.append(Vector((math.cos(a) * rr, math.sin(a) * rr, z)))
    for j in range(3): parts.append(cyl_between(pts[j], pts[j + 1], .02, woodRed, 'uyk'))
# --- felt wall cover (cylinder, gentle wave) and roof cover (cone section), leaving the crown open
def surface(name, fn, nu, nv, m):
    bm = bmesh.new(); verts = [[bm.verts.new(fn(u / nu, v / nv)) for u in range(nu + 1)] for v in range(nv + 1)]
    uvl = bm.loops.layers.uv.new('UVMap')
    for v in range(nv):
        for u in range(nu):
            f = bm.faces.new((verts[v][u], verts[v][u + 1], verts[v + 1][u + 1], verts[v + 1][u]))
            for l, (uu, vv) in zip(f.loops, ((u, v), (u + 1, v), (u + 1, v + 1), (u, v + 1))): l[uvl].uv = (uu / nu * 8, vv / nv * 2)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o
DOOR_A = -math.pi / 2; DOOR_W = .32   # half-angle span (radians) left open for the door
def wall_fn(u, v):
    a = DOOR_A + DOOR_W / 2 + u * (2 * math.pi - DOOR_W); rr = R + .02 + math.sin(a * 32) * .006 + math.sin(v * math.pi) * .02
    return Vector((math.cos(a) * rr, math.sin(a) * rr, .02 + v * (WALL + .04)))
def roof_fn(u, v):
    a = u * 2 * math.pi; t = v; rr = R + .12 + (CROWN_R + .06 - R - .12) * t
    z = WALL + ROOF * (t ** .85) + .05 + math.sin(t * math.pi) * .03 - (1 - abs(math.cos(a * U / 2))) * .035 * math.sin(t * math.pi)
    return Vector((math.cos(a) * rr, math.sin(a) * rr, z))
parts.append(surface('felt_wall', wall_fn, 96, 6, felt))
parts.append(surface('felt_roof', roof_fn, 128, 10, feltRoof))
# --- patterned band (basqur) around the wall top: red with a white zigzag drawn into a small texture
img = bpy.data.images.new('band_tex', 256, 32); px = []
for y in range(32):
    for x in range(256):
        zz = abs(((x % 32) - 16)) < (y if y < 16 else 31 - y) / 1.2
        c = (.92, .9, .85) if zz and 6 < y < 26 else ((.12, .1, .3) if y < 4 or y > 27 else (.62, .08, .06))
        px += [*c, 1]
img.pixels = px; img.pack()
nt = band.node_tree; t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
def band_fn(u, v):
    a = DOOR_A + DOOR_W / 2 + u * (2 * math.pi - DOOR_W); rr = R + .045
    return Vector((math.cos(a) * rr, math.sin(a) * rr, WALL - .22 + v * .26))
b = surface('band', band_fn, 96, 1, band)
for l in b.data.uv_layers[0].data: l.uv = (l.uv[0] * 3, l.uv[1] / 2)
print('band uv v range', min(l.uv[1] for l in b.data.uv_layers[0].data), max(l.uv[1] for l in b.data.uv_layers[0].data))
parts.append(b)
# --- ropes: two around the wall, one around the roof
for z, rr in ((WALL * .35, R + .05), (WALL * .7, R + .05)):
    bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=.018, location=(0, 0, z), major_segments=96, minor_segments=6)
    o = bpy.context.active_object; o.data.materials.append(rope); parts.append(o)
# --- roof ropes (crown to eaves) and a patterned band along the roof edge
for k in range(8):
    ang = k / 8 * 2 * math.pi + .2; pts = []
    for t in (0, .25, .5, .75, 1):
        rr = R + .14 + (CROWN_R + .08 - R - .14) * t; z = WALL + ROOF * (t ** .85) + .07 + math.sin(t * math.pi) * .03
        pts.append(Vector((math.cos(ang) * rr, math.sin(ang) * rr, z)))
    for j in range(4): parts.append(cyl_between(pts[j], pts[j + 1], .016, rope, 'roofrope'))
def edge_fn(u, v):
    a = u * 2 * math.pi; t = v * .12; rr = R + .13 + (CROWN_R - R) * t
    return Vector((math.cos(a) * rr, math.sin(a) * rr, WALL + ROOF * (t ** .85) + .06))
eb = surface('roof_band', edge_fn, 128, 1, band)
for l in eb.data.uv_layers[0].data: l.uv = (l.uv[0] * 4, l.uv[1] / 2)
parts.append(eb)
# --- door: frame + two painted leaves
dc = Vector((math.cos(DOOR_A) * (R + .04), math.sin(DOOR_A) * (R + .04), 0)); tang = Vector((-math.sin(DOOR_A), math.cos(DOOR_A), 0)); nrm = Vector((math.cos(DOOR_A), math.sin(DOOR_A), 0))
DW = math.sin(DOOR_W / 2) * R * .95
for s in (-1, 1): parts.append(cyl_between(dc + tang * DW * s, dc + tang * DW * s + Vector((0, 0, WALL + .05)), .045, woodRed, 'doorpost'))
parts.append(cyl_between(dc - tang * DW + Vector((0, 0, WALL)), dc + tang * DW + Vector((0, 0, WALL)), .05, woodRed, 'lintel'))
for s in (-1, 1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=dc + tang * DW * .5 * s + Vector((0, 0, WALL / 2)) + nrm * .01)
    o = bpy.context.active_object; o.scale = (.04, DW * .96, WALL * .98); o.rotation_euler = (0, 0, DOOR_A); o.data.materials.append(woodRed); parts.append(o)

# weathering in a colour attribute (exported to glTF; Unity multiplies it into the albedo)
import random
random.seed(5)
for o in parts:
    if o.type != 'MESH': continue
    me = o.data; ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER'); mw = o.matrix_world
    panel = {}
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co; a = math.atan2(v.y, v.x); key = int((a + math.pi) / (2 * math.pi) * 9)
            tint = panel.setdefault(key, random.uniform(.9, 1.04))
            dirt = .45 + .55 * min(1, max(0, (v.z - .02) / .7)) ** .7           # dust splashed on the lower wall
            smoke = 1 - .35 * max(0, min(1, (v.z - (WALL + ROOF * .7)) / (ROOF * .3)))   # soot around the smoke hole
            k = tint * dirt * smoke; ca.data[li].color = (k, k * .98, k * .95, 1)
    for mm in me.materials:
        if mm and mm.use_nodes and 'qqcol' not in mm:
            mm['qqcol'] = 1; nt = mm.node_tree; b0 = nt.nodes['Principled BSDF']; src = b0.inputs['Base Color'].links[0].from_socket if b0.inputs['Base Color'].links else None
            cn = nt.nodes.new('ShaderNodeVertexColor'); cn.layer_name = 'Col'; mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1
            if src: nt.links.new(src, mx.inputs[6])
            else: mx.inputs[6].default_value = b0.inputs['Base Color'].default_value
            nt.links.new(cn.outputs['Color'], mx.inputs[7]); nt.links.new(mx.outputs[2], b0.inputs['Base Color'])
# join into one mesh (one draw per material in Unity), apply transforms
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); yurt = bpy.context.active_object; yurt.name = 'Yurt'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
print('YURT tris', sum(len(p.vertices) - 2 for p in yurt.data.polygons))

# --- export GLB for Unity (glTFast)
try:
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_vertex_color='ACTIVE')
except TypeError:
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_colors=True)

# --- preview render: ground, sun, sky, camera at eye level
bpy.ops.mesh.primitive_plane_add(size=40); g = bpy.context.active_object; g.data.materials.append(mat('ground', (.45, .36, .26), .95, T('brown_mud_dry_diff.jpg'), 8, T('brown_mud_dry_nor.jpg')))
for p in g.data.uv_layers[0].data: p.uv = (p.uv[0] * 1, p.uv[1] * 1)
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(52), 0, math.radians(-35))); bpy.context.active_object.data.energy = 2.6; bpy.context.active_object.data.angle = math.radians(3)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; sky = w.node_tree.nodes.new('ShaderNodeTexSky')
try: sky.sky_type = 'NISHITA'
except Exception: pass
w.node_tree.links.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = .35
bpy.ops.object.camera_add(location=(6.2, -7.4, 1.9)); cam = bpy.context.active_object; sc.camera = cam
d = Vector((0, 0, 1.6)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 40
sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.render.filepath = PNG; sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -.9; sc.view_settings.look = 'AgX - Medium High Contrast' if 'AgX - Medium High Contrast' in [i.identifier for i in sc.view_settings.bl_rna.properties['look'].enum_items] else 'None'
bpy.ops.render.render(write_still=True)
print('YURT DONE')
