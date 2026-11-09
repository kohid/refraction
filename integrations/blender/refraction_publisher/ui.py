import os
import re
import shutil
import tempfile
import threading

import bpy
from bpy.props import BoolProperty, IntProperty, PointerProperty, StringProperty
from bpy.types import AddonPreferences, Operator, Panel, PropertyGroup

from . import client

ADDON_ID = __package__


def get_preferences(context):
    return context.preferences.addons[ADDON_ID].preferences


def get_connection(context):
    prefs = get_preferences(context)
    return client.Connection(prefs.site_url, prefs.username, prefs.app_password)


def online_access_error():
    # Blender 4.2+ lets people turn off all network access for add-ons.
    if getattr(bpy.app, "online_access", True):
        return None

    return "Online access is turned off. Allow it in Preferences > System > Network."


def slugify(name):
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-.")
    return slug or "model"


class RefractionPreferences(AddonPreferences):
    bl_idname = ADDON_ID

    site_url: StringProperty(
        name="Site URL",
        description="Address of the WordPress site running Refraction, e.g. https://example.com",
    )
    username: StringProperty(
        name="Username",
        description="WordPress user that publishes the models (needs permission to upload files)",
    )
    app_password: StringProperty(
        name="Application Password",
        description="Create one in WordPress under Users > Profile > Application Passwords",
        subtype="PASSWORD",
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "site_url")
        layout.prop(self, "username")
        layout.prop(self, "app_password")
        layout.label(text="Create the password in WordPress: Users > Profile > Application Passwords.", icon="INFO")
        layout.label(text="It is stored in your Blender preferences, so treat that file as private.", icon="LOCKED")
        layout.operator(REFRACTION_OT_check_connection.bl_idname, icon="URL")


class RefractionPublishSettings(PropertyGroup):
    title: StringProperty(
        name="Title",
        description="Media library title. Leave empty to use the scene name",
    )
    selection_only: BoolProperty(
        name="Selected Objects Only",
        description="Export only the selected objects instead of the whole scene",
        default=False,
    )
    apply_modifiers: BoolProperty(
        name="Apply Modifiers",
        description="Export meshes with their modifiers applied",
        default=True,
    )
    export_animations: BoolProperty(
        name="Animations",
        description="Include actions so the 3D Model widget can play them",
        default=True,
    )
    use_draco: BoolProperty(
        name="Draco Compression",
        description="Smaller files. Refraction ships the Draco decoder, so nothing is loaded from Google",
        default=False,
    )
    render_poster: BoolProperty(
        name="Viewport Poster",
        description="Render the current viewport and upload it as the image shown while the model loads",
        default=True,
    )
    attachment_id: IntProperty(
        name="Media ID",
        description="Media library item this scene publishes to. 0 publishes a new item",
        min=0,
    )
    model_url: StringProperty(name="Model URL")
    poster_url: StringProperty(name="Poster URL")


def find_view3d(context):
    if context.area and context.area.type == "VIEW_3D":
        return context.window, context.area

    for window in context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                return window, area

    return None, None


def render_viewport_poster(context, path):
    window, area = find_view3d(context)

    if area is None:
        raise RuntimeError("Open a 3D Viewport to render the poster, or turn off Viewport Poster.")

    scene = context.scene
    settings = scene.render.image_settings
    previous = (settings.file_format, settings.color_mode)

    try:
        region = next(region for region in area.regions if region.type == "WINDOW")

        with context.temp_override(window=window, area=area, region=region):
            bpy.ops.render.opengl(write_still=False, view_context=True)

        settings.file_format = "PNG"
        settings.color_mode = "RGB"
        bpy.data.images["Render Result"].save_render(path, scene=scene)
    finally:
        settings.file_format, settings.color_mode = previous


def export_glb(path, settings):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=settings.selection_only,
        export_apply=settings.apply_modifiers,
        export_animations=settings.export_animations,
        export_draco_mesh_compression_enable=settings.use_draco,
    )


class REFRACTION_OT_check_connection(Operator):
    bl_idname = "refraction.check_connection"
    bl_label = "Check Connection"
    bl_description = "Log in to the Refraction site and check that it can receive models"

    def execute(self, context):
        error = online_access_error()

        if error:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        try:
            status = client.check_connection(get_connection(context))
        except client.PublishError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}

        self.report({"INFO"}, f"Connected to {status.get('site', 'the site')} as {status.get('user', '?')}.")
        return {"FINISHED"}


class REFRACTION_OT_publish(Operator):
    bl_idname = "refraction.publish"
    bl_label = "Publish to Refraction"
    bl_description = "Export the scene as .glb and upload it to the Refraction media library"

    _timer = None
    _thread = None
    _result = None
    _tempdir = None

    @classmethod
    def poll(cls, context):
        return context.scene is not None

    def execute(self, context):
        error = online_access_error()

        if error:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        scene = context.scene
        settings = scene.refraction_publish

        if settings.selection_only and not context.selected_objects:
            self.report({"ERROR"}, "Nothing is selected. Select objects or turn off Selected Objects Only.")
            return {"CANCELLED"}

        try:
            connection = get_connection(context)
            client.api_url(connection.site_url)
            client.auth_header(connection.username, connection.app_password)
        except client.PublishError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}

        title = settings.title.strip() or scene.name
        self._tempdir = tempfile.mkdtemp(prefix="refraction-")
        model_path = os.path.join(self._tempdir, slugify(title) + ".glb")
        poster_path = None

        try:
            export_glb(model_path, settings)

            if settings.render_poster:
                poster_path = os.path.join(self._tempdir, slugify(title) + "-poster.png")
                render_viewport_poster(context, poster_path)
        except Exception as error:  # Export and render operators raise plain RuntimeError.
            self._cleanup(context)
            self.report({"ERROR"}, f"Export failed: {error}")
            return {"CANCELLED"}

        job = {
            "connection": connection,
            "model_path": model_path,
            "poster_path": poster_path,
            "title": title,
            "source": os.path.basename(bpy.data.filepath),
            "attachment_id": settings.attachment_id,
        }
        self._result = {}
        self._thread = threading.Thread(target=self._upload, args=(job, self._result), daemon=True)
        self._thread.start()

        wm = context.window_manager
        self._timer = wm.event_timer_add(0.25, window=context.window)
        wm.modal_handler_add(self)
        wm.progress_begin(0, 1)
        self.report({"INFO"}, f"Uploading {os.path.basename(model_path)}...")

        return {"RUNNING_MODAL"}

    @staticmethod
    def _upload(job, result):
        """Runs on a worker thread: no bpy access here."""
        try:
            try:
                result["data"] = client.publish(**job)
            except client.PublishError as error:
                if error.code != "refraction_blender_unknown_model" or not job["attachment_id"]:
                    raise

                # The media item was deleted on the site: publish a new one instead.
                result["replaced_missing"] = True
                result["data"] = client.publish(**{**job, "attachment_id": 0})
        except client.PublishError as error:
            result["error"] = str(error)
        except OSError as error:
            result["error"] = f"Could not read the exported file: {error}"

    def modal(self, context, event):
        if event.type != "TIMER" or self._thread.is_alive():
            return {"PASS_THROUGH"}

        self._cleanup(context)

        if "error" in self._result:
            self.report({"ERROR"}, self._result["error"])
            return {"CANCELLED"}

        data = self._result["data"]
        settings = context.scene.refraction_publish
        settings.attachment_id = int(data.get("id") or 0)
        settings.model_url = data.get("url") or ""
        settings.poster_url = (data.get("poster") or {}).get("url") or ""

        if self._result.get("replaced_missing"):
            self.report({"WARNING"}, "The previous media item was gone, so a new one was created.")

        self.report({"INFO"}, f"Published \"{data.get('title', '')}\" (media ID {settings.attachment_id}).")

        for area in context.screen.areas:
            area.tag_redraw()

        return {"FINISHED"}

    def cancel(self, context):
        self._cleanup(context)

    def _cleanup(self, context):
        if self._timer is not None:
            context.window_manager.event_timer_remove(self._timer)
            context.window_manager.progress_end()
            self._timer = None

        if self._tempdir:
            shutil.rmtree(self._tempdir, ignore_errors=True)
            self._tempdir = None


class REFRACTION_OT_forget_model(Operator):
    bl_idname = "refraction.forget_model"
    bl_label = "Publish as New Model"
    bl_description = "Stop updating the current media item. The next publish creates a new one"

    def execute(self, context):
        settings = context.scene.refraction_publish
        settings.attachment_id = 0
        settings.model_url = ""
        settings.poster_url = ""
        return {"FINISHED"}


class REFRACTION_OT_copy_url(Operator):
    bl_idname = "refraction.copy_url"
    bl_label = "Copy Model URL"
    bl_description = "Copy the published model's URL to the clipboard"

    def execute(self, context):
        context.window_manager.clipboard = context.scene.refraction_publish.model_url
        self.report({"INFO"}, "Model URL copied.")
        return {"FINISHED"}


class REFRACTION_PT_publish(Panel):
    bl_idname = "REFRACTION_PT_publish"
    bl_label = "Publish"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Refraction"

    def draw(self, context):
        layout = self.layout
        prefs = get_preferences(context)
        settings = context.scene.refraction_publish

        if not (prefs.site_url and prefs.username and prefs.app_password):
            layout.label(text="Connect a site first.", icon="ERROR")
            layout.operator("preferences.addon_show", text="Open Add-on Preferences", icon="PREFERENCES").module = ADDON_ID
            return

        layout.label(text=prefs.site_url, icon="WORLD")

        column = layout.column(align=True)
        column.prop(settings, "title")
        column.prop(settings, "selection_only")
        column.prop(settings, "apply_modifiers")
        column.prop(settings, "export_animations")
        column.prop(settings, "use_draco")
        column.prop(settings, "render_poster")

        if settings.attachment_id:
            box = layout.box()
            box.label(text=f"Updates media ID {settings.attachment_id}", icon="FILE_REFRESH")
            row = box.row(align=True)
            row.operator(REFRACTION_OT_copy_url.bl_idname, icon="COPYDOWN")
            row.operator(REFRACTION_OT_forget_model.bl_idname, text="", icon="ADD")
            label = "Publish Update"
        else:
            label = "Publish New Model"

        layout.operator(REFRACTION_OT_publish.bl_idname, text=label, icon="EXPORT")


classes = (
    RefractionPreferences,
    RefractionPublishSettings,
    REFRACTION_OT_check_connection,
    REFRACTION_OT_publish,
    REFRACTION_OT_forget_model,
    REFRACTION_OT_copy_url,
    REFRACTION_PT_publish,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)

    bpy.types.Scene.refraction_publish = PointerProperty(type=RefractionPublishSettings)


def unregister():
    del bpy.types.Scene.refraction_publish

    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
