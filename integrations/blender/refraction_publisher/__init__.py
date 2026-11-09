"""Refraction Publisher: publish Blender scenes to a Refraction (WordPress) site as glTF.

Legacy add-on metadata lives in ``bl_info``; Blender 4.2+ extensions read ``blender_manifest.toml``.
"""

bl_info = {
    "name": "Refraction Publisher",
    "author": "Refraction contributors",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "3D Viewport > Sidebar > Refraction",
    "description": "Export the scene as .glb and publish it to a Refraction site for the 3D Model widget",
    "category": "Import-Export",
}

if "ui" in locals():
    import importlib

    importlib.reload(client)  # noqa: F821
    importlib.reload(ui)  # noqa: F821
else:
    from . import client, ui


def register():
    ui.register()


def unregister():
    ui.unregister()
