# render helpers for the wolf-soldier build (Workbench, textured, studio light)
import bpy, math
from mathutils import Vector
def setup(res=(900, 1200)):
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_shadows = False; sh.show_cavity = True; sh.cavity_type = 'BOTH'
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.film_transparent = False
    sc.world = sc.world or bpy.data.worlds.new('W'); sc.display_settings.display_device = 'sRGB'
    sh.background_type = 'VIEWPORT'; sh.background_color = (0.55, 0.58, 0.62)
def fix_tex():
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for l in n.outputs[0].links): m.node_tree.nodes.active = n
def shot(path, target, dist, az, el=0.0, lens=50, ortho=None):
    sc = bpy.context.scene; cam = bpy.data.objects.get('RCam')
    if not cam:
        cam = bpy.data.objects.new('RCam', bpy.data.cameras.new('RCam')); sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = lens
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else: cam.data.type = 'PERSP'
    t = Vector(target); a = math.radians(az); e = math.radians(el)
    # az 0 = front (model faces -Y)
    cam.location = t + Vector((math.sin(a) * math.cos(e) * dist, -math.cos(a) * math.cos(e) * dist, math.sin(e) * dist))
    d = t - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    fix_tex(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
