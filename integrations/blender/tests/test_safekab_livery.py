"""Tests for the SafeKab taxi layout rules (no Blender needed).

Run: python3 -m unittest discover -s integrations/blender/tests
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "examples", "safekab-taxi"))

import livery  # noqa: E402

FRONT = (0.0, -1.0, 0.0)
SIDE = (1.0, 0.0, 0.0)
UP = (0.0, 0.0, 1.0)


class ColorTests(unittest.TestCase):
    def test_hex_to_linear(self):
        self.assertEqual(livery.hex_to_linear("#FFFFFF"), (1.0, 1.0, 1.0, 1.0))
        self.assertEqual(livery.hex_to_linear("000000", 0.5), (0.0, 0.0, 0.0, 0.5))
        self.assertAlmostEqual(livery.hex_to_linear("#808080")[0], 0.2158605, places=5)

    def test_bad_hex(self):
        with self.assertRaises(ValueError):
            livery.hex_to_linear("#FFF")

    def test_every_color_is_valid(self):
        for name, value in livery.COLORS.items():
            self.assertEqual(len(livery.hex_to_linear(value)), 4, name)

        for name, (color, *_rest) in livery.MATERIALS.items():
            self.assertEqual(len(livery.hex_to_linear(color)), 4, name)


class FacingTests(unittest.TestCase):
    def test_directions(self):
        self.assertEqual(livery.facing(FRONT), "front")
        self.assertEqual(livery.facing((0.0, 1.0, 0.1)), "rear")
        self.assertEqual(livery.facing((-0.9, 0.3, 0.1)), "side")
        self.assertEqual(livery.facing(UP), "up")


class ClassifyTests(unittest.TestCase):
    regions = livery.Regions()

    def classify(self, center, normal=SIDE):
        return livery.classify_face(center, normal, self.regions)

    def test_wheels(self):
        front_axle = self.regions.wheel_centers_y[0]
        hub_z = self.regions.tyre_radius

        self.assertEqual(self.classify((0.85, front_axle, hub_z)), "rim")
        self.assertEqual(self.classify((0.85, front_axle, hub_z + 0.30)), "tyre")
        self.assertEqual(self.classify((0.40, front_axle, hub_z + 0.30)), "trim")

    def test_body_above_the_wheel_arch(self):
        self.assertEqual(self.classify((0.85, self.regions.wheel_centers_y[0], 0.80)), "body")

    def test_roof_sign(self):
        self.assertEqual(self.classify((0.0, 0.0, 1.58), UP), "sign")

    def test_grille_only_on_front_facing_faces(self):
        self.assertEqual(self.classify((0.1, -2.2, 0.7), FRONT), "grille")
        self.assertEqual(self.classify((0.1, -2.2, 0.7), UP), "body")

    def test_lower_intake(self):
        self.assertEqual(self.classify((0.1, -2.2, 0.3), FRONT), "trim")

    def test_plain_panels_are_body(self):
        self.assertEqual(self.classify((0.85, 0.0, 0.6)), "body")
        self.assertEqual(self.classify((0.0, -1.6, 0.98), UP), "body")


class DecalTests(unittest.TestCase):
    def test_names_are_unique(self):
        names = [decal.name for decal in livery.DECALS]
        self.assertEqual(len(names), len(set(names)))

    def test_both_sides_get_the_same_livery(self):
        left = sorted(d.name.replace("_left", "") for d in livery.DECALS if d.surface == "left")
        right = sorted(d.name.replace("_right", "") for d in livery.DECALS if d.surface == "right")
        self.assertEqual(left, right)
        self.assertTrue(left)

    def test_validation(self):
        with self.assertRaises(ValueError):
            livery.Decal("x", "roof", (0, 0), (1, 1), "text")

        with self.assertRaises(ValueError):
            livery.Decal("x", "left", (0, 0), (1, 1), "sparkles")

        with self.assertRaises(ValueError):
            livery.Decal("x", "left", (0, 0), (1, 1), "glass")

        with self.assertRaises(ValueError):
            livery.Decal("x", "left", (0, 0), (1, 1), "text", outline=((0, 0), (1, 0), (1, 1)))

    def test_side_window_outline_is_mirrored_on_the_right(self):
        outline = ((0.5, 1.0), (1.0, 1.2), (0.5, 1.2))
        left = livery.Decal("w", "left", (0.0, 0.0), (1, 1), "glass", outline=outline)
        right = livery.Decal("w", "right", (0.0, 0.0), (1, 1), "glass", outline=outline)

        self.assertEqual(left.local_outline(), [(0.5, 1.0), (1.0, 1.2), (0.5, 1.2)])
        self.assertEqual(right.local_outline(), [(-0.5, 1.0), (-1.0, 1.2), (-0.5, 1.2)])

    def test_outline_is_relative_to_center(self):
        decal = livery.Decal("w", "front", (0.5, 1.0), (1, 1), "glass", outline=((0.5, 1.0), (1.0, 1.5), (0.0, 1.5)))
        self.assertEqual(decal.local_outline(), [(0.0, 0.0), (0.5, 0.5), (-0.5, 0.5)])


class ArtworkTests(unittest.TestCase):
    def test_placeholder_when_file_is_missing(self):
        decal = livery.Decal("w", "left", (0, 0), (1, 1), "text", artwork="wordmark.png")

        with tempfile.TemporaryDirectory() as folder:
            self.assertIsNone(livery.artwork_path(folder, decal))

            path = os.path.join(folder, "wordmark.png")
            open(path, "wb").close()
            self.assertEqual(livery.artwork_path(folder, decal), path)

    def test_decal_without_artwork_name(self):
        decal = livery.Decal("w", "left", (0, 0), (1, 1), "text")
        self.assertIsNone(livery.artwork_path("/tmp", decal))


class PlacementTests(unittest.TestCase):
    bounds = (1.05, 2.35, 1.61)

    def place(self, surface, center=(0.3, 0.6)):
        return livery.place(livery.Decal("d", surface, center, (0.2, 0.2), "text"), *self.bounds)

    def test_left_side_projects_inwards_and_reads_front_to_back(self):
        placement = self.place("left")
        self.assertGreater(placement.origin[0], self.bounds[0])
        self.assertEqual(placement.origin[1:], (0.3, 0.6))
        self.assertEqual(placement.project_axis, (-1, 0, 0))
        self.assertEqual(placement.u_axis, (0, 1, 0))

    def test_right_side_reads_back_to_front(self):
        placement = self.place("right")
        self.assertLess(placement.origin[0], -self.bounds[0])
        self.assertEqual(placement.project_axis, (1, 0, 0))
        self.assertEqual(placement.u_axis, (0, -1, 0))

    def test_front_and_rear_mirror_u(self):
        front, rear = self.place("front"), self.place("rear")
        self.assertEqual(front.origin[0], 0.3)
        self.assertEqual(rear.origin[0], -0.3)
        self.assertLess(front.origin[1], -self.bounds[1])
        self.assertGreater(rear.origin[1], self.bounds[1])

    def test_bonnet_projects_down(self):
        placement = self.place("bonnet", (0.0, -1.6))
        self.assertGreater(placement.origin[2], self.bounds[2])
        self.assertEqual(placement.project_axis, (0, 0, -1))
        self.assertEqual(placement.v_axis, (0, 1, 0))


if __name__ == "__main__":
    unittest.main()
