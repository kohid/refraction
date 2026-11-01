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
- **Editor**: **Preview in the editor** (Scroll section) holds the build at a point, so you can check any stage without scrolling. The editor redraws the widget after each change and the old scene frees its WebGL context.

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

## Not yet

- The Ask Claude panel (building pages from a prompt) and Seedance video are the next parts of this work (see the roadmap).
- Draco / Meshopt compressed models; per-part settings (direction, delay) beyond the stage patterns.
