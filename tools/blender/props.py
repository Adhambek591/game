# Sarkop props for the Unity port, built procedurally in Blender and exported one GLB each:
#   arava (two-wheeled steppe cart, spoked wheels, slatted bed, shafts), banner (pole with a tasselled cloth flag),
#   campfire (stone ring, crossed logs, embers), fence (wooden palisade segment with lashings), tower (tapered wooden watch tower
#   on a rammed-earth base with a railed platform and felt roof).
# Run: blender -b --python props.py -- <outdir> <texdir>
import bpy, bmesh, math, sys, os, random
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]; OUT, TEX = argv[0], argv[1]
random.seed(4)
T = lambda n: os.path.join(TEX, n)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=.8, tex=None, scale=1.0, normal=None, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if tex and os.path.exists(tex):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(tex)
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale); tc = nt.nodes.new('ShaderNodeTexCoord')
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
        mix.inputs[6].default_value = (*color, 1); nt.links.new(t.outputs['Color'], mix.inputs[7]); nt.links.new(mix.outputs[2], b.inputs['Base Color'])
        if normal and os.path.exists(normal):
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(normal); n.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(mp.outputs['Vector'], n.inputs['Vector']); nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.2
            nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

def mats():
    return dict(
        wood=mat('wood', (.45, .3, .18), .7, T('brown_planks_09_diff.jpg'), 1.5, T('brown_planks_09_nor.jpg')),
        dark=mat('wood_dark', (.22, .15, .1), .75, T('brown_planks_09_diff.jpg'), 1.5, T('brown_planks_09_nor.jpg')),
        red=mat('wood_red', (.36, .07, .04), .5),
        iron=mat('iron', (.25, .24, .23), .45, metal=.9),
        rope=mat('rope', (.36, .28, .18), .9),
        stone=mat('stone', (.5, .47, .43), .9, T('aerial_ground_rock_diff.jpg'), 1, T('aerial_ground_rock_nor.jpg')),
        earth=mat('earth', (.62, .5, .38), .95, T('clay_block_wall_diff.jpg'), 1, T('clay_block_wall_nor.jpg')),
        cloth=mat('cloth', (.55, .06, .05), .85),
        felt=mat('felt', (.66, .6, .52), 1, T('curly_teddy_natural_diff.jpg'), 3, T('curly_teddy_natural_nor.jpg')),
        ember=mat('ember', (.08, .03, .01), .9))

def cyl(a, b, r, m, verts=8):
    d = b - a; bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y'); o.data.materials.append(m)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False); return o

def box(c, s, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c); o = bpy.context.active_object; o.scale = s; o.rotation_euler = rot; o.data.materials.append(m)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.cube_project(cube_size=1); bpy.ops.object.mode_set(mode='OBJECT')
    return o

def finish(name):
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); o = bpy.context.active_object; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for p in o.data.polygons: p.use_smooth = False
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True, export_apply=True)
    print('PROP', name, tris)

# ---------- arava: two-wheeled cart ----------
reset(); M = mats()
for side in (-1, 1):
    c = Vector((side * .95, 0, .72))
    bpy.ops.mesh.primitive_torus_add(major_radius=.68, minor_radius=.05, location=c, rotation=(0, math.pi / 2, 0), major_segments=32, minor_segments=6)
    bpy.context.active_object.data.materials.append(M['dark'])
    cyl(c - Vector((.09, 0, 0)), c + Vector((.09, 0, 0)), .1, M['dark'], 10)                       # hub
    for k in range(12):
        a = k / 12 * 2 * math.pi; cyl(c, c + Vector((0, math.cos(a) * .66, math.sin(a) * .66)), .022, M['wood'], 5)
cyl(Vector((-1.05, 0, .72)), Vector((1.05, 0, .72)), .045, M['dark'])                                  # axle
box((0, 0, .95), (1.5, 1.9, .08), M['wood'])                                                          # bed
for side in (-1, 1):
    box((side * .74, 0, 1.18), (.06, 1.9, .4), M['wood'])                                             # side rails
    for k in range(6): cyl(Vector((side * .74, -.9 + k * .36, .95)), Vector((side * .74, -.9 + k * .36, 1.45)), .025, M['dark'], 5)
    cyl(Vector((side * .5, .9, .95)), Vector((side * .3, 3.0, .7)), .04, M['wood'], 6)                  # shafts
box((0, -.93, 1.15), (1.5, .06, .36), M['wood'])
for k in range(3): bpy.ops.mesh.primitive_uv_sphere_add(radius=.28, location=(-.35 + k * .35, .2 + (k % 2) * .4, 1.2), segments=10, ring_count=6); bpy.context.active_object.scale = (1, 1.3, .7); bpy.context.active_object.data.materials.append(M['felt'])   # sacks
finish('E_arava')

# ---------- banner ----------
reset(); M = mats()
cyl(Vector((0, 0, 0)), Vector((0, 0, 4.2)), .05, M['dark'], 8)
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=.08, depth=.35, location=(0, 0, 4.35)); bpy.context.active_object.data.materials.append(M['iron'])
cyl(Vector((0, 0, 3.9)), Vector((1.3, 0, 3.9)), .025, M['dark'], 6)
bm = bmesh.new(); W, H, NU, NV = 1.25, 1.8, 14, 10; vs = []
for j in range(NV + 1):
    row = []
    for i in range(NU + 1):
        u, v = i / NU, j / NV; x = .03 + u * W; z = 3.88 - v * H * (1 - .25 * u * u) ; y = math.sin(u * 5 + v * 2) * .08 * u
        row.append(bm.verts.new((x, y, z)))
    vs.append(row)
uvl = bm.loops.layers.uv.new('UVMap')
for j in range(NV):
    for i in range(NU):
        f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
        for l, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): l[uvl].uv = (a / NU, 1 - b / NV)
me = bpy.data.meshes.new('flag'); bm.to_mesh(me); fo = bpy.data.objects.new('flag', me); bpy.context.scene.collection.objects.link(fo)
img = bpy.data.images.new('flag_tex', 128, 256); px = []
for y in range(256):
    for x in range(128):
        border = x < 10 or x > 117 or y < 10 or y > 245
        tri = abs(x - 64) < (y - 100) * .45 and 100 < y < 190                     # gold point-DOWN triangle (the amulet sign; pixel rows run bottom-up)
        c = (.85, .62, .18) if tri else ((.08, .08, .3) if border else (.12, .2, .55))
        px += [*c, 1]
img.pixels = px; img.pack()
fm = mat('flag', (1, 1, 1), .85); t = fm.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img; fm.node_tree.links.new(t.outputs['Color'], fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
fm.use_backface_culling = False; fo.data.materials.append(fm)
for k in range(5): cyl(Vector((.15 + k * .26, 0, 3.88 - 1.8 * (1 - .25 * ((.15 + k * .26) / 1.25) ** 2))), Vector((.15 + k * .26, 0, 3.88 - 1.8 * (1 - .25 * ((.15 + k * .26) / 1.25) ** 2) - .25)), .015, M['cloth'], 4)
finish('E_banner')

# ---------- campfire ----------
reset(); M = mats()
for k in range(11):
    a = k / 11 * 2 * math.pi + random.uniform(-.1, .1)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=random.uniform(.13, .19), location=(math.cos(a) * .62, math.sin(a) * .62, .08))
    o = bpy.context.active_object; o.scale = (1.2, 1, .75); o.rotation_euler = (random.random(), random.random(), random.random()); o.data.materials.append(M['stone'])
for k in range(5):
    a = k / 5 * 2 * math.pi; cyl(Vector((math.cos(a) * .48, math.sin(a) * .48, .05)), Vector((math.cos(a) * .05, math.sin(a) * .05, .45)), .055, M['dark'], 7)
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.45, depth=.04, location=(0, 0, .02)); bpy.context.active_object.data.materials.append(M['ember'])
finish('E_campfire')

# ---------- fence (palisade segment, 4 m) ----------
reset(); M = mats()
for k in range(16):
    x = -2 + k * .26 + random.uniform(-.03, .03); h = random.uniform(1.9, 2.3)
    cyl(Vector((x, random.uniform(-.03, .03), -.2)), Vector((x, 0, h)), random.uniform(.07, .1), M['wood'], 7)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=.09, depth=.25, location=(x, 0, h + .12)); bpy.context.active_object.data.materials.append(M['wood'])
for z in (.6, 1.5): cyl(Vector((-2.1, .12, z)), Vector((2.1, .12, z)), .05, M['dark'], 6)
for k in range(8): bpy.ops.mesh.primitive_torus_add(major_radius=.11, minor_radius=.015, location=(-1.8 + k * .52, .08, 1.5), rotation=(math.pi / 2, 0, 0), major_segments=10, minor_segments=4); bpy.context.active_object.data.materials.append(M['rope'])
finish('E_fence')

# ---------- watch tower ----------
reset(); M = mats()
box((0, 0, .5), (3.2, 3.2, 1.0), M['earth'])                                                   # rammed-earth base
for sx in (-1, 1):
    for sy in (-1, 1): cyl(Vector((sx * 1.3, sy * 1.3, 1)), Vector((sx * .95, sy * .95, 6.2)), .12, M['wood'], 8)   # tapered legs
for z in (2.6, 4.3):
    s = 1.3 - (z - 1) / 5.2 * .35
    for a, b in (((-s, -s), (s, -s)), ((s, -s), (s, s)), ((s, s), (-s, s)), ((-s, s), (-s, -s))):
        cyl(Vector((a[0], a[1], z)), Vector((b[0], b[1], z)), .07, M['dark'], 6)
    for a, b in (((-s, -s), (s, s)), ((s, -s), (-s, s))): cyl(Vector((a[0], a[1], z - .8)), Vector((b[0], b[1], z + .8)), .05, M['dark'], 6)
box((0, 0, 6.25), (2.6, 2.6, .12), M['wood'])                                                     # platform
for k in range(16):
    a = k / 16; p = [(-1.25 + a * 2.5, -1.25), (1.25, -1.25 + a * 2.5), (1.25 - a * 2.5, 1.25), (-1.25, 1.25 - a * 2.5)][k // 4] if False else None
for side in range(4):
    for k in range(7):
        t = -1.2 + k * .4; x, y = [(t, -1.25), (1.25, t), (t, 1.25), (-1.25, t)][side]
        cyl(Vector((x, y, 6.3)), Vector((x, y, 7.2)), .035, M['dark'], 5)
for sx in (-1, 1):
    for sy in (-1, 1): cyl(Vector((sx * 1.2, sy * 1.2, 6.3)), Vector((sx * 1.2, sy * 1.2, 8.0)), .06, M['wood'], 6)
bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=2.1, depth=1.3, location=(0, 0, 8.6)); bpy.context.active_object.data.materials.append(M['felt'])
cyl(Vector((0, 0, 9.2)), Vector((0, 0, 10.4)), .04, M['dark'], 6)
for k in range(9): cyl(Vector((1.0, -1.35, 1.0 + k * .6)), Vector((1.35, -1.35, 1.0 + k * .6)), .03, M['wood'], 5)      # ladder rungs
cyl(Vector((1.0, -1.35, 1.0)), Vector((1.0, -1.35, 6.3)), .045, M['wood'], 6); cyl(Vector((1.35, -1.35, 1.0)), Vector((1.35, -1.35, 6.3)), .045, M['wood'], 6)
finish('E_tower')
print('PROPS DONE')
