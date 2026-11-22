import bpy, addon_utils
bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
import bl_ext.user_default.mpfb.services as S, pkgutil
print('SERVICES', [m.name for m in pkgutil.iter_modules(S.__path__)])
print('HS', [x for x in dir(HumanService) if not x.startswith('_')])
print('TS', [x for x in dir(TargetService) if not x.startswith('_')])
bm = HumanService.create_human()
print('BM', bm.name, len(bm.data.vertices), [g.name for g in bm.vertex_groups][:80])
HumanService.add_builtin_rig(bm, 'game_engine', import_weights=True)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
print('BONES', len(arm.data.bones), [b.name for b in arm.data.bones])
print('OBJS', [(o.name,o.type) for o in bpy.context.scene.objects])
print('MACRO', TargetService.get_macro_info_dict() if hasattr(TargetService,'get_macro_info_dict') else '')
