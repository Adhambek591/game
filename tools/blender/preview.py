# Line up exported env GLBs on a ground plane and render one Cycles preview. Run: blender -b --python preview.py -- <outdir> <png> <texdir>
import bpy, math, os, sys
from mathutils import Vector
OUT, PNG, TEX = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
lay = [('yurt.glb', (-9, 4, 0), 0), ('yurt_burnt.glb', (-1, 7, 0), 40), ('yurt_frame.glb', (7, 6, 0), 0), ('E_tower.glb', (13, 12, 0), 20),
       ('E_arava.glb', (2, -1, 0), 60), ('E_banner.glb', (-4, -1.5, 0), 0), ('E_campfire.glb', (-1, -3, 0), 0), ('E_fence.glb', (8, -1, 0), -20)]
for f, p, r in lay:
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, f))
    for o in bpy.context.selected_objects:
        if o.parent is None: o.location = p; o.rotation_euler[2] = math.radians(r)
bpy.ops.mesh.primitive_plane_add(size=80); g = bpy.context.active_object
m = bpy.data.materials.new('g'); m.use_nodes = True; nt = m.node_tree; t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TEX, 'brown_mud_dry_diff.jpg'))
mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (14, 14, 14); tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color']); g.data.materials.append(m)
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(55), 0, math.radians(-40))); bpy.context.active_object.data.energy = 2.6
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; sky = w.node_tree.nodes.new('ShaderNodeTexSky')
w.node_tree.links.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = .35
bpy.ops.object.camera_add(location=(4, -16, 5.5)); cam = bpy.context.active_object; sc.camera = cam
cam.rotation_euler = (Vector((1, 4, 1.5)) - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 28
sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True; sc.render.resolution_x, sc.render.resolution_y = 1600, 900
sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -.9; sc.render.filepath = PNG; bpy.ops.render.render(write_still=True); print('PREVIEW DONE')
