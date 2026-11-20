# Module 2, step 2: keyframed animations + GLB export.
#   in : blender/avatar_rigged.blend
#   out: blender/avatar_animated.blend  (submission source file)
#        public/models/avatar.glb        (used by the website)
# Run:  blender -b --factory-startup -P blender/animate_avatar.py
#
# Poses are written as rotations about WORLD axes of the rest pose (X = her left, Y = back,
# Z = up), which keeps the keyframe tables readable:
#   arm raise forward  -> about -X      arm out to the side -> L about -Y, R about +Y
#   arm towards body   -> L about +Y    elbow bend forward  -> about -X
#   head turn left     -> about +Z      nod / lean forward  -> about +X
#   thigh swing forward-> about -X      knee bend           -> about +X
import bpy, os, math
from mathutils import Quaternion, Vector

here = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(here, 'avatar_rigged.blend'))
rig = bpy.data.objects['Zubia_Rig']
scene = bpy.context.scene
scene.render.fps = 30
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
SIDE = {'L': 1, 'R': -1}


def q(bone, rots):
    """rots: list of (world_axis, degrees) applied in order -> local quaternion for the bone."""
    rest = rig.data.bones[bone].matrix_local.to_3x3()
    inv = rest.inverted()
    out = Quaternion()
    for axis, deg in rots:
        out = Quaternion((inv @ axis).normalized(), math.radians(deg)) @ out
    return out


def arm(side, out=0.0, fwd=0.0, elbow=0.0, wrist=0.0, twist=0.0, fore_out=0.0):
    """Arm pose for one side. out: degrees away from the body (negative = towards the body),
    fwd: raise forward, elbow: bend forward, fore_out: swing forearm sideways/up, wrist: bend hand."""
    s = SIDE[side]
    return {
        f'upper_arm.{side}': [(-Y * s, out), (-X, fwd), (Z * s, twist)],
        f'forearm.{side}': [(-X, elbow), (-Y * s, fore_out)],
        f'hand.{side}': [(-X, wrist)],
    }


# relaxed standing pose: arms come down from the A-pose to the sides
def base():
    p = {}
    p.update(arm('L', out=-27, fwd=6, elbow=12, wrist=4))
    p.update(arm('R', out=-27, fwd=6, elbow=12, wrist=4))
    return p


def pose(extra=None, loc=None):
    p = base()
    if extra:
        for k, v in extra.items():
            p[k] = v
    return {'rot': p, 'loc': loc or {}}


ALL = [b.name for b in rig.pose.bones]


def make_action(name, keys, loop=False):
    """keys: list of (frame, pose). Every bone gets a key at every listed frame."""
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = act
    for frame, p in keys:
        for b in ALL:
            pb = rig.pose.bones[b]
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = q(b, p['rot'].get(b, []))
            pb.location = p['loc'].get(b, (0, 0, 0))
            pb.keyframe_insert('rotation_quaternion', frame=frame)
            pb.keyframe_insert('location', frame=frame)
    # smooth ease on every curve
    for fc in act.layers[0].strips[0].channelbags[0].fcurves if hasattr(act, 'layers') and act.layers else act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'
            kp.easing = 'AUTO'
    act.frame_range = (keys[0][0], keys[-1][0])
    if loop:
        act.use_cyclic = True
    # keep it on its own NLA track so the exporter sees every clip
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(keys[0][0]), act)
    track.mute = True
    rig.animation_data.action = None
    return act


def merge(*parts):
    out = {}
    for p in parts:
        out.update(p)
    return out


# ---------------------------------------------------------------- Idle (4 s loop)
def idle(k):
    sway = math.sin(k * math.pi * 2)
    breath = math.sin(k * math.pi * 4)
    return pose(merge(
        {'chest': [(X, -1.2 * breath)], 'spine': [(Y, 1.2 * sway)], 'hips': [(Y, -1.0 * sway)],
         'head': [(Z, 5 * math.sin(k * math.pi * 2 + 1)), (X, 2 * breath)], 'neck': [(Y, -1.0 * sway)]},
        arm('L', out=-27 + 1.5 * breath, fwd=6, elbow=12 + 2 * sway, wrist=4),
        arm('R', out=-27 + 1.5 * breath, fwd=6, elbow=12 - 2 * sway, wrist=4),
    ))


IDLE = [(f, idle((f - 1) / 120)) for f in range(1, 122, 15)]


# ---------------------------------------------------------------- Walk (32-frame loop)
def walk(ph):
    """ph: 0..1 through one full stride (left foot forward at 0)."""
    a = math.sin(ph * math.pi * 2)  # +1 = left leg forward
    lift_l = max(0.0, math.sin(ph * math.pi * 2 - math.pi / 2 + math.pi))  # knee bend while the leg swings through
    lift_r = max(0.0, math.sin(ph * math.pi * 2 - math.pi / 2))
    bob = -0.022 * abs(math.cos(ph * math.pi * 2))
    return pose(merge(
        {
            'thigh.L': [(-X, 24 * a + 4)], 'shin.L': [(X, 6 + 42 * lift_l)], 'foot.L': [(X, -8 * a + 6 * lift_l)],
            'thigh.R': [(-X, -24 * a + 4)], 'shin.R': [(X, 6 + 42 * lift_r)], 'foot.R': [(X, 8 * a + 6 * lift_r)],
            'hips': [(Z, 6 * a), (X, 3)], 'spine': [(Z, -4 * a)], 'chest': [(Z, -5 * a), (X, 2)],
            'head': [(Z, 3 * a)],
        },
        arm('L', out=-25, fwd=6 - 20 * a, elbow=18 + 8 * max(0, -a), wrist=4),
        arm('R', out=-25, fwd=6 + 20 * a, elbow=18 + 8 * max(0, a), wrist=4),
    ), loc={'hips': (0, bob, 0)})


WALK = [(1 + i * 4, walk(i / 8)) for i in range(9)]

# ---------------------------------------------------------------- Wave (right hand)
up = arm('R', out=70, fwd=22, elbow=10, fore_out=42, wrist=-4)
WAVE = [
    (1, pose()),
    (10, pose(merge(up, {'head': [(Z, -6), (X, -3)], 'chest': [(Z, -5)]}))),
]
for i, f in enumerate(range(16, 62, 7)):
    sw = -18 if i % 2 == 0 else 14
    WAVE.append((f, pose(merge(arm('R', out=70, fwd=22, elbow=10, fore_out=42 + sw, wrist=-4 + sw * 0.4),
                               {'head': [(Z, -6), (X, -4 + (2 if i % 2 else 0))], 'chest': [(Z, -5)]}))))
WAVE += [(72, pose(merge(up, {'head': [(Z, -4)]}))), (86, pose())]

# ---------------------------------------------------------------- Point (left arm, towards the room)
point_pose = merge(
    arm('L', out=62, fwd=24, elbow=6, wrist=-12, twist=-20),
    {'head': [(Z, 32), (X, -4)], 'neck': [(Z, 8)], 'chest': [(Z, 10)], 'spine': [(Z, 4)]},
)
POINT = [
    (1, pose()),
    (12, pose(point_pose)),
    (20, pose(merge(point_pose, arm('L', out=66, fwd=26, elbow=4, wrist=-14, twist=-20)))),
    (34, pose(merge(point_pose, arm('L', out=62, fwd=24, elbow=6, wrist=-12, twist=-20)))),
    (44, pose(merge(point_pose, {'head': [(Z, 10), (X, -2)]}))),
    (60, pose()),
]

# ---------------------------------------------------------------- Guide ("this way", left arm sweep)
GUIDE = [
    (1, pose()),
    (10, pose(merge(arm('L', out=-5, fwd=55, elbow=35, wrist=-10, twist=-30), {'head': [(Z, 6)], 'chest': [(Z, 4)]}))),
    (22, pose(merge(arm('L', out=55, fwd=30, elbow=18, wrist=-18, twist=-35), {'head': [(Z, 30)], 'neck': [(Z, 8)], 'chest': [(Z, 12)]}))),
    (30, pose(merge(arm('L', out=60, fwd=26, elbow=22, wrist=-24, twist=-35), {'head': [(Z, 30)], 'neck': [(Z, 8)], 'chest': [(Z, 12)]}))),
    (40, pose(merge(arm('L', out=55, fwd=30, elbow=18, wrist=-18, twist=-35), {'head': [(Z, 24)], 'chest': [(Z, 10)]}))),
    (56, pose()),
]

# ---------------------------------------------------------------- Present (left hand, open palm towards the room)
# The furniture is always on her left, so she presents it with her left hand; the right arm stays relaxed.
show = merge(
    arm('L', out=38, fwd=38, elbow=34, fore_out=14, wrist=-22, twist=-45),
    {'head': [(Z, 26), (X, -3)], 'neck': [(Z, 6)], 'chest': [(Z, 9)], 'spine': [(Z, 3)]},
)
show2 = merge(
    arm('L', out=44, fwd=34, elbow=28, fore_out=14, wrist=-26, twist=-45),
    {'head': [(Z, 30), (X, -4)], 'neck': [(Z, 7)], 'chest': [(Z, 11)], 'spine': [(Z, 4)]},
)
PRESENT = [
    (1, pose()),
    (13, pose(show)),
    (26, pose(show2)),
    (38, pose(show)),
    (46, pose(merge(show, {'head': [(Z, 10), (X, -2)]}))),
    (60, pose()),
]

# ---------------------------------------------------------------- Celebrate (both arms up, two pumps)
cheer_hi = merge(arm('L', out=128, fwd=12, elbow=22), arm('R', out=128, fwd=12, elbow=22), {'head': [(X, -10)], 'chest': [(X, -5)]})
cheer_lo = merge(arm('L', out=112, fwd=12, elbow=42), arm('R', out=112, fwd=12, elbow=42), {'head': [(X, -6)], 'chest': [(X, -3)]})
CELEBRATE = [
    (1, pose()),
    (10, pose(cheer_hi, loc={'hips': (0, 0.03, 0)})),
    (17, pose(cheer_lo, loc={'hips': (0, -0.01, 0)})),
    (24, pose(cheer_hi, loc={'hips': (0, 0.03, 0)})),
    (31, pose(cheer_lo, loc={'hips': (0, -0.01, 0)})),
    (40, pose(cheer_hi)),
    (58, pose()),
]

# ---------------------------------------------------------------- InsertCoin (ZJ Arcade)
# Right hand reaches into the hoodie pocket, lifts a coin to look at it, winds up and flicks it
# down into the arcade's coin slot. The website attaches a 3D coin to the right hand from
# frame 21 (0.67 s) and releases it at frame 57 (1.87 s).
pocket = merge(arm('R', out=-32, fwd=20, elbow=46, wrist=16, twist=10), {'chest': [(Z, -5)], 'head': [(X, 9), (Z, -10)]})
coin_up = merge(arm('R', out=-30, fwd=58, elbow=100, fore_out=-22, wrist=-18, twist=24), {'chest': [(Z, -3)], 'head': [(X, 14), (Z, -7)]})
windup = merge(arm('R', out=-30, fwd=48, elbow=118, fore_out=-15, wrist=-30, twist=18), {'spine': [(X, 4)], 'head': [(X, 10), (Z, -4)]})
flick = merge(arm('R', out=-26, fwd=44, elbow=14, wrist=28, twist=10), {'spine': [(X, 10)], 'chest': [(X, 6)], 'head': [(X, 12)]})
INSERT = [
    (1, pose()),
    (12, pose(pocket)),
    (20, pose(merge(pocket, arm('R', out=-33, fwd=22, elbow=52, wrist=20, twist=10)), loc={'hips': (0, -0.006, 0)})),
    (32, pose(coin_up)),
    (44, pose(merge(coin_up, arm('R', out=-30, fwd=58, elbow=100, fore_out=-22, wrist=-6, twist=28)))),
    (52, pose(windup)),
    (58, pose(flick)),
    (68, pose(merge(flick, arm('R', out=-26, fwd=42, elbow=18, wrist=24, twist=10)))),
    (88, pose()),
]

ACTIONS = [
    ('Idle', IDLE, True),
    ('Walk', WALK, True),
    ('Wave', WAVE, False),
    ('Point', POINT, False),
    ('Guide', GUIDE, False),
    ('Present', PRESENT, False),
    ('Celebrate', CELEBRATE, False),
    ('InsertCoin', INSERT, False),
]
for name, keys, loop in ACTIONS:
    make_action(name, keys, loop)
    print('action', name, keys[-1][0], 'frames')

# rest the rig in the relaxed pose for the .blend preview
bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.transforms_clear()
bpy.ops.object.mode_set(mode='OBJECT')
scene.frame_start, scene.frame_end = 1, 120
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(here, 'avatar_animated.blend'))

out = os.path.join(here, '..', 'public', 'models', 'avatar.glb')
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB',
    export_animations=True, export_animation_mode='NLA_TRACKS', export_nla_strips=True,
    export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=False,
    export_image_format='JPEG', export_image_quality=82, export_skins=True, export_def_bones=False,
    export_anim_single_armature=True, export_reset_pose_bones=True,
)
print('exported', os.path.getsize(out) // 1024, 'KB')
