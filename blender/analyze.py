# Prints horizontal slices of the avatar mesh so joint positions can be placed accurately.
import bpy, os
from collections import defaultdict
here = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(here, 'avatar_static.blend'))
obj = bpy.data.objects['Zubia_Avatar']
vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
zs = [v.z for v in vs]
print('H', min(zs), max(zs), 'N', len(vs))
print('Y', min(v.y for v in vs), max(v.y for v in vs))
sl = defaultdict(list)
for v in vs:
    sl[round(v.z / 0.04)].append(v)
for k in sorted(sl):
    pts = sl[k]
    xs = sorted(p.x for p in pts)
    # find gaps in x to separate limbs
    segs = []
    start = xs[0]
    prev = xs[0]
    for x in xs[1:]:
        if x - prev > 0.025:
            segs.append((round(start, 3), round(prev, 3)))
            start = x
        prev = x
    segs.append((round(start, 3), round(prev, 3)))
    ys = [p.y for p in pts]
    print(f'z={k*0.04:.2f} n={len(pts):5d} y=({min(ys):.2f},{max(ys):.2f}) segs={segs}')
tip = max(vs, key=lambda v: v.x)
print('RIGHTMOST(+x)', tuple(round(c, 3) for c in tip))
tip = min(vs, key=lambda v: v.x)
print('LEFTMOST(-x)', tuple(round(c, 3) for c in tip))
