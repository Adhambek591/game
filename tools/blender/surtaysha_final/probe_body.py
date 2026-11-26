import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=r"F:\qirq-qiz\tools\metahuman\out\gulayim_MHC_gulayim_clean_FullBody.fbx")
arm=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'][0]
print("ARM", arm.name, arm.location, arm.rotation_euler, arm.scale, arm.matrix_world)
mw=arm.matrix_world
for b in ['pelvis','spine_01','spine_03','spine_05','neck_01','head','clavicle_l','upperarm_l','lowerarm_l','hand_l','middle_03_l','thigh_l','calf_l','foot_l','ball_l']:
    pb=arm.data.bones[b]
    print("B %-12s head %s tail %s"%(b, tuple(round(v,3) for v in mw@pb.head_local), tuple(round(v,3) for v in mw@pb.tail_local)))
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.name.endswith('LOD0'):
        import mathutils
        vs=[o.matrix_world@v.co for v in o.data.vertices]
        print("MESH",o.name,o.matrix_world.to_euler(), [round(min(v[i] for v in vs),3) for i in range(3)],[round(max(v[i] for v in vs),3) for i in range(3)])
        # chest width at heights
        for z in [0.3,0.5,0.8,0.95,1.1,1.25,1.35,1.42,1.5,1.6,1.7]:
            sl=[v for v in vs if abs(v.z-z)<0.01 and abs(v.x)<0.25]
            if sl: print(" z",z,"x",round(min(v.x for v in sl),3),round(max(v.x for v in sl),3),"y",round(min(v.y for v in sl),3),round(max(v.y for v in sl),3))
