import bpy, os, sys
sys.path.insert(0, os.path.dirname(__file__)); import rlib
M = r"F:\qirq-qiz\.claude\worktrees\agent-aab6a8ebbe70018d1\public\assets\models"; O = os.path.join(os.path.dirname(__file__), 'src')
os.makedirs(O, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); rlib.setup((700, 900))
bpy.ops.import_scene.gltf(filepath=os.path.join(M, 'R_askar.glb'))
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
a = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(M, 'R_bori.glb'))
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
for o in bpy.data.objects:
    if o not in a and o.parent is None: o.location.x = 1.6
rlib.shot(os.path.join(O, 'both_front.png'), (0.8, 0, 1.0), 5.5, 0, 5)
rlib.shot(os.path.join(O, 'both_side.png'), (0.8, 0, 1.0), 6.5, 90, 5)
rlib.shot(os.path.join(O, 'askar_head.png'), (0, 0, 1.55), 1.1, 30, 5)
rlib.shot(os.path.join(O, 'bori_head.png'), (1.6, -0.15, 1.8), 1.5, 30, 5)
rlib.shot(os.path.join(O, 'bori_head_side.png'), (1.6, -0.15, 1.8), 1.5, 90, 5)
