# Builds a burly ~185 cm male proxy from the MetaHuman skeleton/body (pose-scaled), A-pose kept.
# Output: out/proxy.blend (object SUR_BodyProxy + armature SUR_Skel) and out/landmarks.json
import bpy, json, os, math
from mathutils import Vector
OUT=r"F:\qirq-qiz\tools\blender\surtaysha\out"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=r"F:\qirq-qiz\tools\metahuman\out\gulayim_MHC_gulayim_clean_FullBody.fbx")
arm=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'][0]
body=None
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':
        if o.name.endswith('LOD0'): body=o
        else: bpy.data.objects.remove(o)
B=arm.data.bones
for n in ['neck_01','clavicle_l','clavicle_r','thigh_l','thigh_r']:
    B[n].inherit_scale='NONE'
P=arm.pose.bones
def chain_dir(n):
    b=B[n]
    if b.children:
        c=max(b.children,key=lambda c:(c.head_local-b.head_local).length if not any(t in c.name for t in ('twist','corrective','Cor','_in','_out','fwd','bck','latiss','pec','scap')) else 0)
        return (c.head_local-b.head_local).normalized()
    return (b.tail_local-b.head_local).normalized()
def S(n,along,a2,a3=None):
    # along = scale on the chain axis, a2/a3 = across (a3 defaults a2)
    if a3 is None: a3=a2
    b=B[n]; d=chain_dir(n); M=b.matrix_local.to_3x3()
    axes=[M.col[i].normalized() for i in range(3)]
    li=max(range(3),key=lambda i:abs(axes[i].dot(d)))
    sc=[0,0,0]; others=[i for i in range(3) if i!=li]
    sc[li]=along; sc[others[0]]=a2; sc[others[1]]=a3
    P[n].scale=sc
    print('SC',n,'len axis',li,sc)
S('pelvis',1.0,1.04)
S('spine_02',1.0,1.10)
S('spine_03',1.0,1.10)
S('spine_04',1.02,1.04)
S('clavicle_l',1.30,1.0); S('clavicle_r',1.30,1.0)
for s in 'lr':
    S('upperarm_'+s,1.04,1.30); S('lowerarm_'+s,1.0,1.08)
    S('thigh_'+s,1.0,1.20); S('calf_'+s,1.0,1.04)
    S('hand_'+s,1.12,1.12)
S('neck_01',1.0,1.35); S('head',1.04,1.05)
bpy.context.view_layer.update()
# apply armature deform on body
bpy.context.view_layer.objects.active=body
for m in body.modifiers:
    if m.type=='ARMATURE': bpy.ops.object.modifier_apply(modifier=m.name)
# measure height then global scale to 1.85
vs=[body.matrix_world@v.co for v in body.data.vertices]
h=max(v.z for v in vs)
k=1.85/h
print("PROXY height before",h,"k",k)
for v in body.data.vertices:
    w=body.matrix_world@v.co
    v.co=body.matrix_world.inverted()@(w*k)
# landmarks from posed skeleton * k
mw=arm.matrix_world
L={}
for pb in P:
    if pb.name.endswith(('_l','_r')) and any(t in pb.name for t in ('_in_','_out_','bulge','half','side','palm','dip','pip','mcp','Cor','corrective','fwd','bck','slide')): continue
    L[pb.name]={'head':list(mw@pb.head*k),'tail':list(mw@pb.tail*k)}
body.name='SUR_BodyProxy'; body.data.name='SUR_BodyProxy'
# body slices (torso only)
vs=[body.matrix_world@v.co for v in body.data.vertices]
sl={}
sh=L['upperarm_l']['head'][0]
for i in range(0,200):
    z=i*0.01
    pts=[v for v in vs if abs(v.z-z)<0.006]
    if not pts: continue
    lim = sh*0.95 if z>1.25 else (0.27 if z>0.6 else 0.6)
    tor=[v for v in pts if abs(v.x)<lim]
    if not tor: continue
    sl[round(z,2)]={'xmin':min(v.x for v in tor),'xmax':max(v.x for v in tor),'ymin':min(v.y for v in tor),'ymax':max(v.y for v in tor)}
json.dump({'bones':L,'slices':sl,'height':1.85},open(os.path.join(OUT,'landmarks.json'),'w'),indent=1)
mwb=body.matrix_world.copy(); body.parent=None; body.matrix_world=mwb
body.data.transform(mwb); body.matrix_world.identity()
for vg in list(body.vertex_groups): pass
bpy.data.objects.remove(arm)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'proxy.blend'))
for n in ['pelvis','spine_03','spine_05','neck_01','head','clavicle_l','upperarm_l','lowerarm_l','hand_l','thigh_l','calf_l','foot_l','ball_l']:
    print("LM %-11s %s -> %s"%(n,[round(x,3) for x in L[n]['head']],[round(x,3) for x in L[n]['tail']]))
for z in [0.3,0.5,0.8,1.0,1.1,1.2,1.3,1.4,1.45,1.5,1.55,1.6,1.7,1.8]:
    s=sl.get(round(z,2)); print("SL",z,{k:round(v,3) for k,v in s.items()} if s else None)
