# Image uploads: WebP, maximum dimension, alt text (0.58.0)

Module `modules/image-optimizer` (always on). Settings are in **Refraction > Settings > Images**, and every option is on from install:

- **Convert to WebP**: JPG, PNG, BMP and still GIF uploads are saved as WebP. Animated GIFs (looping, or more than one frame) and SVGs stay as they are.
- **Maximum dimension (px)**, 1600 by default. It auto-detects orientation: landscape and square images resize by width, portrait images by height. Images smaller than the value stay the same size. 0 keeps every size.
- **Image quality (%)**, 80 by default.
- **Alt text from the file name**: an image uploaded without alt text gets its file name, so `inverness-airport-van.jpg` becomes "Inverness airport van". WordPress's `-scaled` and size suffixes, dashes and underscores are removed, and the first letter is capitalised. It reads the attachment title, which WordPress takes from the uploaded file name (or from the photo's own title when it carries one).

## How it works

- Filter `wp_handle_upload` (uploads and sideloads). That covers the Media Library, the editor's Insert Media window, drag and drop, the block editor, images added from a URL, `wp media import`, and the MCP `upload_media` tool.
- WordPress's image editor (GD or Imagick):
  1. `maybe_exif_rotate()` turns phone photos upright first; the orientation tag would be lost in the WebP.
  2. Measure, and `resize()` to `Pure_Image_Plan::target_size()`.
  3. `set_quality()` and save as `.webp` with a unique name. The original file is deleted, and the upload's file, URL and type are replaced.
- Palette images (GIF, 8-bit PNG) are first copied to full colour (GD can't write those as WebP), keeping transparency.
- A saved file that is empty or unreadable is dropped, and the upload stays as it was. So does anything the editor can't open.
- `big_image_size_threshold` is off: the size limit is this module's, so WordPress doesn't add its own 2560px `-scaled` copy.
- If the server can't write WebP, the settings tab shows a notice. Images are then still resized and kept in their own format.
- `add_attachment` sets the alt text (`_wp_attachment_image_alt`) when it's empty.
- Images already in the library are not changed.

## Tests

- `php scripts/test-image-optimizer.php`: target sizes, setting clamps, alt text, animated and palette detection.
- `node scripts/check-image-optimizer.mjs --site DIR --port N`: real uploads in the browser (a big landscape JPG, a tall transparent PNG, a small JPG, a sideways phone photo, an animated GIF, an 8-bit PNG, a still GIF), a sideload, the settings tab and its saving, and everything switched off.
