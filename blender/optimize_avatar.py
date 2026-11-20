# Module 1 prep: turns the raw Meshy export into a light, web-ready static avatar.
# - decimates 134k -> ~32k triangles
# - fixes the material (Meshy marks everything as metal, which renders dark and shiny)
# - shrinks textures to 1024px
# - stands the model on the floor (feet at y=0), centred, facing +Z (glTF forward)
# Run:  blender -b --factory-startup -P blender/optimize_avatar.py
import bpy, os
from mathutils import Vector

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'avatar_meshy_source.glb')
out_glb = os.path.join(here, '..', 'public', 'models', 'avatar.glb')
out_blend = os.path.join(here, 'avatar_static.blend')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
obj.name = 'Zubia_Avatar'
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# feet on the floor, centred on x/y (Blender is Z-up)
bb = [Vector(c) for c in obj.bound_box]
minz = min(v.z for v in bb)
cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2
cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2
for v in obj.data.vertices:
    v.co.x -= cx
    v.co.y -= cy
    v.co.z -= minz

tris_before = sum(len(p.vertices) - 2 for p in obj.data.polygons)
mod = obj.modifiers.new('decimate', 'DECIMATE')
mod.ratio = 32000 / tris_before
mod.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=mod.name)
tris_after = sum(len(p.vertices) - 2 for p in obj.data.polygons)
bpy.ops.object.shade_smooth()

for mat in obj.data.materials:
    mat.name = 'Avatar_Material'
    bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    # drop the metallic/roughness texture link, use a plain fabric-like surface
    for link in list(bsdf.inputs['Metallic'].links):
        mat.node_tree.links.remove(link)
    bsdf.inputs['Metallic'].default_value = 0.0
    for link in list(bsdf.inputs['Roughness'].links):
        mat.node_tree.links.remove(link)
    bsdf.inputs['Roughness'].default_value = 0.78
    mat.use_backface_culling = False

for img in bpy.data.images:
    if img.size[0] > 1024:
        img.scale(1024, 1024)
    img.pack()

bpy.ops.wm.save_as_mainfile(filepath=out_blend)
os.makedirs(os.path.dirname(out_glb), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out_glb, export_format='GLB', use_selection=False,
    export_image_format='JPEG', export_image_quality=82,
    export_draco_mesh_compression_enable=False, export_apply=True,
)
print('TRIS', tris_before, '->', tris_after, 'SIZE', os.path.getsize(out_glb) // 1024, 'KB')
