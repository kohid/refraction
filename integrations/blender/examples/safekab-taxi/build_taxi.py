"""Build the web-ready SafeKab taxi from a raw Meshy (or similar) car mesh.

    blender -b -P build_taxi.py -- path/to/meshy.glb [--out dist] [--artwork artwork]
                                   [--target-tris 100000] [--front=-x] [--draco] [--no-previews]

Steps: import, turn and scale to a 4.69 m car standing on the ground, decimate, paint
regions (glass, tyres, rims, lights, grille, roof sign) by position, add the livery as
decals projected onto the body, then write safekab-taxi.blend, safekab-taxi.glb and
preview renders. Layout and paint rules live in livery.py.
"""

import argparse
import math
import os
import sys

import bpy  # Must come first: the bpy Python module only exposes bmesh after it loads.
import bmesh  # noqa: I001
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import livery  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

# Gap between paint and decal, and between stacked decal pieces, so they do not flicker.
DECAL_OFFSET = 0.004
DECAL_STEP = 0.0025
GRID_CELL = 0.04

# Model axis the car's front points along -> rotation about Z that turns it to face -Y.
FRONT_ROTATIONS = {"-y": 0, "-x": 90, "+y": 180, "+x": -90}


def parse_args(argv):
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser(prog="build_taxi.py", description=__doc__.splitlines()[0])
    parser.add_argument("input", help="Car mesh (.glb, .gltf, .fbx or .obj)")
    parser.add_argument("--out", default=os.path.join(HERE, "dist"))
    parser.add_argument("--artwork", default=os.path.join(HERE, "artwork"))
    parser.add_argument("--target-tris", type=int, default=100_000)
    parser.add_argument("--front", choices=sorted(FRONT_ROTATIONS), default="-x",
                        help="Axis the car's front points along in the input file (Meshy: -x)")
    parser.add_argument("--draco", action="store_true", help="Draco-compress the .glb (needs Blender's Draco library)")
    parser.add_argument("--no-previews", action="store_true")
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------------------------
# Body
# ---------------------------------------------------------------------------------------------

def import_body(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    extension = os.path.splitext(path)[1].lower()

    if extension in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif extension == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif extension == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit(f"Unsupported input: {path}")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]

    if not meshes:
        raise SystemExit("The input has no mesh.")

    for obj in bpy.context.scene.objects:
        obj.select_set(obj in meshes)

    bpy.context.view_layer.objects.active = meshes[0]

    if len(meshes) > 1:
        bpy.ops.object.join()

    body = bpy.context.view_layer.objects.active
    body.parent = None
    body.name = "SafeKab Taxi"
    body.data.name = "SafeKab Taxi"

    for obj in [o for o in bpy.context.scene.objects if o is not body]:
        bpy.data.objects.remove(obj)

    return body


def normalise(body, front):
    """Front to -Y, length to the real car, centred, wheels on Z = 0."""
    body.rotation_mode = "XYZ"
    body.matrix_world = Matrix.Rotation(math.radians(FRONT_ROTATIONS[front]), 4, "Z") @ body.matrix_world
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    scale = livery.CAR_LENGTH / body.dimensions.y
    body.data.transform(Matrix.Scale(scale, 4))

    coords = mesh_coords(body.data)
    low, high = coords.min(axis=0), coords.max(axis=0)
    body.data.transform(Matrix.Translation(Vector(((-(low[0] + high[0]) / 2), -(low[1] + high[1]) / 2, -low[2]))))
    body.data.update()


def mesh_coords(mesh):
    coords = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get("co", coords)
    return coords.reshape(-1, 3)


def protect_region_edges(body):
    """Vertex group of vertices where materials meet, so decimation keeps region outlines."""
    mesh = body.data
    loop_vertices = np.empty(len(mesh.loops), dtype=np.int64)
    mesh.loops.foreach_get("vertex_index", loop_vertices)
    loop_totals = np.empty(len(mesh.polygons), dtype=np.int64)
    mesh.polygons.foreach_get("loop_total", loop_totals)
    materials = np.empty(len(mesh.polygons), dtype=np.int64)
    mesh.polygons.foreach_get("material_index", materials)

    loop_materials = np.repeat(materials, loop_totals)
    lowest = np.full(len(mesh.vertices), np.iinfo(np.int64).max)
    highest = np.full(len(mesh.vertices), -1)
    np.minimum.at(lowest, loop_vertices, loop_materials)
    np.maximum.at(highest, loop_vertices, loop_materials)

    edges = np.flatnonzero((highest >= 0) & (lowest != highest))
    group = body.vertex_groups.new(name="region_edges")
    group.add(edges.tolist(), 1.0, "REPLACE")

    return group.name


def decimate(body, target_tris, keep_group=None):
    triangles = sum(len(polygon.vertices) - 2 for polygon in body.data.polygons)

    if triangles <= target_tris:
        return triangles

    modifier = body.modifiers.new("Decimate", "DECIMATE")
    modifier.ratio = target_tris / triangles

    if keep_group:
        # Group weight is how freely a vertex may collapse; invert it so the edges are the ones kept.
        modifier.vertex_group = keep_group
        modifier.invert_vertex_group = True
        modifier.vertex_group_factor = 1000.0

    bpy.ops.object.modifier_apply(modifier=modifier.name)

    if keep_group:
        body.vertex_groups.remove(body.vertex_groups[keep_group])

    return sum(len(polygon.vertices) - 2 for polygon in body.data.polygons)


def make_material(name, color, metallic=0.0, roughness=0.4, emission=0.0, image=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = livery.hex_to_linear(color)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness

    if emission:
        bsdf.inputs["Emission Color"].default_value = livery.hex_to_linear(color)
        bsdf.inputs["Emission Strength"].default_value = emission

    if image:
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = bpy.data.images.load(image, check_existing=True)
        texture.extension = "CLIP"
        links = material.node_tree.links
        links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
        links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
        material.blend_method = "BLEND"

    return material


def paint_regions(body, regions=livery.Regions()):
    mesh = body.data
    mesh.materials.clear()
    names = list(livery.MATERIALS)

    for name in names:
        color, metallic, roughness, emission = livery.MATERIALS[name]
        mesh.materials.append(make_material(name, color, metallic, roughness, emission))

    count = len(mesh.polygons)
    centers = np.empty(count * 3)
    normals = np.empty(count * 3)
    mesh.polygons.foreach_get("center", centers)
    mesh.polygons.foreach_get("normal", normals)
    centers, normals = centers.reshape(-1, 3), normals.reshape(-1, 3)

    indices = [names.index(livery.classify_face(c, n, regions)) for c, n in zip(centers, normals)]
    mesh.polygons.foreach_set("material_index", indices)
    mesh.polygons.foreach_set("use_smooth", [True] * count)
    mesh.update()

    return {name: indices.count(i) for i, name in enumerate(names)}


# ---------------------------------------------------------------------------------------------
# Decal geometry: flat 2D pieces in decal space (u, v in metres, centred on 0, 0)
# ---------------------------------------------------------------------------------------------

class Piece:
    """A flat part of a decal: vertices (u, v), faces, a material and its stacking level."""

    def __init__(self, verts, faces, material, level=0, uvs=None):
        self.verts = verts
        self.faces = faces
        self.material = material
        self.level = level
        self.uvs = uvs


def grid_rect(width, height, material, level=0, cx=0.0, cy=0.0, with_uvs=False):
    cols = max(1, math.ceil(width / GRID_CELL))
    rows = max(1, math.ceil(height / GRID_CELL))
    verts, uvs = [], []

    for j in range(rows + 1):
        for i in range(cols + 1):
            s, t = i / cols, j / rows
            verts.append((cx + (s - 0.5) * width, cy + (t - 0.5) * height))
            uvs.append((s, t))

    faces = [
        (j * (cols + 1) + i, j * (cols + 1) + i + 1, (j + 1) * (cols + 1) + i + 1, (j + 1) * (cols + 1) + i)
        for j in range(rows)
        for i in range(cols)
    ]

    return Piece(verts, faces, material, level, uvs if with_uvs else None)


def annulus(inner, outer, material, level=0, cx=0.0, cy=0.0, segments=48):
    rings = max(1, math.ceil((outer - inner) / GRID_CELL))
    radii = [inner + (outer - inner) * k / rings for k in range(rings + 1)]
    verts, faces = [], []

    if inner == 0:
        verts.append((cx, cy))
        radii = radii[1:]

    start = len(verts)

    for radius in radii:
        for s in range(segments):
            angle = 2 * math.pi * s / segments
            verts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))

    if inner == 0:
        faces += [(0, start + s, start + (s + 1) % segments) for s in range(segments)]

    for r in range(len(radii) - 1):
        a, b = start + r * segments, start + (r + 1) * segments
        faces += [(a + s, a + (s + 1) % segments, b + (s + 1) % segments, b + s) for s in range(segments)]

    return Piece(verts, faces, material, level)


def polygon_piece(outline, material, level=0, max_edge=0.06):
    """A filled polygon, triangulated finely enough to follow a curved surface once projected."""
    bm = bmesh.new()
    points = []

    for (u0, v0), (u1, v1) in zip(outline, outline[1:] + outline[:1]):
        steps = max(1, math.ceil(math.hypot(u1 - u0, v1 - v0) / max_edge))
        points += [(u0 + (u1 - u0) * k / steps, v0 + (v1 - v0) * k / steps) for k in range(steps)]

    face = bm.faces.new([bm.verts.new((u, v, 0.0)) for u, v in points])
    bmesh.ops.triangulate(bm, faces=[face], ngon_method="BEAUTY")

    for _ in range(10):
        long_edges = [edge for edge in bm.edges if edge.calc_length() > max_edge]

        if not long_edges:
            break

        bmesh.ops.subdivide_edges(bm, edges=long_edges, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])

    bm.verts.index_update()
    verts = [(vert.co.x, vert.co.y) for vert in bm.verts]
    faces = [tuple(vert.index for vert in face.verts) for face in bm.faces]
    bm.free()

    return Piece(verts, faces, material, level)


def text_piece(text, width, height, material, level=0, cx=0.0, cy=0.0):
    """Blender text, converted to a mesh and fitted inside width x height."""
    curve = bpy.data.curves.new("decal_text", "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    holder = bpy.data.objects.new("decal_text", curve)
    bpy.context.scene.collection.objects.link(holder)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(holder.evaluated_get(depsgraph))

    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)

    coords = [(v.co.x, v.co.y) for v in mesh.vertices]
    faces = [tuple(p.vertices) for p in mesh.polygons]
    bpy.data.meshes.remove(mesh)

    xs, ys = [c[0] for c in coords], [c[1] for c in coords]
    scale = min(width / (max(xs) - min(xs)), height / (max(ys) - min(ys)))
    mx, my = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2

    verts = [(cx + (x - mx) * scale, cy + (y - my) * scale) for x, y in coords]

    return Piece(verts, faces, material, level)


def livery_material(color_name):
    return make_material(f"livery_{color_name}", livery.COLORS[color_name], roughness=0.3)


def placeholder_pieces(decal):
    width, height = decal.size
    fill, accent, ink = (livery_material(c) for c in (decal.fill, decal.accent, decal.ink))

    if decal.kind == "band":
        border = 0.035
        return [
            grid_rect(width, height, accent, 0),
            grid_rect(width - 2 * border, height - 2 * border, fill, 1),
        ]

    if decal.kind == "glass":
        color, metallic, roughness, emission = livery.MATERIALS["glass"]
        return [polygon_piece(decal.local_outline(), make_material("glass", color, metallic, roughness, emission))]

    if decal.kind == "lamp":
        return [grid_rect(width, height, make_material(f"livery_{decal.fill}", livery.COLORS[decal.fill], 0.4, 0.08))]

    if decal.kind == "text":
        return [text_piece(decal.text, width, height, ink)]

    if decal.kind == "plate":
        return [
            grid_rect(width, height, fill, 0),
            text_piece(decal.text, width * 0.88, height * 0.62, ink, 1),
        ]

    radius = min(width, height) / 2

    if decal.kind == "roundel":
        return [
            annulus(0, radius, fill, 0),
            annulus(radius * 0.8, radius, accent, 1),
            text_piece("PRE-BOOKED", radius * 1.2, radius * 0.18, ink, 1, cy=radius * 0.42),
            text_piece(decal.text, radius * 0.9, radius * 0.7, ink, 1, cy=-radius * 0.12),
        ]

    # logo: blue disc with the "S", with the wordmark plate under it.
    disc = radius * 0.7
    return [
        annulus(0, disc, fill, 0, cy=radius - disc),
        text_piece(decal.text, disc * 1.0, disc * 1.25, ink, 1, cy=radius - disc),
        grid_rect(width, height * 0.24, fill, 0, cy=-radius + height * 0.12),
        text_piece("SafeKab", width * 0.85, height * 0.17, livery_material(decal.accent), 1, cy=-radius + height * 0.12),
    ]


def image_pieces(decal, path):
    material = make_material(f"decal_{decal.name}", "#FFFFFF", roughness=0.3, image=path)
    return [grid_rect(decal.size[0], decal.size[1], material, 0, with_uvs=True)]


# ---------------------------------------------------------------------------------------------
# Projecting decals onto the body
# ---------------------------------------------------------------------------------------------

def build_decal(decal, body, bvh, bounds, artwork_dir):
    half_width, half_length, height = bounds
    placement = livery.place(decal, half_width, half_length, height)
    origin, u_axis, v_axis = Vector(placement.origin), Vector(placement.u_axis), Vector(placement.v_axis)
    direction = Vector(placement.project_axis).normalized()

    image = livery.artwork_path(artwork_dir, decal)
    pieces = image_pieces(decal, image) if image else placeholder_pieces(decal)

    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    materials = []
    misses = 0

    for piece in pieces:
        if piece.material not in materials:
            materials.append(piece.material)

        offset = DECAL_OFFSET + (decal.layer * 2 + piece.level) * DECAL_STEP
        verts = []

        for u, v in piece.verts:
            start = origin + u * u_axis + v * v_axis
            hit, _normal, _index, _distance = bvh.ray_cast(start, direction, 3.0)

            if hit is None:
                misses += 1
                hit = bvh.find_nearest(start)[0]

            verts.append(bm.verts.new(hit - direction * offset))

        for face_index, face in enumerate(piece.faces):
            try:
                bm_face = bm.faces.new([verts[i] for i in face])
            except ValueError:  # Duplicate face in the font mesh.
                continue

            bm_face.material_index = materials.index(piece.material)
            bm_face.smooth = True

            if piece.uvs:
                for loop, vert_index in zip(bm_face.loops, face):
                    loop[uv_layer].uv = piece.uvs[vert_index]

    mesh = bpy.data.meshes.new(f"decal_{decal.name}")
    bm.to_mesh(mesh)
    bm.free()

    for material in materials:
        mesh.materials.append(material)

    obj = bpy.data.objects.new(f"Decal {decal.name}", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = body

    return obj, misses


# ---------------------------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------------------------

def setup_scene():
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.82, 0.85, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
    scene.world = world

    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    scene.collection.objects.link(sun)

    camera = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
    camera.data.lens = 50
    scene.collection.objects.link(camera)
    scene.camera = camera

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = 1200, 720
    scene.view_settings.view_transform = "AgX"


def render_previews(out_dir):
    scene = bpy.context.scene
    target = Vector((0, 0, 0.7))
    views = {"front-left": (-35, 14), "rear-right": (145, 18), "side-left": (90, 6), "front": (0, 12)}
    paths = []

    for name, (azimuth, elevation) in views.items():
        a, e = math.radians(azimuth - 90), math.radians(elevation)
        distance = 9.5
        scene.camera.location = target + distance * Vector((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e)))
        scene.camera.rotation_euler = (target - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(out_dir, f"preview-{name}.png")
        bpy.ops.render.render(write_still=True)
        paths.append(scene.render.filepath)

    return paths


def export(out_dir, draco):
    os.makedirs(out_dir, exist_ok=True)
    glb = os.path.join(out_dir, "safekab-taxi.glb")

    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=draco,
    )
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, "safekab-taxi.blend"))

    return glb


def main():
    args = parse_args(sys.argv)
    body = import_body(os.path.abspath(args.input))
    normalise(body, args.front)
    # Paint at full resolution, then decimate: region edges follow the finer triangles.
    painted = paint_regions(body)
    triangles = decimate(body, args.target_tris, protect_region_edges(body))
    print(f"[taxi] {triangles} triangles; faces per material: {painted}")

    depsgraph = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(body, depsgraph)
    coords = mesh_coords(body.data)
    bounds = (coords[:, 0].max(), coords[:, 1].max(), coords[:, 2].max())

    for decal in livery.DECALS:
        _obj, misses = build_decal(decal, body, bvh, bounds, args.artwork)
        source = "artwork" if livery.artwork_path(args.artwork, decal) else "placeholder"
        print(f"[taxi] decal {decal.name}: {source}" + (f", {misses} vertices missed the body" if misses else ""))

    setup_scene()
    glb = export(args.out, args.draco)
    print(f"[taxi] wrote {glb} ({os.path.getsize(glb) / 1e6:.1f} MB)")

    if not args.no_previews:
        for path in render_previews(args.out):
            print(f"[taxi] preview {path}")


if __name__ == "__main__":
    main()
