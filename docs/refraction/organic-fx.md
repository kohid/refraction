# Organic FX and My Shapes (0.68.0)

Soft, hand-made looks for containers and images, from ideas in the owner's Framify plugin, written from scratch for
Refraction (`modules/organic-fx`). Everything is on the element's **Style** tab.

| Section | On | What it does |
| --- | --- | --- |
| Shape Mask | container, image | Cuts the element (or the picture) to a shape: 6 blobs, wavy top/bottom/left/right/all edges, arch, arch down, pill, circle, squircle, leaf, scallop, flower, soft star, tilted card, plus My Shapes. Fit: stretch or keep proportions. Optional zoom of the inside on hover. |
| Deco Blob | container, image | A shape behind (or over) the element: solid, outline, or solid with an offset outline in another shape; optional grain; size, offset, turn, opacity; motion float / breathe / turn / wobble. |
| Grain | container | Film grain: amount, size (fine, medium, coarse), pattern number (0 = each element its own), blend, optionally over the content. |
| Floating Shapes | container | Small shapes (circle, ring, triangle, square, plus, cross, squiggle, star, hexagon, half circle, blob, heart, My Shapes) drifting up, down, sideways, each its own way, or bobbing in place. Count (and a phone count), size, speed, turn, opacity, up to 4 colours, solid/outline/mixed, behind or over, whole area or side bands. |
| Floating Text | container | Words from a list appearing one at a time in free spots (never overlapping, never the same word twice at once), holding and leaving: fade, rise from behind a line, sharpen from a blur, letter by letter, typewriter, fade and drift. Count (and a phone count), hold, tilt, outlined letters, opacity, colours, typography, layer, area. |

## The Shape Mask and Deco Blob panel (0.69.0)

Modelled on Framify's Organic Shape panel, written for Refraction.

- **Mode** (containers, Shape Mask): *Clip whole container* (as before) or *Clip background only*: the script moves
  the container's background (every `background-*` longhand and the radius) onto `.rf-ofx-fill`, a first-child layer
  cut to the shape, and hides the container's own with `background: none !important` (its `style` attribute is
  restored exactly on teardown). Content, border and shadow stay whole. *Background Color* (`!important` on the fill,
  so it wins over the copied colour), *Overlay Color* / *Overlay Opacity* (`--rf-ov`, `--rf-ov-o`, painted by
  `.rf-ofx-fill::before`) are CSS only; Grain moves inside the fill so it is cut too. A lazy-loaded background is
  copied again once the container gets `e-lazyloaded`; in the editor a background or `rf_mask*` change copies it again.
  A shape behind the content is the Deco Blob.
- **Shape pickers**: a Built-in / Uploaded CHOOSE (`rf_mask_source`, `rf_blob_source`, shown as text tabs by a small
  editor stylesheet) over two VISUAL_CHOICE pickers with grey thumbnails: `rf_mask` / `rf_blob_shape` (built-in; the
  ids saved by 0.68.0, which may still hold a `my-` id and keep working) and `rf_mask_mine` / `rf_blob_mine`
  (My Shapes). Both mask pickers carry the `rf-mask--` prefix class; only the active one is applied. Click the chosen
  mask shape again for none.
- **Flat Edge** (mask: containers and images; blob: containers): the shape runs 30% past that side so the element's
  edge cuts it straight. The mask does it in its placement; the blob is put in `.rf-ofx-bclip` (the container's size,
  overflow hidden, prefix class `rf-blob-edge-*`).
- **Flips**: the mask's are drawn into its SVG by the script; the blob's are CSS (`--rf-blob-fx`, `--rf-blob-fy`).
- **Placement** (responsive): Horizontal / Vertical Position (written as 0 / 0.5 / 1 with `selectors_dictionary`),
  Width, Height, Offset X / Y. The blob's is plain CSS (Width = the old Size, Height empty = the width, offsets as
  before, so saved blobs sit where they did). The mask's numbers go into `--rf-mask-*` properties that the script turns
  into `mask-size` / `mask-position` in pixels (inline on the container, the fill or the picture), again on resize and,
  in the editor, after a setting changes. Without the script the mask falls back to its class, stretched.
- **Motion**: mask Trigger none / Continuous gentle loop / On hover / Once when scrolled into view, with Duration (ms):
  only the mask's size and position move (breathe and sway, grow and lift, grow in), paused out of view, none with
  reduced motion. Blob Trigger (Continuous loop / On hover / Once when scrolled into view, `rf-blob-trigger-*`) pauses
  or plays its CSS motion; "once" plays two alternate iterations after the script adds `rf-ofx-inview`.

## How it works

- **Masks are static CSS.** `classes/pure-organic.php` draws every built-in shape (seeded blobs, Catmull-Rom smoothing
  with the handles kept inside the 100 x 100 box). `php scripts/build-organic-shapes.php` writes them to
  `assets/scss/_shapes.scss` (one class per shape, `.rf-mask--{id}` / `.rf-shape--{id}` setting `--rf-shape`, a
  stretched SVG mask) and `assets/js/shapes-data.js`. Both files are generated: edit the PHP and run the script;
  `scripts/test-organic-fx.php` fails if they drift. The mask select uses `prefix_class`, so the editor shows it live
  and the site needs no script for it.
- **Layers are built by `assets/js/organic-fx.js`** from the element's settings (`data-settings` on the site, the
  element model in the editor; every layer setting is `frontend_available` with `render_type: template`, so the editor
  redraws on change). Layers are `aria-hidden`, `pointer-events: none`, and sit at `z-index: -1` inside an isolated
  host (or 5 when "over"). Randomness is seeded from the element id, so a page looks the same on every visit.
  Layers pause out of view, are placed again when the width changes, and with reduced motion the shapes stay still
  and the words stay put.

## My Shapes and grain textures (in the editor, 0.70.0)

There is no admin page: the library is managed from the editor (`assets/js/organic-fx-editor.js`, entry
`organic-fx-editor`, enqueued on `refraction/editor/after_enqueue_scripts` with `refractionOrganicEditor`).

- **Open it** from the Uploaded tab's "Upload or manage" button (BUTTON controls `rf_mask_mine_upload`,
  `rf_blob_mine_upload`, event `refraction:organicLibrary:<setting>`) or from Grain's "Upload or manage" textures
  button (`refraction:organicTextures`). The dialog has Shapes and Textures tabs.
- **Add**: choose or drag and drop one or several files anywhere on the dialog (a drop adds at once), or paste SVG
  code. Files are added one after another; each takes its file name (one file can take the Name field); files that
  fail are named in the message. The first new item is picked for the element (`rf_*_source = mine` + the id, or
  `rf_grain_texture`). Rename (shapes) and delete in the list; Use picks one.
- **Live**: after any change the dialog rewrites the options of `rf_mask_mine`, `rf_blob_mine`, `rf_blob_line_shape`,
  `rf_fs_shapes` and `rf_grain_texture` in every control config (element configs, widget cache and the elements on the
  page), redraws those controls in the open panel, and gives the preview the new mask CSS, `refractionMyShapes` and
  `refractionGrainTextures`, so nothing needs a reload.
- **Server** (`classes/editor-library.php`): `wp_ajax_refraction_ofx_{shape_add,shape_rename,shape_delete,
  texture_add,texture_delete}`, nonce `refraction_ofx_library`, capability `upload_files` (filter
  `refraction/organic-fx/capability`). Shapes: `Pure_Shape_Store` keeps only path data, a numeric viewBox and the fill
  rule (option `refraction_my_shapes`, max 100). Textures: the editor turns the picture into ink (alpha = darkness, at
  most 1024 px) and sends a PNG; `Textures_Repository` accepts only a PNG GD can open, writes it again with GD into
  `uploads/refraction-grain/<slug>.png` and lists it in `refraction_grain_textures` (max 40).

## Grain (0.70.0)

Grain On Container Fill, Texture (Film grain (classic) by default: the 0.68 grey noise unless a colour is set;
Speckle, Distressed chalk, Dry brush, Paper fibre, Halftone dots, Dispersion, Brush strokes, Grunge splatter,
Scratches; Uploaded: ...), Fade From (left, right, top, bottom, centre) with Fade Reach, Grain Colour, Grain Amount,
Grain Size (1-100, 50 = the classic size; a 0.68 Medium / Coarse is read from a hidden `rf_grain_size`), Pattern, Blend,
Also Over The Content. Built-in textures are seamless SVG tiles drawn by `textureUrl()` (noise whose alpha is
`a x noise + b`, painted in the colour; halftone is a dot pattern under a noise mask). An uploaded texture paints the
colour through the PNG as a repeating mask. Fade is a gradient mask; inside a Deco Blob the blob's shape is one more
mask layer, all intersected. The blob's grain uses the same texture, colour and size.

## Checks

- `php scripts/test-organic-fx.php`: generated files match, shapes stay in their box, upload cleaning (scripts,
  handlers, bad characters, primitives, viewBox fallbacks, evenodd), stored-shape cleaning, CSS, ids.
- `node scripts/check-organic-fx.mjs --site DIR --port N`: My Shapes upload/paste/refuse/rename/delete, masks (built-in
  and uploaded), blob, grain, floating shapes and words on desktop, phone counts with reduced motion, and the editor
  preview redrawing with an uploaded floating shape.
