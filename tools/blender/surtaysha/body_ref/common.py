# Shared helpers for the HF3D -> MetaHuman A-pose re-pose scripts (Blender 5.1, headless).
import bpy, bmesh, ctypes, os, numpy as np
from mathutils import Vector, Matrix

# Character selection: QQ_CHAR=surtaysha (default) or guloyim.
CHAR = os.environ.get("QQ_CHAR", "surtaysha")
_HERE = os.path.dirname(os.path.abspath(__file__))
_BUILDS = r"F:\qirq-qiz-unity\Builds"
if CHAR == "guloyim":
    BODY = r"F:\qirq-qiz\tools\blender\guloyim_costume\body"
    CFG = dict(HF_SRC=os.path.join(BODY, "SK_Guloyim_HF3D.glb"), MH_FBX=os.path.join(BODY, "SK_Guloyim_Final_FullBody.fbx"),
               OUT_APOSE=os.path.join(BODY, "SK_Guloyim_HF3D_apose.fbx"), OUT_WRAP=os.path.join(BODY, "SK_Guloyim_MHwrap.fbx"),
               APOSE_NAME="SK_Guloyim_HF3D_apose", WRAP_NAME="SK_Guloyim_MHwrap", WORK=os.path.join(_HERE, "work_g"), HEIGHT=1.71, HAIR=True,
               SHEET_APOSE=os.path.join(_BUILDS, "guloyim_apose_check.png"), SHEET_WRAP=os.path.join(_BUILDS, "guloyim_wrap_check.png"))
else:
    BODY = r"F:\qirq-qiz\tools\blender\surtaysha\body"
    CFG = dict(HF_SRC=os.path.join(BODY, "SK_Surtaysha_HF3D.fbx"), MH_FBX=os.path.join(BODY, "SK_Surtaysha_MHBody.fbx"),
               OUT_APOSE=os.path.join(BODY, "SK_Surtaysha_HF3D_apose.fbx"), OUT_WRAP=os.path.join(BODY, "SK_Surtaysha_MHwrap.fbx"),
               APOSE_NAME="SK_Surtaysha_HF3D_apose", WRAP_NAME="SK_Surtaysha_MHwrap", WORK=os.path.join(_HERE, "work"), HEIGHT=1.85, HAIR=False,
               SHEET_APOSE=os.path.join(_BUILDS, "surtaysha_apose_check.png"), SHEET_WRAP=os.path.join(_BUILDS, "surtaysha_wrap_check.png"))
HF_FBX, MH_FBX, OUT_FBX, WORK, HEIGHT = CFG["HF_SRC"], CFG["MH_FBX"], CFG["OUT_APOSE"], CFG["WORK"], CFG["HEIGHT"]
os.makedirs(WORK, exist_ok=True)

def low_priority():
    try:
        k = ctypes.windll.kernel32
        k.SetPriorityClass(k.GetCurrentProcess(), 0x00004000)  # BELOW_NORMAL_PRIORITY_CLASS
    except Exception as e:
        print("priority:", e)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    return [o for o in bpy.data.objects if o not in before]

def bake_world(ob):
    """Unparent, bake the world matrix into the mesh data (metres, +Z up, facing -Y)."""
    mw = ob.matrix_world.copy()
    ob.parent = None
    for m in list(ob.modifiers):
        ob.modifiers.remove(m)
    ob.data.transform(mw)
    ob.matrix_world = Matrix.Identity(4)
    ob.data.update()
    return ob

def load_hf(path=HF_FBX):
    ob = [o for o in import_fbx(path) if o.type == 'MESH'][0]
    bake_world(ob)
    ob.name = "HF"
    return ob

def load_mh():
    """Returns (mesh object in world metres, {bone: head world pos}, {bone: parent name}, armature)."""
    objs = import_fbx(MH_FBX)
    arm = [o for o in objs if o.type == 'ARMATURE'][0]
    me = [o for o in objs if o.type == 'MESH'][0]
    bpy.context.view_layer.update()
    joints = {b.name: np.array(arm.matrix_world @ b.head_local) for b in arm.data.bones}
    parents = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
    return me, joints, parents, arm

def co(ob):
    a = np.empty(len(ob.data.vertices) * 3, dtype=np.float64)
    ob.data.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)

def set_co(ob, a):
    ob.data.vertices.foreach_set("co", np.asarray(a, dtype=np.float64).ravel())
    ob.data.update()

def mesh_stats(ob, label=""):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    nonman = sum(1 for e in bm.edges if not e.is_manifold)
    bnd = sum(1 for e in bm.edges if e.is_boundary)
    wire = sum(1 for e in bm.edges if e.is_wire)
    loose = sum(1 for v in bm.verts if not v.link_edges)
    # connected components
    seen = set(); comps = []
    for v in bm.verts:
        if v.index in seen: continue
        stack = [v]; seen.add(v.index); n = 0
        while stack:
            x = stack.pop(); n += 1
            for e in x.link_edges:
                o = e.other_vert(x)
                if o.index not in seen:
                    seen.add(o.index); stack.append(o)
        comps.append(n)
    comps.sort(reverse=True)
    vol = bm.calc_volume(signed=True)
    c = np.array([v.co for v in bm.verts])
    print("[stats %s] verts %d faces %d  nonmanifold %d boundary %d wire %d loose %d  comps %d %s  vol %.4f m3  min %s max %s" % (
        label, len(bm.verts), len(bm.faces), nonman, bnd, wire, loose, len(comps), comps[:6], vol, c.min(0).round(4), c.max(0).round(4)))
    bm.free()
    return dict(nonman=nonman, boundary=bnd, comps=comps)

def mat(name, rgba):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba
    return m

def setup_render(w, h):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = True; sh.cavity_type = 'BOTH'
    sh.show_shadows = False; sh.show_xray = False
    if sc.world is None:
        sc.world = bpy.data.worlds.new("W")
    sc.world.color = (0.62, 0.62, 0.62)
    sc.view_settings.view_transform = 'Standard'
    return sc

def ortho_cam(name, loc, look, scale, up=(0, 0, 1)):
    cd = bpy.data.cameras.new(name); cd.type = 'ORTHO'; cd.ortho_scale = scale
    cd.clip_start = 0.01; cd.clip_end = 100
    c = bpy.data.objects.new(name, cd); bpy.context.scene.collection.objects.link(c)
    loc = Vector(loc); look = Vector(look)
    f = (look - loc).normalized()
    c.matrix_world = Matrix.Translation(loc) @ f.to_track_quat('-Z', 'Y').to_matrix().to_4x4()
    return c

def render(cam, path):
    sc = bpy.context.scene
    sc.camera = cam; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def close_holes(bm):
    """Trace every boundary loop and close it with one face (caller triangulates). Vertices where several
    boundary loops meet are deleted first so every loop is simple. Returns the new faces."""
    out = []
    for _ in range(6):
        bad = [v for v in bm.verts if not v.link_faces or sum(1 for e in v.link_edges if e.is_boundary) > 2]
        wire = [e for e in bm.edges if e.is_wire]
        if not bad and not wire: break
        if wire: bmesh.ops.delete(bm, geom=wire, context='EDGES')
        bad = [v for v in bad if v.is_valid]
        if bad: bmesh.ops.delete(bm, geom=bad, context='VERTS')
    be = {e for e in bm.edges if e.is_boundary}
    used = set()
    for e in list(be):
        if e in used: continue
        loop = [e.verts[0]]; cur = e.verts[1]; used.add(e); ok = True
        while cur != loop[0]:
            loop.append(cur)
            nxt = [x for x in cur.link_edges if x in be and x not in used]
            if not nxt: ok = False; break
            used.add(nxt[0]); cur = nxt[0].other_vert(cur)
        if ok and len(loop) >= 3:
            try: out.append(bm.faces.new(loop))
            except ValueError as ex: print("close_holes:", ex)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return [f for f in out if f.is_valid]

def fix_nonmanifold(bm):
    """Remove degenerate faces and faces hanging on edges shared by more than two faces, then close holes."""
    bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges)
    for _ in range(4):
        multi = [e for e in bm.edges if len(e.link_faces) > 2]
        if not multi: break
        fs = set()
        for e in multi:
            for f in sorted(e.link_faces, key=lambda f: f.calc_area())[:len(e.link_faces) - 2]:
                fs.add(f)
        bmesh.ops.delete(bm, geom=list(fs), context='FACES')
    new = close_holes(bm)
    if new: bmesh.ops.triangulate(bm, faces=new)
    print("fix_nonmanifold: left", sum(1 for e in bm.edges if not e.is_manifold), "non-manifold edges")


def hair_tris(ob):
    """bool per loop triangle: True where the face carries the 'hair' attribute (set by stage1_guloyim)."""
    me = ob.data; me.calc_loop_triangles()
    n = len(me.loop_triangles)
    at = me.attributes.get("hair")
    if at is None: return np.zeros(n, bool)
    pv = np.zeros(len(me.polygons), dtype=np.int32); at.data.foreach_get("value", pv)
    pi = np.empty(n, dtype=np.int32); me.loop_triangles.foreach_get("polygon_index", pi)
    return pv[pi] > 0

def sample_surface(ob, spacing=0.003, seed=1, skip_hair=False):
    """Dense, even point cloud on the mesh surface (vertices + random points on the triangles), so slicing
    does not depend on the mesh resolution. skip_hair leaves out the faces flagged as hair."""
    me = ob.data
    me.calc_loop_triangles()
    n = len(me.loop_triangles)
    tri = np.empty(n * 3, dtype=np.int32); me.loop_triangles.foreach_get("vertices", tri); tri = tri.reshape(-1, 3)
    V = co(ob)
    if skip_hair:
        tri = tri[~hair_tris(ob)]; n = len(tri)
    a, b, c_ = V[tri[:, 0]], V[tri[:, 1]], V[tri[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(b - a, c_ - a), axis=1)
    rng = np.random.default_rng(seed)
    cnt = rng.poisson(area / (spacing * spacing))
    idx = np.repeat(np.arange(n), cnt)
    r1 = np.sqrt(rng.random(len(idx))); r2 = rng.random(len(idx))
    P = (1 - r1)[:, None] * a[idx] + (r1 * (1 - r2))[:, None] * b[idx] + (r1 * r2)[:, None] * c_[idx]
    return np.vstack([V[np.unique(tri)], P])
