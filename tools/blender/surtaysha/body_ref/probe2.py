import bpy, sys, os, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
low_priority(); reset()
ob = load_hf()
bm = bmesh.new(); bm.from_mesh(ob.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bm.to_mesh(ob.data); bm.free()
mesh_stats(ob, "merged")
def section(axis, val, lo, hi, other_lo=-9, other_hi=9, zstep=0.01):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    no = [0,0,0]; no[axis] = 1; pc = [0,0,0]; pc[axis] = val
    r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:]+bm.edges[:]+bm.faces[:], plane_co=pc, plane_no=no)
    es = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    out = {}
    for e in es:
        a, b = e.verts[0].co, e.verts[1].co
        z0, z1 = sorted((a.z, b.z))
        k0 = int(np.ceil(max(z0, lo)/zstep)); k1 = int(np.floor(min(z1, hi)/zstep))
        for k in range(k0, k1+1):
            z = k*zstep
            t = 0.5 if abs(b.z-a.z) < 1e-9 else (z-a.z)/(b.z-a.z)
            p = a.lerp(b, t)
            out.setdefault(k, []).append(p)
    bm.free(); return out
s = section(0, 0.0, 1.30, 1.86)
print("--- x=0 section: z : y crossings")
for k in sorted(s, reverse=True):
    ys = sorted(set(round(p.y, 3) for p in s[k]))
    print("z=%.2f" % (k*0.01), ys)
c = co(ob)
print("--- widths per z (x extents of clusters)")
for k in range(184, 0, -2):
    z = k*0.01
    m = np.abs(c[:,2]-z) < 0.004
    xs = np.sort(c[m,0])
    if len(xs) < 2: continue
    cuts = np.where(np.diff(xs) > 0.012)[0]
    segs = np.split(xs, cuts+1)
    print("z=%.2f" % z, " ".join("[%.3f..%.3f]" % (g[0], g[-1]) for g in segs), " y[%.3f..%.3f]" % (c[m,1].min(), c[m,1].max()))
