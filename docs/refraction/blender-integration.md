# Blender integration

Two halves that work together:

| Part | Where | Ships in the plugin build |
|------|-------|---------------------------|
| **3D Model** widget, glTF uploads, publish endpoint | `modules/blender/` | Yes |
| `<model-viewer>` 4.4.0 (Apache-2.0) and the Draco glTF decoder (Apache-2.0, from three.js r172) | `assets/lib/model-viewer/`, `assets/lib/draco/` | Yes |
| Blender add-on "Refraction Publisher" | `integrations/blender/` | No (excluded in `scripts/vite`) |

## Plugin side

- **Uploads.** `.glb` (`model/gltf-binary`) and `.gltf` (`model/gltf+json`) are allowed in the media
  library. The content is checked, not just the extension: a GLB needs a valid glTF 2.0 header whose
  length matches the file; a `.gltf` must be JSON with `asset.version` 2.x (max 32 MB).
- **Widget** (`model-3d`, Basic category). Model from the media library, alt text, poster, lazy
  loading, orbit/zoom, auto-rotate, initial camera orbit, AR (WebXR / Scene Viewer), animation
  autoplay, height, background, tone mapping (AgX default, like Blender), exposure, shadows,
  border. The rendered URL comes from the attachment ID, so a model re-published from Blender
  shows up without editing the page. Without a poster set in the widget, the poster published
  from Blender is used.
- **Offline.** The viewer and the Draco decoder load from the plugin. Nothing is fetched from a CDN
  unless a model uses KTX2 textures or meshopt compression, which Blender's exporter does not produce.
- **REST.** `refraction/v1/blender` (status) and `refraction/v1/blender/models` (publish/replace),
  both requiring `upload_files`; replacing also requires `edit_post` on that attachment. Details in
  [integrations/blender/README.md](../../integrations/blender/README.md).

## Tests

```bash
tests/phpunit/run-unit.sh tests/phpunit/elementor/modules/blender/test-gltf-files.php
vendor/bin/phpunit --filter 'Test_Publish_Controller|Test_Model_3D|Test_Gltf_Files'
python3 -m unittest discover -s integrations/blender/tests
```
