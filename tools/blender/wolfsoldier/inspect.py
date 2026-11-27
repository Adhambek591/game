import bpy, sys, os
from mathutils import Vector
M = r"F:\qirq-qiz\.claude\worktrees\agent-aab6a8ebbe70018d1\public\assets\models"
bpy.ops.wm.read_factory_settings(use_empty=True)
for f in ['R_askar', 'R_bori']:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(M, f + '.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    print('=====', f)
    for o in new:
        print(o.name, o.type, 'parent', o.parent.name if o.parent else None, 'loc', tuple(round(x,3) for x in o.location), 'rot', tuple(round(x,3) for x in o.rotation_euler), 'scale', tuple(round(x,3) for x in o.scale))
        if o.type == 'ARMATURE':
            for b in o.data.bones:
                hw = o.matrix_world @ b.head_local; tw = o.matrix_world @ b.tail_local
                print('  bone', b.name, 'parent', b.parent.name if b.parent else None, 'head', tuple(round(x,3) for x in hw), 'tail', tuple(round(x,3) for x in tw))
        if o.type == 'MESH':
            me = o.data
            print('  verts', len(me.vertices), 'faces', len(me.polygons), 'mats', [m.name for m in me.materials], 'uv', [u.name for u in me.uv_layers])
            bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
            print('  bbox min', tuple(round(min(v[i] for v in bb),3) for i in range(3)), 'max', tuple(round(max(v[i] for v in bb),3) for i in range(3)))
            for m in me.materials:
                for n in m.node_tree.nodes:
                    if n.type == 'TEX_IMAGE': print('   tex', n.image.name, n.image.size[:], [l.to_node.name + ':' + l.to_socket.name for l in n.outputs[0].links])
            # vertex count by dominant group
            gn = {g.index: g.name for g in o.vertex_groups}; cnt = {}
            for v in me.vertices:
                if not v.groups: continue
                g = max(v.groups, key=lambda g: g.weight); cnt[gn[g.group]] = cnt.get(gn[g.group], 0) + 1
            print('  dominant', sorted(cnt.items(), key=lambda x: -x[1]))
            for gname in ['Head', 'head_end', 'headfront', 'neck']:
                vs = [o.matrix_world @ v.co for v in me.vertices if v.groups and gn[max(v.groups, key=lambda g: g.weight).group] == gname]
                if vs: print('  ', gname, 'n', len(vs), 'zmin', round(min(v.z for v in vs),3), 'zmax', round(max(v.z for v in vs),3), 'ymin', round(min(v.y for v in vs),3), 'ymax', round(max(v.y for v in vs),3), 'xmin', round(min(v.x for v in vs),3), 'xmax', round(max(v.x for v in vs),3))
    for o in new: o.location.x += 0
    # move aside
    for o in new:
        if o.parent is None: o.name = f + '_' + o.name
