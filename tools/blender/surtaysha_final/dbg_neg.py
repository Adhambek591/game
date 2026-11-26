import bpy,sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a,b=sys.argv[sys.argv.index('--')+1:][:2]
A=bpy.data.objects[a];B=bpy.data.objects[b];B.data.calc_loop_triangles()
t=BVHTree.FromPolygons([v.co.copy() for v in B.data.vertices],[tuple(x.vertices) for x in B.data.loop_triangles])
def par(p):
    c=0;o=p.copy();d=Vector((0.3,0.5,0.81)).normalized()
    while True:
        h=t.ray_cast(o,d)
        if h[0] is None:break
        c+=1;o=h[0]+d*1e-5
    return c%2
neg=[];ins=0
for v in A.data.vertices:
    q,n,i,d=t.find_nearest(v.co);s=(v.co-q).dot(n)
    if s<0:
        pi=par(v.co);ins+=pi;neg.append((s*1000,d*1000,pi,tuple(round(x,3) for x in v.co)))
neg.sort()
print('NEG',len(neg),'parity-inside',ins)
for x in neg[:25]:print('NEG',x)
