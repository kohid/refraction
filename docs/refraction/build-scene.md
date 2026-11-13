# 3D Build Scene and Scroll Sequence

A widget (Advanced category, `build-scene`, module `modules/build-scene`) that shows a 3D model whose parts fly in stage by stage while the visitor scrolls through the section. Added in 0.17.0. Works on any site: a house being built, a product being assembled, an engine coming together.

Tests: `php scripts/test-build-scene.php` (.glb check), `node scripts/test-build-scene.mjs` (timeline), browser check `node scripts/check-build-scene.mjs --site DIR --port N` (uploads, editor panel and preview slider, the sample house and an uploaded model building with the scroll, captions, reduced motion, phones, no WebGL; it saves screenshots and a scroll recording to `--shots`).

## How it works

- **Model**: the built-in **sample house** (made in code from simple shapes, `assets/js/sample-house.js`, nothing to download) or an uploaded **.glb**. Every mesh of the model is one part. Uploading `.glb` is allowed for users who can upload files, and only when the file starts like a glTF 2 binary (`Classes\Glb_File`, the same approach as Lottie `.json`). The script only loads `.glb`/`.gltf` URLs from the media library. Compressed (Draco / Meshopt) models are not supported yet: export without compression.
- **Stages** (repeater: title, text, parts): a part joins the first stage one of whose name patterns (`roof*, chimney`, comma separated, `*` matches anything, case does not matter) matches its own name or a parent's name; parts that match no stage join the last one. With no stages, or when no part matches any stage, every part is its own step. Inside a stage the parts come **bottom to top**, **by name** (numbers in order) or **as in the file**.
- **Timeline** (`assets/js/timeline.js`, pure and tested): the stages share the scroll equally, then **Pause on the finished model** (% of the scroll) keeps the finished model on screen. In a stage, **Overlap** 0 brings the parts one after another, 100 all together. A part moves from its start offset (**from above**, **from the sides** or **from all around**, at **Distance** x the model size) to its place and fades in; **Movement** is the easing.
- **Scroll**: the section is **Scroll length** screens tall (responsive) and the scene is pinned (`position: sticky`) inside it, so the model builds while the page seems to stand still, then the page moves on. Scrolling up takes it apart again. Progress follows the scroll with a little smoothing and jumps on the first drawing.
- **Camera and light**: framed automatically from the model's size; the camera turns from **Angle at the start** to **Angle at the end** while it builds, at **Height of the view**, with **Zoom**. **Drag to turn** lets visitors turn the finished model sideways (vertical swipes still scroll). Light presets daylight, studio and dusk, with a neutral room reflection (`RoomEnvironment`, generated in the browser) and optional soft **Shadows** on an invisible ground.
- **Captions and progress** (Style tab): the caption of the stage being built shows on the left, right or bottom (always at the bottom on phones, with the model lifted above it); the progress line marks the stages done. Colors, typography, width, padding and radius are editable.
- **Visitor controls** (0.21.0, section of the same name): buttons on the scene for visitors. **Build** follows the scroll; **Parts** shows the finished model spread out (each part moves straight out from the middle of the model, **Parts view spread** x its distance); **Aerial** looks at it from above (72°). In Parts and Aerial visitors drag to turn the model sideways and up and down (on touch screens sideways only, so vertical swipes still scroll the page), and the build captions step aside. **Auto-rotate** turns the model slowly (**Rotate on its own** starts it once the model is built; **Rotation speed**); **Day** and **Dusk** switch the light live. Each button can be turned off, the buttons can sit in any corner, and their colors, typography and radius are in the Style tab.
- **Fill stages from the model** (0.23.0, Build section, for an uploaded .glb): reads only the file's outline (`assets/js/glb-outline.js`: the JSON chunk with nodes, meshes, materials and bounds, not the geometry) and replaces the Stages with one stage per named top-level group (looking inside a single wrapper group), or, when the parts have repeated generic names (`Box_06 - Default`), one per material. Stages are ordered bottom to top and titled from the names (`Box_06 - Default` -> `Box`, `GlassCurtainWall` -> `Glass curtain wall`); it asks before replacing existing stages and is one Undo step. Stage patterns also match material names.
- **Clickable stage names** (0.23.0): the names under the progress line are buttons. In Build a name scrolls the page smoothly to where that stage is finished; in Parts and Aerial it picks that stage out (its parts stay, the others are ghosted without shadows) and shows its caption; again to clear.
- **Scene width and alignment** (Style > Scene, responsive), and the **stage names** under the progress line have their own color (also for built and current stages), typography, and an option not to dim the stages not built yet (Style > Progress).
- **Editor**: **Preview in the editor** (Scroll section) holds the build at a point, so you can check any stage without scrolling. The editor redraws the widget after each change and the old scene frees its WebGL context.

## Parts, each like a widget (0.85.0)

Content > **Parts** (`parts` repeater, up to 100): a row names a part by **Part** (`part_match`: names or patterns,
comma separated; a parent's or material's name counts, like the stage patterns; the first matching row wins,
`partOverride()` in `timeline.js`) and has four tabs:

- **Content**: Hide this part; **Label on the part** (a tag that follows the part once it is in place, projected on the
  canvas each frame, `.rf3d-label`); **Link** (clicking the part or its label opens it; a hand shows over it).
- **Look**: Color, Opacity, Metal, Roughness, Glow (emissive), applied to the part's own cloned materials.
- **Place**: Move left/right, down/up, back/front (% of the model's size), Tilt forward/back, Turn, Tilt sideways
  (degrees), Size (%). Applied before the part is measured, so the build and the Parts view use the new place.
- **Build**: **Comes** from above, below, the side, further out (1.6x the distance) or fades in place; **Later by** (% of
  the build).

In the editor's preview a part under the pointer lights up (blue) with its name as a tooltip; a click selects the widget,
finds the row naming that part (or adds one with its name) and opens it (`refractionBuildScenePick` in `editor.js`,
called from `scene.js`); the clicked part stays lit (purple). **Add every part of the model** (button) adds a row per
part not named yet, read from the scene in the preview, as one undo step. PHP clamps every value (`parts_config()`).

Check: `node scripts/check-build-scene-parts.mjs --site DIR --port N`.

## Animations other than building (0.29.0)

Content > **Animation** picks what the scroll does to the model (`assets/js/scene.js`, `moveModel()`); the stages still give the captions and the progress line, and the Build-only options (order, direction, distance, overlap, movement) hide for the others:

- **Build in stages**: the parts fly in (as before).
- **Turntable**: the whole model turns **Turns over the scroll** times (0.25 to 3) while the visitor scrolls.
- **Drive in** (cars): the model rolls in along its long side during the first 60 % of the scroll, from **one side or the other**, and stands while the view turns around it. Parts named like **Wheel parts** (`*wheel*, *tire*, *tyre*` by default) spin around their thinnest side, by the distance travelled over their radius.
- **Play the model's own animation** (characters): a clip from the .glb (`AnimationMixer`), by **Animation name** (exact, then contained, case-insensitive; empty: the first clip), **on its own in a loop** at a **Speed**, or **with the scroll** (the scroll sets the time).
- **Float**: the model hovers up and down and turns slowly.

Visitor controls gain **Grab to rotate** (drag at any point of the scroll, also up and down with a mouse, and the turn eases out after letting go; touch drags turn sideways only, so pages still scroll) and **Follow the cursor**: the model turns toward the pointer, or, for characters, the head does (the first part or bone named like a head; without one the whole model turns), by **How far it turns**. Reduced motion: no float, no looping clip, no follow, no easing-out turn.

0.30.0: for the other animations the stage captions and progress line show only with **Show the stages on the site** (off by default), and the first view button is named after the animation (Drive, Turntable, Animation, Float). **Detect wheels and animations** (button, and by itself when a model or the Drive / own-animation option is chosen; `detectMotion()` in `glb-outline.js` reads only the file's outline) fills **Wheel parts** (nodes and meshes named like a wheel, tyre or rim, not a steering wheel, spare or wheel arch; the general patterns when the names say wheel or tyre) and **Animation name** (the first clip), and reports the animations in the model; the automatic run only fills empty or default fields. **Animation buttons** (Visitor controls, own animation): one button per animation in the model, which cross-fades to it.

Test models: `scripts/fixtures/make-figures.mjs` (a car with four wheels, a character with a head and the clips Wave and Idle). Check: `node scripts/check-slides-video-3d.mjs --site DIR --port N`.

## Performance and accessibility

- three.js (0.187, MIT) is bundled into `build-scene-frontend.js` (about 700 KB minified, 180 KB gzipped). It is loaded only on pages that use the widget, and the model is loaded only when the section comes within a screen of the viewport; drawing happens only when something changed and while the scene is near the screen.
- Phones draw at a lower pixel ratio and smaller shadow maps; **Show the still image on phones instead** skips 3D there entirely.
- **Reduced motion**: the finished model shows and the section is not stretched. **No WebGL**: the still image shows, or a short message.
- The canvas has `role="img"` and the screen reader description from the Model section; the captions are real text.

## Scroll Sequence (0.18.0)

A second widget in the same module (`scroll-sequence`, Advanced category) for cinematic, photo-real scenes that a browser can not draw live: a pre-rendered camera move through a room, a product turning, a drone shot. It plays a **video** or a numbered **image sequence** with the scroll, forward and backward, while the section is pinned (the same track and pin as the 3D Build Scene).

- **Image sequence** (smoothest): select the frames in a gallery; they play **by file name** (natural order, `frame-2` before `frame-10`) or as selected, at the chosen size. Frames are drawn on a canvas (cover or contain) and loaded progressively: first and last, then every 16th, 8th, 4th... frame, so a rough version plays at once and the nearest loaded frame is shown until the exact one arrives (`loadOrder`, `frameAt`, `fitRect` in `assets/js/sequence.js`, tested). Up to 600 frames.
- **Video**: MP4 or WebM without sound. The script downloads it once and plays it from memory, so seeking is instant and works where the server does not answer range requests; if that download fails it uses the address directly. Export with a keyframe on every frame (`ffmpeg -g 1`) for smooth scrubbing.
- **Text over the sequence** (repeater): title, text, where it shows (from % to % of the scroll) and where it sits (left, center, right, bottom). While a text shows, a shade darkens its side of the picture (**Shade behind the text**, Style tab) so it stays readable. Titles default to a large light display size; typography, colors and width are editable.
- **Scroll**: scroll length, a pause on the last frame, an optional progress line, and the editor **Preview** slider.
- **Reduced motion** (and **Show the still image on phones instead**): the still image (or the first frame) and every text one after another, without the long scroll.
- It has its own small script (`scroll-sequence-frontend.js`, about 10 KB); pages with only a Scroll Sequence do not load three.js.
- Footage: a 3D artist's render, a real camera walkthrough exported as frames, or (planned) Seedance video through Claude.
- Browser check: `node scripts/check-scroll-sequence.mjs --site DIR --port N` (needs ffmpeg; frames imported in reverse order still play by name, overlays, video seeking, reduced motion, editor preview).

### Gallery mode (0.23.0)

**Play: Image gallery (zoom and turn)** uses the same images, one after another instead of as frames: each image zooms in or out (**Each image**: zooms in, zooms out, or alternating) by **Zoom** and turns by **Turn** degrees (one way, the next the other way) while it shows, and the next image fades in on top over **Overlap** of its share, already moving (`galleryLayers` in `assets/js/sequence.js`, tested). A turned image is grown just enough to keep the scene covered. Smoothing follows the scroll at the same speed on slow and fast screens.

## Not yet

- The Ask Claude panel (building pages from a prompt) and Seedance video are the next parts of this work (see the roadmap).
- Draco / Meshopt compressed models.
