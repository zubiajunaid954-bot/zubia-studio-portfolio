# Renders a contact sheet of key poses so the rig and animations can be checked by eye.
import bpy, os, math, sys
from mathutils import Vector
here = os.path.dirname(os.path.abspath(__file__))
out_dir = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.open_mainfile(filepath=os.path.join(here, 'avatar_animated.blend'))
sc = bpy.context.scene
rig = bpy.data.objects['Zubia_Rig']
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 360, 520
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.75, 0.78, 1)
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(-25)); sun.data.energy = 3.5
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.3
shots = [s.split(':') for s in sys.argv[sys.argv.index('--') + 2].split(',')]
for name, frame, ang in shots:
    for t in rig.animation_data.nla_tracks:
        t.mute = True
    rig.animation_data.action = bpy.data.actions[name]
    sc.frame_set(int(frame))
    a = math.radians(float(ang))
    cam.location = Vector((math.sin(a) * 6, -math.cos(a) * 6, 1.0))
    cam.rotation_euler = (math.radians(90), 0, a)
    sc.render.filepath = os.path.join(out_dir, f'{name}_{frame}_{ang}.png')
    bpy.ops.render.render(write_still=True)
