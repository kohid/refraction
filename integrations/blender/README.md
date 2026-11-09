# Refraction Publisher (Blender add-on)

Publishes the current Blender scene to a Refraction site as a glTF binary (`.glb`), ready for the
**3D Model** widget. Re-publishing updates the same media item, so pages that use it show the new
version without being edited.

Works with Blender 3.6 LTS and newer (tested with 5.2), as a legacy add-on or a 4.2+ extension.

## Install

```bash
python3 integrations/blender/package.py
```

This writes `integrations/blender/dist/refraction_publisher-1.0.0.zip`. In Blender:

- **4.2 and newer:** Edit > Preferences > Get Extensions > ⌄ menu > Install from Disk, then pick the zip.
  Also allow **Online Access** (Preferences > System > Network), or the add-on cannot upload.
- **3.6 to 4.1:** Edit > Preferences > Add-ons > Install, pick the zip, then enable "Refraction Publisher".

## Connect a site

1. In WordPress, open **Users > Profile > Application Passwords**, name it "Blender" and create it.
   The user needs permission to upload files (Author or higher).
2. In the add-on preferences, fill in the site URL, the WordPress username and the application
   password, then click **Check Connection**.

The site must use `https://`. Plain `http://` is accepted only for local sites (`localhost`,
`127.0.0.1`, `*.local`, `*.test`), because WordPress itself refuses application passwords over
plain http elsewhere. The password is stored in your Blender user preferences.

## Publish

Open the 3D Viewport sidebar (`N`) > **Refraction** tab:

| Option | What it does |
|--------|--------------|
| Title | Media library title. Empty uses the scene name. |
| Selected Objects Only | Export only the selection. |
| Apply Modifiers | Bake modifiers into the exported meshes. |
| Animations | Export actions. Turn on **Autoplay** in the widget to play them; **Animation Name** picks one. |
| Draco Compression | Smaller files. The plugin bundles the Draco decoder, so visitors' browsers never contact Google. |
| Viewport Poster | Renders the viewport and uploads it as the image shown while the model loads. |

**Publish New Model** uploads it and remembers the media ID in the `.blend` file. After that the
button reads **Publish Update** and replaces that item's file and poster. The **+** button forgets
the ID so the next publish creates a separate item. If the item was deleted on the site, the
add-on creates a new one and tells you.

Then in the page editor, add the **3D Model** widget and choose the model from the media library.

## How it talks to the site

`POST /?rest_route=/refraction/v1/blender/models` (multipart) with fields:

| Field | |
|-------|-|
| `model` | The `.glb` / `.gltf` file. Required. The plugin checks the glTF header, not just the extension. |
| `poster` | PNG, JPEG or WebP. Optional. Replaces the previous poster. |
| `title` | Media title. |
| `source` | `.blend` file name, saved as attachment meta. |
| `attachment_id` | Existing model to replace. Omit to create one. |

`GET /?rest_route=/refraction/v1/blender` checks the connection. Both need the `upload_files`
capability. The `?rest_route=` form works whether or not the site uses pretty permalinks.

## Tests

```bash
python3 -m unittest discover -s integrations/blender/tests
```

These cover the HTTP client, which has no `bpy` dependency. The `ui.py` operators need Blender.
