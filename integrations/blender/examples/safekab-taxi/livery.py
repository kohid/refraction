"""SafeKab taxi: layout and paint rules for build_taxi.py.

Pure Python (no ``bpy``), so the rules can be unit tested and tuned without Blender.

Coordinates are metres in Blender's frame after the build has normalised the model:
the car's front faces -Y, +X is the car's left side, Z is up, the wheels touch Z = 0,
and the car is centred on X and Y. Every number below was measured on the Meshy
"safekab taxi exterior" model scaled to a 4.69 m Skoda Octavia; tune them for another mesh.
"""

import math
import os
from dataclasses import dataclass, field

CAR_LENGTH = 4.69

# Brand colours, sampled from the SafeKab photos. Replace with the official values when known.
COLORS = {
    "white": "#F4F5F2",
    "blue": "#2350A8",
    "teal": "#36C2A4",
    "navy": "#14224A",
    "red": "#D7262E",
    "yellow": "#F2C400",
    "plate_white": "#F7F7F2",
    "plate_yellow": "#F5C518",
    "black": "#111111",
    "lamp_red": "#A3121A",
    "lamp_clear": "#D9E0E8",
}


def hex_to_linear(value, alpha=1.0):
    """'#RRGGBB' (sRGB) to the linear RGBA tuple Blender material inputs expect."""
    value = value.lstrip("#")

    if len(value) != 6:
        raise ValueError(f"Expected #RRGGBB, got #{value}")

    def channel(index):
        c = int(value[index : index + 2], 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return (channel(0), channel(2), channel(4), alpha)


# ---------------------------------------------------------------------------------------------
# Paint by region
# ---------------------------------------------------------------------------------------------

# name: (base colour, metallic, roughness, emission strength)
MATERIALS = {
    "body": (COLORS["white"], 0.0, 0.22, 0.0),
    "glass": ("#0C1218", 0.0, 0.05, 0.0),
    "tyre": ("#141414", 0.0, 0.9, 0.0),
    "rim": ("#B9BDC2", 1.0, 0.28, 0.0),
    "trim": ("#1A1A1A", 0.0, 0.55, 0.0),
    "grille": ("#3A3D42", 0.85, 0.25, 0.0),
    "sign": (COLORS["yellow"], 0.0, 0.35, 0.6),
}


@dataclass(frozen=True)
class Box:
    """A region seen from the front or rear: |x| and z ranges, on faces facing that way."""

    x: tuple
    z: tuple

    def contains(self, ax, z):
        return self.x[0] <= ax <= self.x[1] and self.z[0] <= z <= self.z[1]


@dataclass(frozen=True)
class Regions:
    wheel_centers_y: tuple = (-1.44, 1.34)
    tyre_radius: float = 0.345
    rim_radius: float = 0.23
    # Tyre and rim faces lie outboard of this |x|; inboard faces near a wheel are the arch liner.
    wheel_inner_x: float = 0.62
    wheel_well_radius: float = 0.40
    sign_z: float = 1.50
    sign_half_length: float = 0.35
    # Windows and lamps are decals (see DECALS): an AI mesh's own triangles are too irregular
    # for painted faces to give a clean edge. Painting is kept for parts with geometry of their own.
    nose_y: float = -1.95
    grille: Box = Box((0.0, 0.42), (0.62, 0.81))
    lower_intake: Box = Box((0.0, 0.42), (0.25, 0.42))


def facing(normal):
    """'front', 'rear', 'side' or 'up' for a face normal (front is -Y)."""
    nx, ny, nz = normal

    if nz > max(abs(nx), abs(ny)):
        return "up"

    if abs(nx) >= abs(ny):
        return "side"

    return "front" if ny < 0 else "rear"


def classify_face(center, normal, regions=Regions()):
    """Material name for one face, from its centre and normal."""
    x, y, z = center
    ax = abs(x)
    direction = facing(normal)

    for wheel_y in regions.wheel_centers_y:
        distance = math.hypot(y - wheel_y, z - regions.tyre_radius)

        if distance < regions.tyre_radius and ax > regions.wheel_inner_x:
            return "rim" if distance < regions.rim_radius else "tyre"

        if distance < regions.wheel_well_radius and ax <= regions.wheel_inner_x:
            return "trim"

    if z > regions.sign_z and abs(y) < regions.sign_half_length:
        return "sign"

    if y < regions.nose_y and direction == "front":
        if regions.grille.contains(ax, z):
            return "grille"

        if regions.lower_intake.contains(ax, z):
            return "trim"

    return "body"


# ---------------------------------------------------------------------------------------------
# Livery decals
# ---------------------------------------------------------------------------------------------

# Where a decal sits and which way it is projected onto the car.
#   left / right: on the car's side, u = metres along the car (front -> back), v = height
#   bonnet:       from above,       u = across the car (left -> right as seen from the front), v = along the car
#   front / rear: from the ends,    u = across the car as seen from that end, v = height
SURFACES = ("left", "right", "bonnet", "front", "rear", "sign_front", "sign_rear")
KINDS = ("band", "text", "roundel", "logo", "plate", "lamp", "glass")


@dataclass(frozen=True)
class Decal:
    """One piece of the livery.

    ``artwork`` names a PNG in the artwork folder (with transparency). When the file exists it is
    used as the decal's image; otherwise a placeholder is built from ``kind``, ``text`` and colours.
    """

    name: str
    surface: str
    center: tuple  # (u, v) in metres, see SURFACES
    size: tuple  # (width, height) in metres
    kind: str  # placeholder shape, one of KINDS
    artwork: str = ""
    text: str = ""
    fill: str = "blue"
    accent: str = "teal"
    ink: str = "white"
    layer: int = 0  # higher layers sit further from the paint, so overlaps do not flicker
    # "glass" only: the window outline as (u, v) points in the surface's coordinates (not
    # relative to center). For a side window give it as seen on the left side; it is mirrored
    # for the right side.
    outline: tuple = ()

    def __post_init__(self):
        if self.surface not in SURFACES:
            raise ValueError(f"{self.name}: unknown surface {self.surface!r}")

        if self.kind not in KINDS:
            raise ValueError(f"{self.name}: unknown kind {self.kind!r}")

        if (self.kind == "glass") != bool(self.outline):
            raise ValueError(f"{self.name}: glass decals, and only they, need an outline")

    def local_outline(self):
        """Outline relative to center, along the decal's own u axis (mirrored on the right side)."""
        mirror = -1 if self.surface == "right" else 1
        return [((u - self.center[0]) * mirror, v - self.center[1]) for u, v in self.outline]


# Window outlines, measured on orthographic renders of the normalised Meshy model.
# The side outline steps up behind the wing mirror (y -0.80 to -0.58, z up to 1.10) so the
# projection does not paint the mirror.
SIDE_WINDOWS = (
    (-0.56, 1.02), (-0.56, 1.14), (-0.79, 1.14), (-0.51, 1.27), (-0.23, 1.40), (0.42, 1.425),
    (0.96, 1.40), (1.17, 1.35), (1.27, 1.23), (1.27, 1.03),
)
WINDSCREEN = ((-0.717, 1.012), (0.717, 1.012), (0.633, 1.325), (-0.633, 1.325))
REAR_WINDOW = ((-0.66, 1.133), (0.66, 1.133), (0.60, 1.383), (-0.60, 1.383))


def _side(surface):
    """Both sides get the same layout; a side's u always runs front to back."""
    return [
        Decal(f"windows_{surface}", surface, (0.0, 0.0), (2.4, 0.45), "glass", outline=SIDE_WINDOWS),
        Decal(f"stripe_{surface}", surface, (0.05, 0.60), (1.95, 0.36), "band", artwork="stripe.png"),
        Decal(
            f"wordmark_{surface}", surface, (0.10, 0.60), (0.95, 0.20), "text",
            artwork="wordmark.png", text="SafeKab", ink="teal", layer=1,
        ),
        Decal(
            f"roundel_{surface}", surface, (1.62, 0.86), (0.34, 0.34), "roundel",
            artwork="roundel.png", text="iT", fill="white", accent="red", ink="red", layer=1,
        ),
    ]


DECALS = (
    _side("left")
    + _side("right")
    + [
        Decal("bonnet_logo", "bonnet", (0.0, -1.62), (0.62, 0.62), "logo", artwork="logo.png", text="S"),
        Decal(
            "front_plate", "front", (0.0, 0.47), (0.52, 0.11), "plate",
            artwork="plate_front.png", text="SAFETY FIRST", fill="plate_white", ink="black",
        ),
        Decal(
            "rear_plate", "rear", (0.0, 0.62), (0.52, 0.11), "plate",
            artwork="plate_rear.png", text="SAFEKAB", fill="plate_yellow", ink="black",
        ),
        Decal("windscreen", "front", (0.0, 0.0), (1.45, 0.32), "glass", outline=WINDSCREEN),
        Decal("rear_window", "rear", (0.0, 0.0), (1.40, 0.26), "glass", outline=REAR_WINDOW),
        # Lamps: (u, v) as seen from that end of the car, so +u is the viewer's right.
        Decal("headlight_left", "front", (0.60, 0.72), (0.30, 0.13), "lamp", fill="lamp_clear"),
        Decal("headlight_right", "front", (-0.60, 0.72), (0.30, 0.13), "lamp", fill="lamp_clear"),
        Decal("taillight_left", "rear", (-0.63, 0.90), (0.34, 0.16), "lamp", fill="lamp_red"),
        Decal("taillight_right", "rear", (0.63, 0.90), (0.34, 0.16), "lamp", fill="lamp_red"),
        Decal("sign_front", "sign_front", (0.0, 1.55), (0.36, 0.08), "text", text="TAXI", ink="black"),
        Decal("sign_rear", "sign_rear", (0.0, 1.55), (0.36, 0.08), "text", text="TAXI", ink="black"),
    ]
)


def artwork_path(artwork_dir, decal):
    """The decal's image if it was supplied, else None (use the placeholder)."""
    if not artwork_dir or not decal.artwork:
        return None

    path = os.path.join(artwork_dir, decal.artwork)
    return path if os.path.isfile(path) else None


@dataclass(frozen=True)
class Placement:
    """World-space frame for a decal: origin, u axis, v axis and the direction it is projected in."""

    origin: tuple
    u_axis: tuple
    v_axis: tuple
    project_axis: tuple = field(default=(1.0, 0.0, 0.0))


def place(decal, half_width, half_length, height):
    """Frame of a decal, starting outside the car so projecting it inwards hits the paint first.

    ``half_width``, ``half_length`` and ``height`` are the car's bounding box (wing mirrors included).
    """
    u, v = decal.center
    margin = 0.25

    if decal.surface == "left":
        return Placement((half_width + margin, u, v), (0, 1, 0), (0, 0, 1), (-1, 0, 0))

    if decal.surface == "right":
        # Seen from the right side the car's front is on the right, so u still runs front to back
        # but the text must read left to right: flip u.
        return Placement((-half_width - margin, u, v), (0, -1, 0), (0, 0, 1), (1, 0, 0))

    if decal.surface == "bonnet":
        # Reads upright for someone standing in front of the car: u to their right, v towards the windscreen.
        return Placement((u, v, height + margin), (1, 0, 0), (0, 1, 0), (0, 0, -1))

    if decal.surface in ("front", "sign_front"):
        y = -half_length - margin if decal.surface == "front" else -1.0
        return Placement((u, y, v), (1, 0, 0), (0, 0, 1), (0, 1, 0))

    # rear / sign_rear: seen from behind, the viewer's right is the car's -X.
    y = half_length + margin if decal.surface == "rear" else 1.0
    return Placement((-u, y, v), (-1, 0, 0), (0, 0, 1), (0, -1, 0))
