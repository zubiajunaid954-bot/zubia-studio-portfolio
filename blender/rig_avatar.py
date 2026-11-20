# Module 2, step 1: skeleton, skin weights and the theme-tintable hoodie.
#   in : blender/avatar_static.blend (output of optimize_avatar.py)
#   out: blender/avatar_rigged.blend
# Run:  blender -b --factory-startup -P blender/rig_avatar.py
#
# Joint positions were measured from horizontal slices of the mesh (analyze.py).
# Blender axes here: +Z up, the character faces -Y, her left side is +X.
import bpy, os, colorsys
import numpy as np
from mathutils import Vector

here = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(here, 'avatar_static.blend'))
body = bpy.data.objects['Zubia_Avatar']

# ---------------------------------------------------------------- skeleton
BONES = [
    # name, head, tail, parent
    ('hips', (0, 0.0, 0.93), (0, 0.0, 1.05), None),
    ('spine', (0, 0.0, 1.05), (0, 0.0, 1.22), 'hips'),
    ('chest', (0, 0.0, 1.22), (0, 0.0, 1.41), 'spine'),
    ('neck', (0, -0.01, 1.41), (0, -0.01, 1.56), 'chest'),
    ('head', (0, -0.01, 1.56), (0, -0.01, 1.88), 'neck'),
]
for s, sx in (('L', 1), ('R', -1)):
    BONES += [
        (f'shoulder.{s}', (0.04 * sx, 0.0, 1.39), (0.16 * sx, 0.0, 1.43), 'chest'),
        (f'upper_arm.{s}', (0.16 * sx, 0.0, 1.43), (0.31 * sx, 0.0, 1.235), f'shoulder.{s}'),
        (f'forearm.{s}', (0.31 * sx, 0.0, 1.235), (0.43 * sx, -0.01, 1.075), f'upper_arm.{s}'),
        (f'hand.{s}', (0.43 * sx, -0.01, 1.075), (0.545 * sx, -0.04, 0.975), f'forearm.{s}'),
        (f'thigh.{s}', (0.10 * sx, 0.0, 0.88), (0.12 * sx, -0.005, 0.48), 'hips'),
        (f'shin.{s}', (0.12 * sx, -0.005, 0.48), (0.13 * sx, 0.02, 0.09), f'thigh.{s}'),
        (f'foot.{s}', (0.13 * sx, 0.02, 0.09), (0.14 * sx, -0.14, 0.025), f'shin.{s}'),
    ]

arm_data = bpy.data.armatures.new('Zubia_Rig')
rig = bpy.data.objects.new('Zubia_Rig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, h, t, parent in BONES:
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = Vector(h), Vector(t)
    b.roll = 0
    if parent:
        b.parent = arm_data.edit_bones[parent]
        b.use_connect = (Vector(h) - arm_data.edit_bones[parent].tail).length < 1e-4 and not name.startswith(('shoulder', 'thigh'))
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- skin weights
# Blender's automatic (heat) weighting fails on this AI-generated mesh, so the weights are
# computed here: every vertex is first assigned to a body region (left/right arm, left/right
# leg, torso+head) from the measured silhouette, then weighted between the bones allowed in
# that region by inverse distance to each bone segment. That keeps e.g. the torso's side from
# following the arm, while joints still blend smoothly.
names = [b[0] for b in BONES]
heads = np.array([b[1] for b in BONES], dtype=np.float64)
tails = np.array([b[2] for b in BONES], dtype=np.float64)
co = np.array([v.co[:] for v in body.data.vertices], dtype=np.float64)
seg = tails - heads
seglen2 = (seg ** 2).sum(1)
t = np.clip(((co[:, None, :] - heads[None]) * seg[None]).sum(2) / seglen2[None], 0, 1)
closest = heads[None] + t[..., None] * seg[None]
dist = np.sqrt(((co[:, None, :] - closest) ** 2).sum(2))  # (verts, bones)

idx = {n: i for i, n in enumerate(names)}
x, z = co[:, 0], co[:, 2]
ax = np.abs(x)
# below z=1.0 only the hands stick out that far; the tunic hem must stay with the torso
torso_half = np.where(z < 1.0, 0.30, np.where(z < 1.18, 0.215, 0.168))
is_arm = (z > 0.93) & (z < 1.34) & (ax > torso_half)
is_leg = (z < 0.79) & (ax > 0.015)

allowed = np.zeros_like(dist, dtype=bool)
for side, sgn in (('L', 1), ('R', -1)):
    m = is_arm & (np.sign(x) == sgn)
    for n in ('chest', f'shoulder.{side}', f'upper_arm.{side}', f'forearm.{side}', f'hand.{side}'):
        allowed[m, idx[n]] = True
    m = is_leg & (np.sign(x) == sgn)
    for n in ('hips', f'thigh.{side}', f'shin.{side}', f'foot.{side}'):
        allowed[m, idx[n]] = True
torso = ~(is_arm | is_leg)
for n in ('hips', 'spine', 'chest'):
    allowed[torso, idx[n]] = True
allowed[torso & (z > 1.33), idx['neck']] = True
allowed[torso & (z > 1.45), idx['head']] = True
for side, sgn in (('L', 1), ('R', -1)):
    side_m = torso & (np.sign(x) == sgn)
    allowed[side_m & (z > 1.27) & (z < 1.5), idx[f'shoulder.{side}']] = True
    allowed[side_m & (z > 1.24) & (z < 1.45) & (ax > 0.13), idx[f'upper_arm.{side}']] = True
    allowed[side_m & (z < 0.95), idx[f'thigh.{side}']] = True

w = np.where(allowed, 1.0 / (dist + 0.012) ** 5, 0.0)
# keep the 3 strongest influences per vertex, then normalise
order = np.argsort(-w, axis=1)
keep = np.zeros_like(w, dtype=bool)
np.put_along_axis(keep, order[:, :3], True, axis=1)
w = np.where(keep, w, 0.0)
w /= w.sum(1, keepdims=True)

groups = [body.vertex_groups.new(name=n) for n in names]
for bi, g in enumerate(groups):
    col = w[:, bi]
    for vi in np.nonzero(col > 0.002)[0]:
        g.add([int(vi)], float(col[vi]), 'REPLACE')

for o in bpy.context.selected_objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=3)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
print('arm verts', int(is_arm.sum()), 'leg verts', int(is_leg.sum()), 'torso verts', int(torso.sum()))
print('unweighted verts', sum(1 for v in body.data.vertices if not v.groups))

# ---------------------------------------------------------------- hoodie split
# Faces whose texture colour is the light, low-saturation grey of the hoodie get their own
# material, so the website can tint it to match the active colour theme.
mat = body.data.materials[0]
img = next(n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and 'base' in n.label.lower() + n.image.name.lower()) \
    if any(n.type == 'TEX_IMAGE' and n.image and 'base' in (n.label + n.image.name).lower() for n in mat.node_tree.nodes) else None
if img is None:
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    img = bsdf.inputs['Base Color'].links[0].from_node.image
W, H = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
uv = body.data.uv_layers.active.data
hood_mat = mat.copy()
hood_mat.name = 'Hoodie_Material'
body.data.materials.append(hood_mat)
count = 0
for poly in body.data.polygons:
    u = sum(uv[li].uv.x for li in poly.loop_indices) / poly.loop_total
    v = sum(uv[li].uv.y for li in poly.loop_indices) / poly.loop_total
    r, g, b, _ = px[min(H - 1, max(0, int(v * H))), min(W - 1, max(0, int(u * W)))]
    h, s, val = colorsys.rgb_to_hsv(r, g, b)
    z = poly.center.z
    if val > 0.42 and s < 0.13 and 0.72 < z < 1.66:
        poly.material_index = 1
        count += 1
print('hoodie faces', count, 'of', len(body.data.polygons))

# ---------------------------------------------------------------- finish
body.parent = rig
mod = body.modifiers.new('Armature', 'ARMATURE')
mod.object = rig
body.matrix_parent_inverse = rig.matrix_world.inverted()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(here, 'avatar_rigged.blend'))
print('saved avatar_rigged.blend')
