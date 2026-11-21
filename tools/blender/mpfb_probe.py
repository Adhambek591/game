import bpy, addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
bm = HumanService.create_human()
print('PROBE basemesh', bm.name, len(bm.data.vertices))
try:
    HumanService.add_builtin_rig(bm, 'game_engine', import_weights=True)
except Exception as e:
    print('PROBE rig err', e)
arm = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
print('PROBE arm', arm and arm.name, arm and len(arm.data.bones))
if arm: print('PROBE bones', [b.name for b in arm.data.bones if any(k in b.name for k in ('hand', 'thumb', 'index', 'middle', 'ring', 'pinky', 'lowerarm'))])
print('PROBE vgroups', [g.name for g in bm.vertex_groups][:60])
