# Renders a portrait of the avatar's face (transparent background) for the chat window icon.
# Run: blender -b --factory-startup -P blender/render_headshot.py
import bpy, os, math
from mathutils import Vector

here = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(here, 'avatar_animated.blend'))
sc = bpy.context.scene
rig = bpy.data.objects['Zubia_Rig']
# relaxed idle pose instead of the A-pose rest pose
if rig.animation_data:
    for t in rig.animation_data.nla_tracks:
        t.mute = True
    rig.animation_data.action = bpy.data.actions['Idle']
sc.frame_set(1)

sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
world = bpy.data.worlds.new('w')
sc.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[1].default_value = 0.9

def light(name, rot, energy, color=(1, 1, 1)):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
    sc.collection.objects.link(l)
    l.rotation_euler = [math.radians(a) for a in rot]
    l.data.energy = energy
    l.data.color = color

light('key', (60, 0, -30), 3.2, (1, 0.95, 0.9))
light('fill', (70, 0, 40), 1.2, (0.85, 0.9, 1))
light('rim', (110, 0, 180), 2.0)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.lens = 85
head = Vector((0, -0.02, 1.68))
cam.location = head + Vector((0.18, -1.55, 0.06))
direction = head - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = os.path.join(here, '..', 'public', 'img', 'avatar-face.png')
bpy.ops.render.render(write_still=True)
print('saved', sc.render.filepath)
